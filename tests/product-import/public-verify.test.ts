import { test, expect, beforeEach, mock } from "bun:test";

let gets: Array<{ url: string; token: string }>;
let responses: Record<string, unknown>;

mock.module("../../src/core/client", () => ({
  httpGet: async (url: string, token: string) => {
    gets.push({ url, token });
    return responses[url];
  },
}));

import { verifyPublicVisibility } from "../../src/lib/product-import/public-verify";

beforeEach(() => {
  gets = [];
  responses = {
    "https://admin.test/public/v1/home/recommendations": { items: [{ productId: 101 }] },
    "https://admin.test/public/v1/categories/9/products": { items: [{ productId: 101 }] },
    "https://admin.test/public/v1/products/101/detail": { productStatus: "ON_SHELF", skus: [{ id: 201, sellable: true }] },
  };
});

test("verifies home category and detail public visibility", async () => {
  const result = await verifyPublicVisibility({
    endpoint: "https://admin.test",
    token: "tok",
    spuId: 101,
    categoryId: 9,
  });

  expect(result).toEqual({ home: true, category: true, detail: true });
  expect(gets.map((x) => x.url)).toEqual([
    "https://admin.test/public/v1/home/recommendations",
    "https://admin.test/public/v1/categories/9/products",
    "https://admin.test/public/v1/products/101/detail",
  ]);
});
