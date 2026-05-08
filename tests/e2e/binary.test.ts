import { test, expect } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function pickBinary(): string | null {
  const platform = process.platform;
  const arch = process.arch;
  let name: string | null = null;
  if (platform === "darwin" && arch === "arm64") name = "yaolai-cli-darwin-arm64";
  else if (platform === "darwin" && arch === "x64") name = "yaolai-cli-darwin-x64";
  else if (platform === "linux" && arch === "x64") name = "yaolai-cli-linux-x64";
  else if (platform === "win32" && arch === "x64") name = "yaolai-cli-windows-x64.exe";
  if (!name) return null;
  const p = join(process.cwd(), "dist", name);
  return existsSync(p) ? p : null;
}

const binary = pickBinary();

if (!binary) {
  console.warn(
    `[e2e] no binary for ${process.platform}-${process.arch}, e2e tests will skip`,
  );
}

const e2e = binary ? test : test.skip;

e2e("AC-200: spawned binary prints v0.1.0", () => {
  const out = spawnSync(binary!, ["version"], { encoding: "utf8" });
  expect(out.status).toBe(0);
  expect(out.stdout.trim()).toBe("v0.1.0");
});

e2e("not-logged-in goods list exits 3 with NOT_LOGGED_IN", () => {
  const home = mkdtempSync(join(tmpdir(), "yaolai-e2e-"));
  const out = spawnSync(binary!, ["goods", "list"], {
    encoding: "utf8",
    env: { ...process.env, HOME: home },
  });
  expect(out.status).toBe(3);
  expect(out.stderr).toContain("NOT_LOGGED_IN");
});

e2e("--json error envelope when not logged in", () => {
  const home = mkdtempSync(join(tmpdir(), "yaolai-e2e-"));
  const out = spawnSync(binary!, ["--json", "goods", "list"], {
    encoding: "utf8",
    env: { ...process.env, HOME: home },
  });
  expect(out.status).toBe(3);
  const json = JSON.parse(out.stderr.trim());
  expect(json.code).toBe("NOT_LOGGED_IN");
  expect(json).toHaveProperty("trace_id");
});

e2e("config set/get roundtrip", () => {
  const home = mkdtempSync(join(tmpdir(), "yaolai-e2e-"));
  const setRes = spawnSync(
    binary!,
    ["config", "set", "endpoint", "https://api.example.com"],
    { encoding: "utf8", env: { ...process.env, HOME: home } },
  );
  expect(setRes.status).toBe(0);
  const getRes = spawnSync(binary!, ["config", "get", "endpoint"], {
    encoding: "utf8",
    env: { ...process.env, HOME: home },
  });
  expect(getRes.status).toBe(0);
  expect(getRes.stdout.trim()).toBe("https://api.example.com");
});

e2e("invalid endpoint scheme rejected with exit 2", () => {
  const home = mkdtempSync(join(tmpdir(), "yaolai-e2e-"));
  spawnSync(
    binary!,
    ["config", "set", "endpoint", "http://insecure.example.com"],
    { encoding: "utf8", env: { ...process.env, HOME: home } },
  );
  const out = spawnSync(binary!, ["login", "--username", "x"], {
    encoding: "utf8",
    env: { ...process.env, HOME: home, YAOLAI_PASSWORD: "x" },
  });
  expect(out.status).toBe(2);
  expect(out.stderr).toContain("INVALID_ENDPOINT");
});
