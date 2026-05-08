import {
  writeFileSync,
  readFileSync,
  existsSync,
  unlinkSync,
  chmodSync,
  mkdirSync,
} from "node:fs";
import { dirname } from "node:path";

export interface Credentials {
  schema_version: 1;
  endpoint: string;
  username: string;
  tenant_id: string;
  token: string;
  issued_at: string;
  expires_at: string;
}

export function saveCredentials(path: string, c: Credentials): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(c, null, 2));
  chmodSync(path, 0o600);
}

export function loadCredentials(path: string): Credentials | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Credentials;
}

export function clearCredentials(path: string): void {
  if (existsSync(path)) unlinkSync(path);
}

export function isExpired(c: Credentials, now: Date = new Date()): boolean {
  return new Date(c.expires_at).getTime() <= now.getTime();
}
