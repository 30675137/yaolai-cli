import { test, expect, beforeEach, mock } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let posts: Array<{ url: string; token: string; body: unknown }>;
let backendResponse: unknown;

mock.module("../../src/core/client", () => ({
  httpPost: async (url: string, token: string, body: unknown) => {
    posts.push({ url, token, body });
    return backendResponse;
  },
}));

import { runImportFromBase } from "../../src/commands/product/import-from-base";

beforeEach(() => {
  posts = [];
  backendResponse = {
    batchId: "dry-run-1",
    environment: "test",
    status: "SUCCESS",
    summary: { total: 1, valid: 1, created: 0, skipped: 0, failed: 0, cleaned: 0 },
    items: [{ sourceRecordId: "rec1", status: "VALID", errors: [] }],
  };
});

test("dry-run reads Base rows, maps drafts, posts to backend, and writes evidence", async () => {
  const dir = mkdtempSync(join(tmpdir(), "req058-import-"));
  const mappingPath = join(dir, "mapping.json");
  const outputDir = join(dir, "evidence");
  writeFileSync(mappingPath, JSON.stringify({
    spu: {
      name: "商品名称",
      subtitle: "副标题",
      categoryPath: "分类路径",
      mainImages: "主图",
    },
    sku: {
      specName: "规格",
      price: "售价",
      stockQty: "库存",
    },
    display: {
      homeRecommendation: true,
      categoryListing: true,
      frontendTag: "RECOMMEND",
    },
  }));

  const out = await runImportFromBase({
    endpoint: "https://admin.test",
    token: "tok",
    req: "REQ-058",
    baseUrl: "https://j13juzq4tyn.feishu.cn/base/QQCtb4GmEa51jqsu6rncedJPnne?table=tblPxQRGmIxZcSuU&view=vewPQzgUPY",
    mappingPath,
    env: "test",
    execute: false,
    outputDir,
    readRecords: async () => [{
      recordId: "rec1",
      fields: {
        商品名称: "耀莱月饼",
        副标题: "中秋礼盒",
        分类路径: "礼品/月饼",
        主图: "https://example.com/main.jpg",
        规格: "礼盒",
        售价: "199.00",
        库存: "20",
      },
    }],
  });

  expect(JSON.parse(out).batchId).toBe("dry-run-1");
  expect(posts[0].url).toBe("https://admin.test/admin/v1/product-import/dry-run");
  expect(posts[0].token).toBe("tok");
  expect(posts[0].body).toMatchObject({
    reqId: "REQ-058",
    environment: "test",
    source: {
      tableId: "tblPxQRGmIxZcSuU",
      viewId: "vewPQzgUPY",
    },
    items: [{
      sourceRecordId: "rec1",
      spu: { name: "耀莱月饼", categoryPath: ["礼品", "月饼"] },
      skus: [{ specName: "礼盒", price: 199, stockQty: 20 }],
    }],
  });
  const evidence = join(outputDir, "dry-run-1", "dry-run.json");
  expect(existsSync(evidence)).toBe(true);
  expect(JSON.parse(readFileSync(evidence, "utf8")).summary.total).toBe(1);
});

test("execute=false is the default dry-run mode", async () => {
  const dir = mkdtempSync(join(tmpdir(), "req058-import-"));
  const mappingPath = join(dir, "mapping.json");
  writeFileSync(mappingPath, JSON.stringify({
    spu: { name: "商品名称", categoryPath: "分类路径", mainImages: "主图" },
    sku: { specName: "规格", price: "售价", stockQty: "库存" },
  }));

  await runImportFromBase({
    endpoint: "https://admin.test",
    token: "tok",
    req: "REQ-058",
    baseUrl: "https://j13juzq4tyn.feishu.cn/base/QQCtb4GmEa51jqsu6rncedJPnne?table=tblPxQRGmIxZcSuU",
    mappingPath,
    env: "test",
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

  expect(posts[0].url).toBe("https://admin.test/admin/v1/product-import/dry-run");
});

test("dry-run can read records from lark-cli JSON output", async () => {
  const dir = mkdtempSync(join(tmpdir(), "req058-import-"));
  const mappingPath = join(dir, "mapping.json");
  const larkCliPath = join(dir, "lark-cli");
  writeFileSync(mappingPath, JSON.stringify({
    spu: { name: "商品名称", categoryPath: "分类路径", mainImages: "主图" },
    sku: { specName: "规格", price: "售价", stockQty: "库存" },
  }));
  writeFileSync(larkCliPath, `#!/bin/sh
cat <<'JSON'
{"data":{"items":[{"record_id":"rec-cli","fields":{"商品名称":"耀莱月饼","分类路径":"礼品/月饼","主图":"https://example.com/main.jpg","规格":"礼盒","售价":"199.00","库存":"20"}}]}}
JSON
`);
  chmodSync(larkCliPath, 0o755);

  await runImportFromBase({
    endpoint: "https://admin.test",
    token: "tok",
    req: "REQ-058",
    baseUrl: "https://j13juzq4tyn.feishu.cn/base/QQCtb4GmEa51jqsu6rncedJPnne?table=tblPxQRGmIxZcSuU",
    mappingPath,
    env: "test",
    larkCliPath,
  });

  expect(posts[0].body.items[0].sourceRecordId).toBe("rec-cli");
});
