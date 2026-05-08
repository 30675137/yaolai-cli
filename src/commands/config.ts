import { Command } from "commander";
import { getKey, setKey } from "../core/config.js";

export function registerConfig(program: Command, configPath: string): void {
  const cfg = program.command("config").description("读写本地 CLI 配置");

  cfg
    .command("get <key>")
    .description("读取配置项（endpoint / profile）")
    .action((key: string) => {
      console.log(getKey(configPath, key as any));
    });

  cfg
    .command("set <key> <value>")
    .description("写入配置项（v0.1: profile 锁 default）")
    .action((key: string, value: string) => {
      setKey(configPath, key as any, value);
      console.log("ok");
    });
}
