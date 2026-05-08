import { request } from "undici";
import { CliError, EXIT_CODES } from "./errors.js";

const STATUS_TO_EXIT: Record<number, number> = {
  401: EXIT_CODES.AUTH_EXPIRED,
  404: EXIT_CODES.NOT_FOUND,
  409: EXIT_CODES.CONFLICT,
};

export async function httpGet<T>(url: string, token: string): Promise<T> {
  if (!url.startsWith("https://")) {
    throw new CliError(
      "INVALID_ENDPOINT",
      "endpoint must be https",
      EXIT_CODES.INVALID_ARG,
    );
  }
  let res;
  try {
    res = await request(url, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
  } catch (e: any) {
    throw new CliError(
      "NETWORK_ERROR",
      e?.message ?? String(e),
      EXIT_CODES.GENERIC,
    );
  }
  const body = (await res.body.json()) as any;
  if (res.statusCode >= 200 && res.statusCode < 300) return body as T;
  const exitCode = STATUS_TO_EXIT[res.statusCode] ?? EXIT_CODES.GENERIC;
  throw new CliError(
    body?.code ?? "HTTP_ERROR",
    body?.message ?? `HTTP ${res.statusCode}`,
    exitCode,
    body?.trace_id ?? "",
    body?.details ?? {},
  );
}
