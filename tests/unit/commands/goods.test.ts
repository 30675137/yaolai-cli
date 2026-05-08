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

import { runGoodsList, runGoodsGet } from "../../../src/commands/goods";

beforeEach(() => {
  calls = [];
  response = {};
  shouldThrow = null;
});

test("runGoodsList builds URL with status + page + size and returns JSON", async () => {
  response = { items: [{ id: "SPU-1", name: "X" }], total: 1, page: 1, size: 10, has_more: false };
  const out = await runGoodsList({
    endpoint: "https://api.x",
    token: "tok",
    json: true,
    status: "ON_SHELF",
    page: 1,
    size: 10,
  });
  expect(JSON.parse(out).total).toBe(1);
  expect(calls[0].url).toBe("https://api.x/admin/v1/spu?status=ON_SHELF&page=1&size=10");
  expect(calls[0].token).toBe("tok");
});

test("runGoodsList omits status when undefined, uses page=1 size=20 defaults", async () => {
  response = { items: [], total: 0, page: 1, size: 20, has_more: false };
  await runGoodsList({ endpoint: "https://api.x", token: "tok", json: true });
  expect(calls[0].url).toBe("https://api.x/admin/v1/spu?page=1&size=20");
});

test("runGoodsList table contains headers + row data", async () => {
  response = {
    items: [{ id: "SPU-1", name: "X", status: "ON_SHELF", price: "10.00" }],
    total: 1, page: 1, size: 20, has_more: false,
  };
  const out = await runGoodsList({ endpoint: "https://api.x", token: "tok", json: false });
  expect(out).toContain("ID");
  expect(out).toContain("名称");
  expect(out).toContain("状态");
  expect(out).toContain("价格");
  expect(out).toContain("SPU-1");
  expect(out).toContain("ON_SHELF");
});

test("runGoodsGet returns detail JSON when json=true", async () => {
  response = { id: "SPU-1", name: "X" };
  const out = await runGoodsGet({
    endpoint: "https://api.x",
    token: "tok",
    id: "SPU-1",
    json: true,
  });
  expect(JSON.parse(out).id).toBe("SPU-1");
  expect(calls[0].url).toBe("https://api.x/admin/v1/spu/SPU-1");
});

test("runGoodsGet returns pretty JSON when json=false", async () => {
  response = { id: "SPU-1", name: "X" };
  const out = await runGoodsGet({
    endpoint: "https://api.x",
    token: "tok",
    id: "SPU-1",
    json: false,
  });
  expect(out).toContain('"id": "SPU-1"');
});

test("runGoodsGet URL-encodes id with special chars", async () => {
  response = { id: "X" };
  await runGoodsGet({ endpoint: "https://api.x", token: "tok", id: "SPU/100", json: true });
  expect(calls[0].url).toBe("https://api.x/admin/v1/spu/SPU%2F100");
});
