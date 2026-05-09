import { CliError, EXIT_CODES } from "../../core/errors.js";

export interface ProductImportMapping {
  spu: {
    name: string;
    subtitle?: string;
    categoryPath: string;
    mainImages: string;
  };
  sku: {
    specName: string;
    price: string;
    originalPrice?: string;
    stockQty: string;
  };
  detail?: {
    sellingPoints?: string;
    detailImages?: string;
    specAttrs?: string;
    purchaseNotice?: string;
  };
  display?: ProductDisplayDraft;
}

export interface BaseRecord {
  recordId: string;
  fields: Record<string, unknown>;
}

export interface ProductImportDraft {
  sourceRecordId: string;
  externalProductCode?: string;
  spu: {
    name: string;
    subtitle?: string;
    categoryPath: string[];
    mainImages: string[];
  };
  skus: Array<{
    specName: string;
    price: number;
    originalPrice?: number;
    stockQty: number;
    sortOrder?: number;
  }>;
  detail?: {
    sellingPoints?: Array<{ text: string }>;
    detailImages?: Array<{ url: string }>;
    specAttrs?: Array<{ name: string; value: string }>;
    purchaseNotice?: Record<string, unknown>;
  };
  display?: ProductDisplayDraft;
}

export interface ProductDisplayDraft {
  homeRecommendation?: boolean;
  categoryListing?: boolean;
  frontendTag?: "RECOMMEND" | "NEW" | "HOT";
}

export function mapBaseRecordToDraft(
  record: BaseRecord,
  mapping: ProductImportMapping,
): ProductImportDraft {
  const structured = parseStructuredText(record);
  if (structured) {
    return { sourceRecordId: record.recordId, ...structured };
  }

  const name = requiredString(record.fields, mapping.spu.name);
  const categoryPath = splitList(requiredString(record.fields, mapping.spu.categoryPath), /[/>]/);
  const mainImages = splitList(requiredString(record.fields, mapping.spu.mainImages), /[,;\n]/);
  const specName = requiredString(record.fields, mapping.sku.specName);
  const price = requiredNumber(record.fields, mapping.sku.price);
  const originalPrice = mapping.sku.originalPrice
    ? optionalNumber(record.fields, mapping.sku.originalPrice)
    : undefined;
  const stockQty = requiredInteger(record.fields, mapping.sku.stockQty);

  return {
    sourceRecordId: record.recordId,
    spu: {
      name,
      subtitle: mapping.spu.subtitle ? optionalString(record.fields, mapping.spu.subtitle) : undefined,
      categoryPath,
      mainImages,
    },
    skus: [{ specName, price, originalPrice, stockQty }],
    detail: mapDetail(record.fields, mapping.detail),
    display: mapping.display,
  };
}

function parseStructuredText(record: BaseRecord): Omit<ProductImportDraft, "sourceRecordId"> | null {
  const onlyText = record.fields["文本"];
  if (Object.keys(record.fields).length !== 1 || typeof onlyText !== "string" || !onlyText.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(onlyText) as Omit<ProductImportDraft, "sourceRecordId">;
    if (!parsed.spu || !Array.isArray(parsed.skus)) {
      throw new Error("missing spu/skus");
    }
    return parsed;
  } catch {
    throw new CliError(
      "PRODUCT_IMPORT_TEXT_JSON_INVALID",
      "single 文本 field must contain structured product JSON",
      EXIT_CODES.INVALID_ARG,
      "",
      { recordId: record.recordId },
    );
  }
}

function mapDetail(
  fields: Record<string, unknown>,
  detail?: ProductImportMapping["detail"],
): ProductImportDraft["detail"] {
  if (!detail) return undefined;
  const sellingPoints = detail.sellingPoints
    ? splitList(optionalString(fields, detail.sellingPoints) ?? "", /[;\n]/).map((text) => ({ text }))
    : undefined;
  const detailImages = detail.detailImages
    ? splitList(optionalString(fields, detail.detailImages) ?? "", /[,;\n]/).map((url) => ({ url }))
    : undefined;
  const specAttrs = detail.specAttrs ? parseSpecAttrs(optionalString(fields, detail.specAttrs)) : undefined;
  const purchaseNotice = detail.purchaseNotice
    ? parseObject(optionalString(fields, detail.purchaseNotice))
    : undefined;
  return { sellingPoints, detailImages, specAttrs, purchaseNotice };
}

function requiredString(fields: Record<string, unknown>, field: string): string {
  const value = optionalString(fields, field);
  if (!value) {
    throw new CliError(
      "PRODUCT_IMPORT_MAPPING_FIELD_MISSING",
      `missing required source field: ${field}`,
      EXIT_CODES.INVALID_ARG,
      "",
      { field },
    );
  }
  return value;
}

function optionalString(fields: Record<string, unknown>, field: string): string | undefined {
  const raw = fields[field];
  if (raw === null || raw === undefined) return undefined;
  if (Array.isArray(raw)) return raw.map(String).join(",");
  const value = String(raw).trim();
  return value ? value : undefined;
}

function requiredNumber(fields: Record<string, unknown>, field: string): number {
  const value = optionalNumber(fields, field);
  if (value === undefined) {
    throw new CliError(
      "PRODUCT_IMPORT_MAPPING_FIELD_MISSING",
      `missing required numeric source field: ${field}`,
      EXIT_CODES.INVALID_ARG,
      "",
      { field },
    );
  }
  return value;
}

function optionalNumber(fields: Record<string, unknown>, field: string): number | undefined {
  const value = optionalString(fields, field);
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new CliError("PRODUCT_IMPORT_FIELD_INVALID", `invalid number: ${field}`, EXIT_CODES.INVALID_ARG);
  }
  return n;
}

function requiredInteger(fields: Record<string, unknown>, field: string): number {
  const value = requiredNumber(fields, field);
  if (!Number.isInteger(value)) {
    throw new CliError("PRODUCT_IMPORT_FIELD_INVALID", `invalid integer: ${field}`, EXIT_CODES.INVALID_ARG);
  }
  return value;
}

function splitList(value: string, separator: RegExp): string[] {
  return value.split(separator).map((x) => x.trim()).filter(Boolean);
}

function parseSpecAttrs(value?: string): Array<{ name: string; value: string }> | undefined {
  const object = parseObject(value);
  if (!object) return undefined;
  return Object.entries(object).map(([name, v]) => ({ name, value: String(v) }));
}

function parseObject(value?: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    throw new CliError("PRODUCT_IMPORT_FIELD_INVALID", "expected JSON object", EXIT_CODES.INVALID_ARG);
  }
}
