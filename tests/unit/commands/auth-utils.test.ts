import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveCredentials, type Credentials } from "../../../src/core/credentials";
import { runLogout } from "../../../src/commands/logout";
import { runWhoami } from "../../../src/commands/whoami";

let path: string;

beforeEach(() => {
  path = join(mkdtempSync(join(tmpdir(), "yaolai-w-")), "credentials.json");
});

const sample: Credentials = {
  schema_version: 1,
  endpoint: "https://api.x",
  username: "alice",
  tenant_id: "default",
  token: "jwt",
  issued_at: "2026-05-08T00:00:00Z",
  expires_at: "2026-05-15T00:00:00Z",
};

test("runLogout removes credentials file", () => {
  saveCredentials(path, sample);
  runLogout(path);
  expect(existsSync(path)).toBe(false);
});

test("runLogout is idempotent (no error when missing)", () => {
  expect(() => {
    runLogout(path);
    runLogout(path);
  }).not.toThrow();
});

test("runWhoami returns username + endpoint + expires when logged in", () => {
  saveCredentials(path, sample);
  const out = runWhoami(path);
  expect(out).toContain("alice");
  expect(out).toContain("https://api.x");
  expect(out).toContain("2026-05-15");
});

test("runWhoami throws CliError NOT_LOGGED_IN exit 3 when not logged in", () => {
  expect(() => runWhoami(path)).toThrow();
  try {
    runWhoami(path);
  } catch (e: any) {
    expect(e.code).toBe("NOT_LOGGED_IN");
    expect(e.exitCode).toBe(3);
  }
});
