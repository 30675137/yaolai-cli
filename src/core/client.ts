import { request } from "undici";
import { CliError, EXIT_CODES } from "./errors.js";

const STATUS_TO_EXIT: Record<number, number> = {
  401: EXIT_CODES.AUTH_EXPIRED,
  404: EXIT_CODES.NOT_FOUND,
  409: EXIT_CODES.CONFLICT,
};

export async function httpGet<T>(url: string, token: string): Promise<T> {
  assertHttpsEndpoint(url);
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
  const body = await readJsonBody(res);
  if (res.statusCode >= 200 && res.statusCode < 300) return body as T;
  throwHttpError(res.statusCode, body);
}

export async function httpPost<T>(url: string, token: string, body: unknown): Promise<T> {
  assertHttpsEndpoint(url);
  let res;
  try {
    res = await request(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    throw new CliError(
      "NETWORK_ERROR",
      e?.message ?? String(e),
      EXIT_CODES.GENERIC,
    );
  }
  const responseBody = await readJsonBody(res);
  if (res.statusCode >= 200 && res.statusCode < 300) return responseBody as T;
  throwHttpError(res.statusCode, responseBody);
}

function assertHttpsEndpoint(url: string): void {
  if (!url.startsWith("https://")) {
    throw new CliError(
      "INVALID_ENDPOINT",
      "endpoint must be https",
      EXIT_CODES.INVALID_ARG,
    );
  }
}

async function readJsonBody(res: { body: { json: () => Promise<unknown> } }): Promise<any> {
  return (await res.body.json()) as any;
}

function throwHttpError(statusCode: number, body: any): never {
  const exitCode = STATUS_TO_EXIT[statusCode] ?? EXIT_CODES.GENERIC;
  throw new CliError(
    body?.code ?? "HTTP_ERROR",
    body?.message ?? `HTTP ${statusCode}`,
    exitCode,
    body?.trace_id ?? "",
    body?.details ?? {},
  );
}
