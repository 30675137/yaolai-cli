import { test, expect, beforeEach, mock } from "bun:test";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let posts: Array<{ url: string; token: string; body: any }>;
let backendResponse: unknown;

mock.module("../../src/core/client", () => ({
  httpPost: async (url: string, token: string, body: unknown) => {
    posts.push({ url, token, body });
    return backendResponse;
  },
}));

import { runImportCleanup } from "../../src/commands/product/import-cleanup";

beforeEach(() => {
  posts = [];
  backendResponse = {
    batchId: "exec-1",
    environment: "test",
    status: "CLEANED",
    summary: { total: 1, valid: 1, created: 0, skipped: 0, failed: 0, cleaned: 1 },
    items: [{ sourceRecordId: "rec1", status: "CLEANED", spuId: 101, skuIds: [201], errors: [] }],
  };
});

test("cleanup posts to backend and writes cleanup evidence", async () => {
  const outputDir = mkdtempSync(join(tmpdir(), "req058-cleanup-"));

  const out = await runImportCleanup({
    endpoint: "https://admin.test",
    token: "tok",
    req: "REQ-058",
    batchId: "exec-1",
    env: "test",
    execute: true,
    outputDir,
  });

  expect(JSON.parse(out).summary.cleaned).toBe(1);
  expect(posts[0].url).toBe("https://admin.test/admin/v1/product-import/batches/exec-1/cleanup");
  expect(posts[0].body).toEqual({ reqId: "REQ-058", environment: "test", dryRun: false });
  const evidence = join(outputDir, "exec-1", "cleanup.json");
  expect(existsSync(evidence)).toBe(true);
  expect(JSON.parse(readFileSync(evidence, "utf8")).status).toBe("CLEANED");
});

test("cleanup rejects prod execute before backend submission", async () => {
  await expect(runImportCleanup({
    endpoint: "https://admin.test",
    token: "tok",
    req: "REQ-058",
    batchId: "exec-1",
    env: "prod",
    execute: true,
  })).rejects.toMatchObject({ code: "PRODUCT_IMPORT_PROD_CLEANUP_BLOCKED" });
  expect(posts).toHaveLength(0);
});
