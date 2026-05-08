import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CliError, EXIT_CODES } from "./errors.js";

export interface Config {
  schema_version: 1;
  endpoint: string;
  profile: "default";
}

const DEFAULT: Config = { schema_version: 1, endpoint: "", profile: "default" };
const ALLOWED_KEYS = ["endpoint", "profile"] as const;
type Key = (typeof ALLOWED_KEYS)[number];

export function loadConfig(path: string): Config {
  if (!existsSync(path)) return { ...DEFAULT };
  return { ...DEFAULT, ...JSON.parse(readFileSync(path, "utf8")) };
}

export function saveConfig(path: string, c: Config): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(c, null, 2));
}

export function getKey(path: string, key: Key): string {
  return loadConfig(path)[key];
}

export function setKey(path: string, key: Key, value: string): void {
  if (!ALLOWED_KEYS.includes(key as Key)) {
    throw new CliError("CONFIG_UNKNOWN_KEY", `unknown key: ${key}`, EXIT_CODES.INVALID_ARG);
  }
  if (key === "profile" && value !== "default") {
    throw new CliError(
      "CONFIG_PROFILE_LOCKED",
      "v0.1 仅支持 profile=default",
      EXIT_CODES.INVALID_ARG,
    );
  }
  const c = loadConfig(path);
  (c as any)[key] = value;
  saveConfig(path, c);
}
