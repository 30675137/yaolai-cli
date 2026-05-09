import { execFileSync } from "node:child_process";
import type { BaseRecord } from "../product-import/mapping.js";
import type { BaseSource } from "./source.js";
import { CliError, EXIT_CODES } from "../../core/errors.js";

export interface BaseRecordReaderOptions {
  source: BaseSource;
  fields?: string[];
  larkCliPath?: string;
}

export async function readBaseRecordsFromLark(options: BaseRecordReaderOptions): Promise<BaseRecord[]> {
  const records: BaseRecord[] = [];
  const limit = 200;
  for (let offset = 0; ; offset += limit) {
    const page = readBaseRecordPage(options, offset, limit);
    records.push(...page);
    if (page.length < limit) return records;
  }
}

function readBaseRecordPage(
  options: BaseRecordReaderOptions,
  offset: number,
  limit: number,
): BaseRecord[] {
  const args = [
    "base",
    "+record-list",
    "--base-token",
    options.source.baseToken,
    "--table-id",
    options.source.tableId,
    "--format",
    "json",
    "--limit",
    String(limit),
    "--offset",
    String(offset),
  ];
  if (options.source.viewId) {
    args.push("--view-id", options.source.viewId);
  }
  for (const field of options.fields ?? []) {
    args.push("--field-id", field);
  }

  let raw: string;
  try {
    raw = execFileSync(options.larkCliPath ?? "lark-cli", args, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error: any) {
    throw new CliError(
      "BASE_RECORD_READ_FAILED",
      error?.message ?? "failed to read Feishu Base records",
      EXIT_CODES.GENERIC,
    );
  }

  return normalizeRecordList(raw);
}

function normalizeRecordList(raw: string): BaseRecord[] {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError(
      "BASE_RECORD_JSON_INVALID",
      "lark-cli returned invalid JSON for Base records",
      EXIT_CODES.GENERIC,
    );
  }

  const records = findRecords(parsed);
  return records.map((record: any) => ({
    recordId: String(record.record_id ?? record.recordId ?? record.id ?? ""),
    fields: normalizeFields(record.fields ?? record.field_values ?? {}),
  }));
}

function findRecords(parsed: any): any[] {
  if (Array.isArray(parsed)) return parsed;
  const candidates = [
    parsed?.data?.items,
    parsed?.data?.records,
    parsed?.items,
    parsed?.records,
    parsed?.data?.list,
  ];
  const records = candidates.find(Array.isArray);
  if (!records) {
    throw new CliError(
      "BASE_RECORD_SHAPE_UNSUPPORTED",
      "lark-cli Base record JSON shape is unsupported",
      EXIT_CODES.GENERIC,
    );
  }
  return records;
}

function normalizeFields(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, normalizeFieldValue(value)]),
  );
}

function normalizeFieldValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeFieldValue(item));
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.text === "string") return object.text;
    if (typeof object.name === "string") return object.name;
    if (typeof object.url === "string") return object.url;
  }
  return value;
}
