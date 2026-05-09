#!/usr/bin/env bun
import { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { runLogin } from "./commands/login.js";
import { runLogout } from "./commands/logout.js";
import { runWhoami } from "./commands/whoami.js";
import { runGoodsList, runGoodsGet } from "./commands/goods.js";
import { runOrdersList, runOrdersGet } from "./commands/orders.js";
import { runPaymentsGet } from "./commands/payments.js";
import { runImportCleanup } from "./commands/product/import-cleanup.js";
import { runImportFromBase } from "./commands/product/import-from-base.js";
import { runSkillsInstall } from "./commands/skills.js";
import { registerVersion } from "./commands/version.js";
import { registerConfig } from "./commands/config.js";
import { loadCredentials, isExpired } from "./core/credentials.js";
import { loadConfig } from "./core/config.js";
import { CliError, EXIT_CODES, formatErrorOutput } from "./core/errors.js";

const credentialsPath = join(homedir(), ".yaolai/credentials.json");
const configPath = join(homedir(), ".yaolai/config.json");
const skillsDir = join(homedir(), ".claude/skills");

const program = new Command();
program
  .name("yaolai")
  .description("耀莱商城运营 CLI")
  .version("0.1.0")
  .option("--json", "输出 JSON（错误也走 JSON 信封）")
  .option("--verbose", "展开 trace_id / 请求 id")
  .option("--endpoint <url>", "临时覆盖 endpoint");

function resolveEndpoint(globalOpts: { endpoint?: string }): string {
  if (globalOpts.endpoint) return globalOpts.endpoint;
  return loadConfig(configPath).endpoint;
}

function requireToken(): { endpoint: string; token: string } {
  const c = loadCredentials(credentialsPath);
  if (!c) {
    throw new CliError(
      "NOT_LOGGED_IN",
      "not logged in, run `yaolai login`",
      EXIT_CODES.AUTH_EXPIRED,
    );
  }
  if (isExpired(c)) {
    throw new CliError(
      "AUTH_TOKEN_EXPIRED",
      "Token expired, run `yaolai login` again",
      EXIT_CODES.AUTH_EXPIRED,
    );
  }
  const override = program.opts().endpoint;
  return { endpoint: override ?? c.endpoint, token: c.token };
}

registerVersion(program);
registerConfig(program, configPath);

// login
program
  .command("login")
  .description("登录耀莱 admin")
  .option("--username <u>", "用户名（省略时交互输入）")
  .option("--password-stdin", "从 stdin 读密码")
  .action(async (opts) => {
    const passwordSource = opts.passwordStdin
      ? ({ kind: "stdin" } as const)
      : process.env.YAOLAI_PASSWORD
        ? ({ kind: "env" as const, value: process.env.YAOLAI_PASSWORD })
        : ({ kind: "prompt" } as const);
    const endpoint = resolveEndpoint(program.opts());
    if (!endpoint) {
      throw new CliError(
        "NO_ENDPOINT",
        "set endpoint first: yaolai config set endpoint <url>",
        EXIT_CODES.INVALID_ARG,
      );
    }
    await runLogin({
      endpoint,
      username: opts.username,
      passwordSource,
      credentialsPath,
      configPath,
    });
    console.log("Logged in.");
  });

// logout / whoami
program.command("logout").description("清除本地 credentials").action(() => runLogout(credentialsPath));
program.command("whoami").description("显示当前登录身份").action(() => console.log(runWhoami(credentialsPath)));

// goods
const goods = program.command("goods").description("商品查询");
goods
  .command("list")
  .description("列商品")
  .option("--status <s>", "ON_SHELF / OFF_SHELF / DRAFT")
  .option("--page <n>", "页码", "1")
  .option("--size <n>", "每页", "20")
  .action(async (opts) => {
    const { endpoint, token } = requireToken();
    console.log(
      await runGoodsList({
        endpoint,
        token,
        json: !!program.opts().json,
        status: opts.status,
        page: Number(opts.page),
        size: Number(opts.size),
      }),
    );
  });
goods
  .command("get <id>")
  .description("商品详情")
  .action(async (id: string) => {
    const { endpoint, token } = requireToken();
    console.log(
      await runGoodsGet({
        endpoint,
        token,
        id,
        json: !!program.opts().json,
      }),
    );
  });

// orders
const orders = program.command("orders").description("订单查询");
orders
  .command("list")
  .description("列订单")
  .option("--status <s>", "OrderStatus 枚举")
  .option("--member-id <id>", "会员 ID")
  .option("--from <iso>", "起始时间 ISO 8601")
  .option("--to <iso>", "截止时间 ISO 8601（不含）")
  .option("--page <n>", "页码", "1")
  .option("--size <n>", "每页", "20")
  .action(async (opts) => {
    const { endpoint, token } = requireToken();
    console.log(
      await runOrdersList({
        endpoint,
        token,
        json: !!program.opts().json,
        status: opts.status,
        memberId: opts.memberId,
        from: opts.from,
        to: opts.to,
        page: Number(opts.page),
        size: Number(opts.size),
      }),
    );
  });
orders
  .command("get <id>")
  .description("订单详情")
  .action(async (id: string) => {
    const { endpoint, token } = requireToken();
    console.log(
      await runOrdersGet({
        endpoint,
        token,
        id,
        json: !!program.opts().json,
      }),
    );
  });

// payments
const payments = program.command("payments").description("支付查询");
payments
  .command("get <intent-id>")
  .description("支付意图详情")
  .action(async (intentId: string) => {
    const { endpoint, token } = requireToken();
    console.log(
      await runPaymentsGet({
        endpoint,
        token,
        intentId,
        json: !!program.opts().json,
      }),
    );
  });

// product import
const product = program.command("product").description("商品运营工具");
product
  .command("import-from-base")
  .description("从飞书多维表格导入商品，默认 dry-run")
  .requiredOption("--req <id>", "REQ-ID，例如 REQ-058")
  .requiredOption("--base-url <url>", "飞书多维表格 URL")
  .requiredOption("--mapping <path>", "字段映射 JSON 文件")
  .option("--env <env>", "目标环境：test/prod", "test")
  .option("--dry-run", "只预检不写入（默认）")
  .option("--execute", "执行写入；默认只 dry-run")
  .option("--output <dir>", "证据输出目录")
  .option("--lark-cli <path>", "lark-cli 可执行文件路径")
  .action(async (opts) => {
    const { endpoint, token } = requireToken();
    console.log(
      await runImportFromBase({
        endpoint,
        token,
        req: opts.req,
        baseUrl: opts.baseUrl,
        mappingPath: opts.mapping,
        env: opts.env,
        execute: !!opts.execute,
        outputDir: opts.output,
        larkCliPath: opts.larkCli,
      }),
    );
  });
product
  .command("import-cleanup")
  .description("清理指定商品导入批次的 test 数据")
  .requiredOption("--req <id>", "REQ-ID，例如 REQ-058")
  .requiredOption("--batch-id <id>", "导入批次 ID")
  .option("--env <env>", "目标环境：test/prod", "test")
  .option("--execute", "执行清理；默认只 dry-run")
  .option("--output <dir>", "证据输出目录")
  .action(async (opts) => {
    const { endpoint, token } = requireToken();
    console.log(
      await runImportCleanup({
        endpoint,
        token,
        req: opts.req,
        batchId: opts.batchId,
        env: opts.env,
        execute: !!opts.execute,
        outputDir: opts.output,
      }),
    );
  });

// skills
const skills = program.command("skills").description("Claude Code Skill 管理");
skills
  .command("install")
  .description("安装 4 个 skill 到 ~/.claude/skills/yaolai-*/")
  .action(async () => {
    await runSkillsInstall(skillsDir);
    console.log(`Skills installed to ${skillsDir}/yaolai-*/. Restart Claude Code to load.`);
  });

// 统一错误处理（FR-021b/022）
program.parseAsync(process.argv).catch((err: unknown) => {
  const json = !!program.opts().json;
  if (err instanceof CliError) {
    process.stderr.write(formatErrorOutput(err, json) + "\n");
    process.exit(err.exitCode);
  }
  // 非 CliError（programmer error / unexpected）→ 标准 1
  const message = (err as any)?.message ?? String(err);
  if (json) {
    process.stderr.write(
      JSON.stringify({ code: "UNEXPECTED_ERROR", message, trace_id: "", details: {} }) + "\n",
    );
  } else {
    process.stderr.write(`Error: UNEXPECTED_ERROR - ${message}\n`);
  }
  process.exit(EXIT_CODES.GENERIC);
});
