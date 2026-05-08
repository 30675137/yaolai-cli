import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  isExpired,
  type Credentials,
} from "../../../src/core/credentials";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "yaolai-creds-"));
});

const sample: Credentials = {
  schema_version: 1,
  endpoint: "https://api.example.com",
  username: "alice",
  tenant_id: "default",
  token: "jwt-abc",
  issued_at: "2026-05-08T10:00:00.000Z",
  expires_at: "2026-05-15T10:00:00.000Z",
};

test("saveCredentials writes file with chmod 0600", () => {
  const path = join(dir, "credentials.json");
  saveCredentials(path, sample);
  const stat = statSync(path);
  expect(stat.mode & 0o777).toBe(0o600);
  expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(sample);
});

test("saveCredentials creates parent directory if missing", () => {
  const path = join(dir, "nested", "subdir", "credentials.json");
  saveCredentials(path, sample);
  expect(loadCredentials(path)).toEqual(sample);
});

test("loadCredentials returns null when missing", () => {
  expect(loadCredentials(join(dir, "missing.json"))).toBeNull();
});

test("loadCredentials returns parsed when present", () => {
  const path = join(dir, "credentials.json");
  saveCredentials(path, sample);
  expect(loadCredentials(path)).toEqual(sample);
});

test("clearCredentials removes file (idempotent)", () => {
  const path = join(dir, "credentials.json");
  saveCredentials(path, sample);
  clearCredentials(path);
  clearCredentials(path); // 再调一次不抛
  expect(loadCredentials(path)).toBeNull();
});

test("isExpired returns true when expires_at in past", () => {
  const past = { ...sample, expires_at: "2020-01-01T00:00:00.000Z" };
  expect(isExpired(past, new Date("2026-05-08T10:00:00Z"))).toBe(true);
});

test("isExpired returns false when expires_at in future", () => {
  expect(isExpired(sample, new Date("2026-05-08T10:00:00Z"))).toBe(false);
});

test("isExpired uses current time when 'now' arg omitted", () => {
  const past = { ...sample, expires_at: "2020-01-01T00:00:00.000Z" };
  expect(isExpired(past)).toBe(true);
});
