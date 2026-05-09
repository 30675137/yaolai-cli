import { createHash } from "node:crypto";
import { CliError, EXIT_CODES } from "../../core/errors.js";

export interface BaseSource {
  baseToken: string;
  tableId: string;
  viewId?: string;
}

export function parseBaseUrl(raw: string): BaseSource {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new CliError("BASE_URL_INVALID", "invalid Feishu Base URL", EXIT_CODES.INVALID_ARG);
  }

  const match = url.pathname.match(/\/base\/([^/?#]+)/);
  const baseToken = match?.[1];
  if (!baseToken) {
    throw new CliError("BASE_URL_TOKEN_MISSING", "Base URL is missing base token", EXIT_CODES.INVALID_ARG);
  }

  const tableId = url.searchParams.get("table");
  if (!tableId) {
    throw new CliError("BASE_URL_TABLE_MISSING", "Base URL is missing table id", EXIT_CODES.INVALID_ARG);
  }

  const viewId = url.searchParams.get("view") ?? undefined;
  return { baseToken, tableId, viewId };
}

export function hashBaseToken(baseToken: string): string {
  return createHash("sha256").update(baseToken).digest("hex");
}
