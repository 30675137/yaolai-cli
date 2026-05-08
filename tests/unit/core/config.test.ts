import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, saveConfig, getKey, setKey } from "../../../src/core/config";

let path: string;
beforeEach(() => {
  path = join(mkdtempSync(join(tmpdir(), "yaolai-cfg-")), "config.json");
});

test("loadConfig returns defaults when file missing", () => {
  expect(loadConfig(path)).toEqual({
    schema_version: 1,
    endpoint: "",
    profile: "default",
  });
});

test("setKey endpoint persists and getKey reads back", () => {
  setKey(path, "endpoint", "https://api.example.com");
  expect(getKey(path, "endpoint")).toBe("https://api.example.com");
  expect(loadConfig(path).endpoint).toBe("https://api.example.com");
});

test("setKey profile only accepts 'default' in v0.1 (clarify Q4)", () => {
  expect(() => setKey(path, "profile", "staging")).toThrow(/profile/);
});

test("setKey profile='default' is allowed (no-op)", () => {
  expect(() => setKey(path, "profile", "default")).not.toThrow();
  expect(getKey(path, "profile")).toBe("default");
});

test("setKey rejects unknown key with CONFIG_UNKNOWN_KEY", () => {
  expect(() => setKey(path, "tenant" as any, "x")).toThrow(/unknown/i);
});

test("getKey on fresh file returns empty endpoint default", () => {
  expect(getKey(path, "endpoint")).toBe("");
});

test("setKey creates parent directory if missing", () => {
  const nested = join(mkdtempSync(join(tmpdir(), "y-")), "nested", "config.json");
  setKey(nested, "endpoint", "https://x");
  expect(getKey(nested, "endpoint")).toBe("https://x");
});

test("saveConfig writes JSON pretty-printed", () => {
  saveConfig(path, { schema_version: 1, endpoint: "https://x", profile: "default" });
  expect(loadConfig(path)).toEqual({ schema_version: 1, endpoint: "https://x", profile: "default" });
});
