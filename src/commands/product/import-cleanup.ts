import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { httpPost } from "../../core/client.js";
import { CliError, EXIT_CODES } from "../../core/errors.js";

export interface ImportCleanupOptions {
  endpoint: string;
  token: string;
  req: string;
  batchId: string;
  env: "test" | "prod" | string;
  execute?: boolean;
  outputDir?: string;
}

interface ProductImportReport {
  batchId: string;
  [key: string]: unknown;
}

export async function runImportCleanup(options: ImportCleanupOptions): Promise<string> {
  if (options.execute === true && options.env !== "test") {
    throw new CliError(
      "PRODUCT_IMPORT_PROD_CLEANUP_BLOCKED",
      "product import cleanup execute is only allowed for test environment",
      EXIT_CODES.INVALID_ARG,
    );
  }
  const report = await httpPost<ProductImportReport>(
    `${options.endpoint}/admin/v1/product-import/batches/${encodeURIComponent(options.batchId)}/cleanup`,
    options.token,
    {
      reqId: options.req,
      environment: options.env,
      dryRun: options.execute !== true,
    },
  );
  writeEvidence(options.outputDir, report);
  return JSON.stringify(report, null, 2);
}

function writeEvidence(outputDir: string | undefined, report: ProductImportReport): void {
  if (!outputDir || !report.batchId) return;
  const dir = join(outputDir, report.batchId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "cleanup.json"), JSON.stringify(report, null, 2));
}
