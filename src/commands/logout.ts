import { clearCredentials } from "../core/credentials.js";

export function runLogout(path: string): void {
  clearCredentials(path);
}
