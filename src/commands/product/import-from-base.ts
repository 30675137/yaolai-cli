import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { httpPost } from "../../core/client.js";
import { CliError, EXIT_CODES } from "../../core/errors.js";
import { parseBaseUrl, hashBaseToken } from "../../lib/base/source.js";
import { readBaseRecordsFromLark } from "../../lib/base/record-reader.js";
import {
  mapBaseRecordToDraft,
  type BaseRecord,
  type ProductImportDraft,
  type ProductImportMapping,
} from "../../lib/product-import/mapping.js";
import { verifyPublicVisibility } from "../../lib/product-import/public-verify.js";

export interface ImportFromBaseOptions {
  endpoint: string;
  token: string;
  req: string;
  baseUrl: string;
  mappingPath: string;
  env: "test" | "prod" | string;
  execute?: boolean;
  outputDir?: string;
  larkCliPath?: string;
  readRecords?: () => Promise<BaseRecord[]>;
}

interface ProductImportPayload {
  reqId: string;
  environment: string;
  execute: boolean;
  source: {
    type: "FEISHU_BASE";
    baseTokenHash: string;
    tableId: string;
    viewId?: string;
  };
  items: ProductImportDraft[];
}

interface ProductImportReport {
  batchId: string;
  items?: Array<{
    status?: string;
    spuId?: number | string;
    categoryId?: number | string;
  }>;
  [key: string]: unknown;
}

export async function runImportFromBase(options: ImportFromBaseOptions): Promise<string> {
  const execute = options.execute === true;
  if (execute && options.env !== "test") {
    throw new CliError(
      "PRODUCT_IMPORT_PROD_EXECUTE_BLOCKED",
      "product import execute is only allowed for test environment",
      EXIT_CODES.INVALID_ARG,
    );
  }
  const mapping = loadMapping(options.mappingPath);
  const source = parseBaseUrl(options.baseUrl);
  const records = await (options.readRecords
    ? options.readRecords()
    : readBaseRecordsFromLark({
      source,
      fields: collectMappedFields(mapping),
      larkCliPath: options.larkCliPath,
    }));
  const items = records.map((record) => mapBaseRecordToDraft(record, mapping));
  const payload: ProductImportPayload = {
    reqId: options.req,
    environment: options.env,
    execute,
    source: {
      type: "FEISHU_BASE",
      baseTokenHash: hashBaseToken(source.baseToken),
      tableId: source.tableId,
      viewId: source.viewId,
    },
    items,
  };
  const path = execute ? "execute" : "dry-run";
  const report = await httpPost<ProductImportReport>(
    `${options.endpoint}/admin/v1/product-import/${path}`,
    options.token,
    payload,
  );
  const publicVerify = execute ? await verifyCreatedProducts(options, report) : [];
  writeEvidence(options.outputDir, report, path);
  if (publicVerify.length > 0) {
    writePublicVerifyEvidence(options.outputDir, report.batchId, publicVerify);
  }
  return JSON.stringify(report, null, 2);
}

function loadMapping(path: string): ProductImportMapping {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error: any) {
    throw new CliError(
      "PRODUCT_IMPORT_MAPPING_INVALID",
      error?.message ?? "invalid product import mapping",
      EXIT_CODES.INVALID_ARG,
    );
  }
  return parsed as ProductImportMapping;
}

function collectMappedFields(mapping: ProductImportMapping): string[] {
  const fields = [
    mapping.spu.name,
    mapping.spu.subtitle,
    mapping.spu.categoryPath,
    mapping.spu.mainImages,
    mapping.sku.specName,
    mapping.sku.price,
    mapping.sku.originalPrice,
    mapping.sku.stockQty,
    mapping.detail?.sellingPoints,
    mapping.detail?.detailImages,
    mapping.detail?.specAttrs,
    mapping.detail?.purchaseNotice,
  ];
  return [...new Set(fields.filter((field): field is string => !!field))];
}

function writeEvidence(outputDir: string | undefined, report: ProductImportReport, mode: string): void {
  if (!outputDir || !report.batchId) return;
  const dir = join(outputDir, report.batchId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${mode}.json`), JSON.stringify(report, null, 2));
}

async function verifyCreatedProducts(
  options: ImportFromBaseOptions,
  report: ProductImportReport,
): Promise<Array<{ spuId: number; categoryId: number; home: boolean; category: boolean; detail: boolean }>> {
  const items = report.items ?? [];
  const created = items.filter((item) => item.status === "CREATED" && item.spuId && item.categoryId);
  const results = [];
  for (const item of created) {
    const spuId = Number(item.spuId);
    const categoryId = Number(item.categoryId);
    const visibility = await verifyPublicVisibility({
      endpoint: options.endpoint,
      token: options.token,
      spuId,
      categoryId,
    });
    results.push({ spuId, categoryId, ...visibility });
  }
  return results;
}

function writePublicVerifyEvidence(
  outputDir: string | undefined,
  batchId: string | undefined,
  results: Array<{ spuId: number; categoryId: number; home: boolean; category: boolean; detail: boolean }>,
): void {
  if (!outputDir || !batchId) return;
  const dir = join(outputDir, batchId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "public-verify.json"), JSON.stringify({ batchId, results }, null, 2));
}
