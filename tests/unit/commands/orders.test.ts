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

import { runOrdersList, runOrdersGet } from "../../../src/commands/orders";

beforeEach(() => {
  calls = [];
  response = {};
  shouldThrow = null;
});

test("runOrdersList builds URL with status filter (AC-195)", async () => {
  response = {
    items: [{ id: "O-1", status: "PAID", total_amount: "10.00", member_id: "m1", created_at: "2026-05-08T10:00:00Z" }],
    total: 1, page: 1, size: 20, has_more: false,
  };
  const out = await runOrdersList({
    endpoint: "https://api.x", token: "tok", json: true, status: "PAID",
  });
  expect(JSON.parse(out).items[0].id).toBe("O-1");
  expect(calls[0].url).toBe("https://api.x/admin/v1/orders?status=PAID&page=1&size=20");
});

test("runOrdersList passes member_id, from, to (snake_case query params)", async () => {
  response = { items: [], total: 0, page: 1, size: 20, has_more: false };
  await runOrdersList({
    endpoint: "https://api.x", token: "tok", json: true,
    memberId: "12345",
    from: "2026-05-01T00:00:00Z",
    to: "2026-05-09T00:00:00Z",
  });
  expect(calls[0].url).toBe(
    "https://api.x/admin/v1/orders?member_id=12345&from=2026-05-01T00%3A00%3A00Z&to=2026-05-09T00%3A00%3A00Z&page=1&size=20"
  );
});

test("runOrdersList table contains 6 headers + sample row", async () => {
  response = {
    items: [{
      id: "O-1", member_id: "m1", status: "PAID", total_amount: "10.00",
      payment_status: "PAID", created_at: "2026-05-08T10:00:00Z",
    }],
    total: 1, page: 1, size: 20, has_more: false,
  };
  const out = await runOrdersList({ endpoint: "https://api.x", token: "tok", json: false });
  ["订单号", "会员", "状态", "金额", "支付", "创建时间", "O-1", "PAID", "10.00"].forEach((s) => {
    expect(out).toContain(s);
  });
});

test("runOrdersList shows '-' when payment_status is null", async () => {
  response = {
    items: [{ id: "O-1", member_id: "m1", status: "PENDING_PAY", total_amount: "10.00", payment_status: null, created_at: "2026-05-08T10:00:00Z" }],
    total: 1, page: 1, size: 20, has_more: false,
  };
  const out = await runOrdersList({ endpoint: "https://api.x", token: "tok", json: false });
  expect(out).toContain("-");
});

test("runOrdersGet returns detail with items+payment+timeline structure (AC-196)", async () => {
  response = {
    id: "O-1", items: [{ sku_id: "K-1" }], payment: { status: "PAID" },
    address_snapshot: { receiver: "x" }, timeline: [{ event: "CREATED" }],
  };
  const out = await runOrdersGet({ endpoint: "https://api.x", token: "tok", id: "O-1", json: true });
  const parsed = JSON.parse(out);
  expect(parsed.items).toHaveLength(1);
  expect(parsed.timeline).toHaveLength(1);
  expect(calls[0].url).toBe("https://api.x/admin/v1/orders/O-1");
});

test("runOrdersGet 404 propagates ORDER_NOT_FOUND CliError exit 4 (AC-198)", async () => {
  const { CliError, EXIT_CODES } = await import("../../../src/core/errors");
  shouldThrow = new CliError("ORDER_NOT_FOUND", "订单不存在", EXIT_CODES.NOT_FOUND);
  await expect(runOrdersGet({
    endpoint: "https://api.x", token: "tok", id: "NOT_EXIST", json: false,
  })).rejects.toMatchObject({ code: "ORDER_NOT_FOUND", exitCode: 4 });
});

test("runOrdersGet URL-encodes id", async () => {
  response = { id: "X" };
  await runOrdersGet({ endpoint: "https://api.x", token: "tok", id: "O 1", json: true });
  expect(calls[0].url).toBe("https://api.x/admin/v1/orders/O%201");
});
