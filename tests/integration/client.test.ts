import { test, expect, beforeEach, mock } from "bun:test";

type ReplyFn = (opts: { method: string; headers: Record<string, string> }) => {
  statusCode: number;
  body: unknown;
};

let nextReply: ReplyFn | null = null;
let lastUrl: string | null = null;

mock.module("undici", () => ({
  request: async (
    url: string,
    opts: { method: string; headers: Record<string, string> },
  ) => {
    lastUrl = url;
    if (!nextReply) throw new Error("no reply registered");
    const { statusCode, body } = nextReply(opts);
    return {
      statusCode,
      body: {
        json: async () => body,
      },
    };
  },
}));

const { httpGet } = await import("../../src/core/client");

beforeEach(() => {
  nextReply = null;
  lastUrl = null;
});

test("httpGet rejects http:// endpoint with INVALID_ENDPOINT exit 2 (FR-024)", async () => {
  await expect(httpGet("http://x/path", "tok")).rejects.toMatchObject({
    code: "INVALID_ENDPOINT",
    exitCode: 2,
  });
});

test("httpGet success returns parsed JSON", async () => {
  nextReply = () => ({ statusCode: 200, body: { items: [], total: 0 } });
  const res = await httpGet<{ items: unknown[]; total: number }>(
    "https://api.example.com/admin/v1/spu",
    "tok",
  );
  expect(res).toEqual({ items: [], total: 0 });
});

test("httpGet 401 throws CliError AUTH_TOKEN_EXPIRED with exit 3", async () => {
  nextReply = () => ({
    statusCode: 401,
    body: { code: "AUTH_TOKEN_EXPIRED", message: "expired", trace_id: "t1" },
  });
  await expect(httpGet("https://api.example.com/x", "tok")).rejects.toMatchObject({
    code: "AUTH_TOKEN_EXPIRED",
    exitCode: 3,
  });
});

test("httpGet 404 throws with exit 4", async () => {
  nextReply = () => ({
    statusCode: 404,
    body: { code: "ORDER_NOT_FOUND", message: "no", trace_id: "t1" },
  });
  await expect(httpGet("https://api.example.com/x", "tok")).rejects.toMatchObject({
    code: "ORDER_NOT_FOUND",
    exitCode: 4,
  });
});

test("httpGet 409 throws with exit 5", async () => {
  nextReply = () => ({
    statusCode: 409,
    body: { code: "ORDER_CONFLICT", message: "x", trace_id: "t" },
  });
  await expect(httpGet("https://api.example.com/x", "tok")).rejects.toMatchObject({
    code: "ORDER_CONFLICT",
    exitCode: 5,
  });
});

test("httpGet 500 maps to GENERIC exit 1", async () => {
  nextReply = () => ({
    statusCode: 500,
    body: { code: "INTERNAL", message: "boom", trace_id: "t" },
  });
  await expect(httpGet("https://api.example.com/x", "tok")).rejects.toMatchObject({
    exitCode: 1,
  });
});

test("httpGet attaches Bearer authorization header", async () => {
  let captured: string | undefined;
  nextReply = (opts) => {
    captured = opts.headers.authorization;
    return { statusCode: 200, body: {} };
  };
  await httpGet("https://api.example.com/x", "tok-xyz");
  expect(captured).toBe("Bearer tok-xyz");
});

test("httpGet propagates trace_id and details from error envelope", async () => {
  nextReply = () => ({
    statusCode: 404,
    body: {
      code: "ORDER_NOT_FOUND",
      message: "no",
      trace_id: "trace-abc",
      details: { id: "X" },
    },
  });
  await expect(httpGet("https://api.example.com/x", "tok")).rejects.toMatchObject({
    traceId: "trace-abc",
    details: { id: "X" },
  });
});
