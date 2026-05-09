import { test, expect, beforeEach, mock } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let posts: Array<{ url: string; token: string; body: any }>;
let gets: Array<{ url: string; token: string }>;
let backendResponse: unknown;
let getResponses: Record<string, unknown>;

mock.module("../../src/core/client", () => ({
  httpGet: async (url: string, token: string) => {
    gets.push({ url, token });
    return getResponses[url];
  },
  httpPost: async (url: string, token: string, body: unknown) => {
    posts.push({ url, token, body });
    return backendResponse;
  },
}));

import { runImportFromBase } from "../../src/commands/product/import-from-base";

beforeEach(() => {
  posts = [];
  gets = [];
  getResponses = {
    "https://admin.test/public/v1/home/recommendations": { items: [{ productId: 101 }] },
    "https://admin.test/public/v1/categories/9/products": { items: [{ productId: 101 }] },
    "https://admin.test/public/v1/products/101/detail": { productStatus: "ON_SHELF", skus: [{ id: 201 }] },
  };
  backendResponse = {
    batchId: "exec-1",
    environment: "test",
    status: "SUCCESS",
    summary: { total: 1, valid: 1, created: 1, skipped: 0, failed: 0, cleaned: 0 },
    items: [{ sourceRecordId: "rec1", status: "CREATED", spuId: 101, categoryId: 9, errors: [] }],
  };
});

test("execute mode posts to execute endpoint and writes execute evidence", async () => {
  const dir = mkdtempSync(join(tmpdir(), "req058-import-"));
  const mappingPath = join(dir, "mapping.json");
  const outputDir = join(dir, "evidence");
  writeFileSync(mappingPath, JSON.stringify({
    spu: { name: "商品名称", categoryPath: "分类路径", mainImages: "主图" },
    sku: { specName: "规格", price: "售价", stockQty: "库存" },
  }));

  const out = await runImportFromBase({
    endpoint: "https://admin.test",
    token: "tok",
    req: "REQ-058",
    baseUrl: "https://j13juzq4tyn.feishu.cn/base/QQCtb4GmEa51jqsu6rncedJPnne?table=tblPxQRGmIxZcSuU",
    mappingPath,
    env: "test",
    execute: true,
    outputDir,
    readRecords: async () => [{
      recordId: "rec1",
      fields: {
        商品名称: "耀莱月饼",
        分类路径: "礼品/月饼",
        主图: "https://example.com/main.jpg",
        规格: "礼盒",
        售价: "199.00",
        库存: "20",
      },
    }],
  });

  expect(JSON.parse(out).summary.created).toBe(1);
  expect(posts[0].url).toBe("https://admin.test/admin/v1/product-import/execute");
  expect(posts[0].body.execute).toBe(true);
  const evidence = join(outputDir, "exec-1", "execute.json");
  const publicEvidence = join(outputDir, "exec-1", "public-verify.json");
  expect(existsSync(evidence)).toBe(true);
  expect(JSON.parse(readFileSync(evidence, "utf8")).items[0].spuId).toBe(101);
  expect(existsSync(publicEvidence)).toBe(true);
  expect(JSON.parse(readFileSync(publicEvidence, "utf8")).results[0]).toEqual({
    spuId: 101,
    categoryId: 9,
    home: true,
    category: true,
    detail: true,
  });
  expect(gets.map((x) => x.url)).toEqual([
    "https://admin.test/public/v1/home/recommendations",
    "https://admin.test/public/v1/categories/9/products",
    "https://admin.test/public/v1/products/101/detail",
  ]);
});

test("execute mode rejects prod before backend submission", async () => {
  const dir = mkdtempSync(join(tmpdir(), "req058-import-"));
  const mappingPath = join(dir, "mapping.json");
  writeFileSync(mappingPath, JSON.stringify({
    spu: { name: "商品名称", categoryPath: "分类路径", mainImages: "主图" },
    sku: { specName: "规格", price: "售价", stockQty: "库存" },
  }));

  await expect(runImportFromBase({
    endpoint: "https://admin.test",
    token: "tok",
    req: "REQ-058",
    baseUrl: "https://j13juzq4tyn.feishu.cn/base/QQCtb4GmEa51jqsu6rncedJPnne?table=tblPxQRGmIxZcSuU",
    mappingPath,
    env: "prod",
    execute: true,
    readRecords: async () => [],
  })).rejects.toMatchObject({ code: "PRODUCT_IMPORT_PROD_EXECUTE_BLOCKED" });
  expect(posts).toHaveLength(0);
});
