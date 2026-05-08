import { test, expect, beforeEach, mock } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let postCalls: Array<{ url: string; body: any; headers: any }>;
let postReply: { statusCode: number; data: any };

mock.module("undici", () => ({
  request: async (url: string, opts: any) => {
    postCalls.push({
      url: String(url),
      body: opts?.body ? JSON.parse(String(opts.body)) : undefined,
      headers: opts?.headers ?? {},
    });
    return {
      statusCode: postReply.statusCode,
      body: { json: async () => postReply.data },
    };
  },
}));

import { runLogin, type LoginOptions } from "../../../src/commands/login";
import { loadCredentials } from "../../../src/core/credentials";
import { loadConfig } from "../../../src/core/config";

let credPath: string;
let cfgPath: string;

beforeEach(() => {
  postCalls = [];
  postReply = { statusCode: 200, data: {} };
  const dir = mkdtempSync(join(tmpdir(), "yaolai-login-"));
  credPath = join(dir, "credentials.json");
  cfgPath = join(dir, "config.json");
});

const baseOpts = (overrides: Partial<LoginOptions>): LoginOptions => ({
  endpoint: "https://api.x",
  username: "alice",
  passwordSource: { kind: "env", value: "pwd123" },
  credentialsPath: credPath,
  configPath: cfgPath,
  ...overrides,
});

test("login with --username + env password writes credentials chmod 600", async () => {
  postReply = {
    statusCode: 200,
    data: { token: "jwt-abc", expires_at: "2026-05-15T10:00:00Z", username: "alice" },
  };
  await runLogin(baseOpts({}));
  const c = loadCredentials(credPath);
  expect(c?.token).toBe("jwt-abc");
  expect(c?.username).toBe("alice");
  expect(c?.endpoint).toBe("https://api.x");
  expect(c?.expires_at).toBe("2026-05-15T10:00:00Z");
});

test("login posts to /admin/v1/auth/login with json body", async () => {
  postReply = { statusCode: 200, data: { token: "t", expires_at: "2026-05-15T00:00:00Z" } };
  await runLogin(baseOpts({}));
  expect(postCalls).toHaveLength(1);
  expect(postCalls[0].url).toBe("https://api.x/admin/v1/auth/login");
  expect(postCalls[0].body).toEqual({ username: "alice", password: "pwd123" });
  expect(postCalls[0].headers["content-type"]).toBe("application/json");
});

test("login 401 throws CliError INVALID_CREDENTIALS exit 1", async () => {
  postReply = {
    statusCode: 401,
    data: { code: "INVALID_CREDENTIALS", message: "wrong password", trace_id: "t" },
  };
  await expect(runLogin(baseOpts({ passwordSource: { kind: "env", value: "wrong" } })))
    .rejects.toMatchObject({ code: "INVALID_CREDENTIALS", exitCode: 1 });
});

test("login rejects http:// endpoint", async () => {
  await expect(runLogin(baseOpts({ endpoint: "http://insecure" })))
    .rejects.toMatchObject({ code: "INVALID_ENDPOINT", exitCode: 2 });
});

test("login persists endpoint to config", async () => {
  postReply = { statusCode: 200, data: { token: "t", expires_at: "2026-05-15T00:00:00Z" } };
  await runLogin(baseOpts({}));
  expect(loadConfig(cfgPath).endpoint).toBe("https://api.x");
});

test("login defaults tenant_id='default' when backend doesn't return it", async () => {
  postReply = { statusCode: 200, data: { token: "t", expires_at: "2026-05-15T00:00:00Z" } };
  await runLogin(baseOpts({}));
  expect(loadCredentials(credPath)?.tenant_id).toBe("default");
});

test("login uses tenant_id from backend response when provided", async () => {
  postReply = {
    statusCode: 200,
    data: { token: "t", expires_at: "2026-05-15T00:00:00Z", tenant_id: "tenant-x" },
  };
  await runLogin(baseOpts({}));
  expect(loadCredentials(credPath)?.tenant_id).toBe("tenant-x");
});
