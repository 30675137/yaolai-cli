import { request } from "undici";
import prompts from "prompts";
import { saveCredentials } from "../core/credentials.js";
import { saveConfig, loadConfig } from "../core/config.js";
import { CliError, EXIT_CODES } from "../core/errors.js";

export type PasswordSource =
  | { kind: "stdin" }
  | { kind: "env"; value: string }
  | { kind: "prompt" };

export interface LoginOptions {
  endpoint: string;
  username?: string;
  passwordSource: PasswordSource;
  credentialsPath: string;
  configPath: string;
}

async function resolveUsername(opt: LoginOptions): Promise<string> {
  if (opt.username) return opt.username;
  const r = await prompts({ type: "text", name: "u", message: "Username:" });
  if (!r.u) throw new CliError("LOGIN_CANCELLED", "username required", EXIT_CODES.INVALID_ARG);
  return r.u as string;
}

async function resolvePassword(opt: LoginOptions): Promise<string> {
  if (opt.passwordSource.kind === "env") return opt.passwordSource.value;
  if (opt.passwordSource.kind === "stdin") {
    const data = await Bun.stdin.text();
    return data.replace(/\r?\n$/, "");
  }
  const r = await prompts({ type: "password", name: "p", message: "Password:" });
  if (!r.p) throw new CliError("LOGIN_CANCELLED", "password required", EXIT_CODES.INVALID_ARG);
  return r.p as string;
}

export async function runLogin(opt: LoginOptions): Promise<void> {
  if (!opt.endpoint.startsWith("https://")) {
    throw new CliError("INVALID_ENDPOINT", "endpoint must be https", EXIT_CODES.INVALID_ARG);
  }
  const username = await resolveUsername(opt);
  const password = await resolvePassword(opt);

  const res = await request(`${opt.endpoint}/admin/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = (await res.body.json()) as any;
  if (res.statusCode !== 200) {
    throw new CliError(
      body?.code ?? "LOGIN_FAILED",
      body?.message ?? `HTTP ${res.statusCode}`,
      EXIT_CODES.GENERIC,
      body?.trace_id ?? "",
    );
  }

  const issuedAt = new Date().toISOString();
  saveCredentials(opt.credentialsPath, {
    schema_version: 1,
    endpoint: opt.endpoint,
    username,
    tenant_id: body.tenant_id ?? "default",
    token: body.token,
    issued_at: issuedAt,
    expires_at: body.expires_at,
  });

  const cfg = loadConfig(opt.configPath);
  cfg.endpoint = opt.endpoint;
  saveConfig(opt.configPath, cfg);
}
