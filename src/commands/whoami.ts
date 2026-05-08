import { loadCredentials } from "../core/credentials.js";
import { CliError, EXIT_CODES } from "../core/errors.js";

export function runWhoami(path: string): string {
  const c = loadCredentials(path);
  if (!c) {
    throw new CliError(
      "NOT_LOGGED_IN",
      "not logged in, run `yaolai login`",
      EXIT_CODES.AUTH_EXPIRED,
    );
  }
  return `${c.username} @ ${c.endpoint} (expires ${c.expires_at})`;
}
