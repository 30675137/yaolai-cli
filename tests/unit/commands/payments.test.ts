import { test, expect, beforeEach, mock } from "bun:test";

let calls: Array<{ url: string; token: string }>;
let response: any;
let shouldThrow: any = null;

mock.module("../../../src/core/client", () => ({
  httpGet: async (url: string, token: string) => {
    calls.push({ url, token });
    if (shouldThrow) throw shouldThrow;
    return response;
  },
}));

import { runPaymentsGet } from "../../../src/commands/payments";

beforeEach(() => {
  calls = [];
  response = {};
  shouldThrow = null;
});

test("runPaymentsGet returns intent JSON when json=true (AC-197)", async () => {
  response = {
    intent_id: "P-1", order_id: "O-1", amount: "10.00", status: "PAID",
    channel: "WECHAT", paid_at: "2026-05-08T10:00:00Z", third_party_no: "wx-1",
  };
  const out = await runPaymentsGet({
    endpoint: "https://api.x", token: "tok", intentId: "P-1", json: true,
  });
  expect(JSON.parse(out).status).toBe("PAID");
  expect(calls[0].url).toBe("https://api.x/admin/v1/payments/P-1");
});

test("runPaymentsGet renders human-readable when json=false (key fields)", async () => {
  response = {
    intent_id: "P-1", order_id: "O-1", amount: "10.00", status: "PAID",
    channel: "WECHAT", paid_at: "2026-05-08T10:00:00Z", third_party_no: "wx-1",
  };
  const out = await runPaymentsGet({
    endpoint: "https://api.x", token: "tok", intentId: "P-1", json: false,
  });
  ["P-1", "10.00", "PAID", "WECHAT", "wx-1"].forEach((s) => expect(out).toContain(s));
});

test("runPaymentsGet shows '-' for null nullable fields (channel/paid_at/third_party_no)", async () => {
  response = {
    intent_id: "P-1", order_id: "O-1", amount: "10.00", status: "PENDING",
    channel: null, paid_at: null, third_party_no: null,
  };
  const out = await runPaymentsGet({
    endpoint: "https://api.x", token: "tok", intentId: "P-1", json: false,
  });
  expect(out).toContain("-");
  expect(out).toContain("PENDING");
});

test("runPaymentsGet 404 propagates PAYMENT_NOT_FOUND CliError exit 4", async () => {
  const { CliError, EXIT_CODES } = await import("../../../src/core/errors");
  shouldThrow = new CliError("PAYMENT_NOT_FOUND", "支付意图不存在", EXIT_CODES.NOT_FOUND);
  await expect(runPaymentsGet({
    endpoint: "https://api.x", token: "tok", intentId: "NOT_EXIST", json: false,
  })).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND", exitCode: 4 });
});

test("runPaymentsGet URL-encodes intent id", async () => {
  response = { intent_id: "X" };
  await runPaymentsGet({ endpoint: "https://api.x", token: "tok", intentId: "P/100", json: true });
  expect(calls[0].url).toBe("https://api.x/admin/v1/payments/P%2F100");
});
