import { test, expect } from "bun:test";
import { CliError } from "../../src/core/errors";
import { mapBaseRecordToDraft, type ProductImportMapping } from "../../src/lib/product-import/mapping";

const mapping: ProductImportMapping = {
  spu: {
    name: "商品名称",
    subtitle: "副标题",
    categoryPath: "分类路径",
    mainImages: "主图",
  },
  sku: {
    specName: "规格",
    price: "售价",
    originalPrice: "划线价",
    stockQty: "库存",
  },
  detail: {
    sellingPoints: "卖点",
    detailImages: "详情图",
    specAttrs: "规格参数",
    purchaseNotice: "购买须知",
  },
  display: {
    homeRecommendation: true,
    categoryListing: true,
    frontendTag: "RECOMMEND",
  },
};

test("maps explicit Base fields into ProductImportDraft", () => {
  const draft = mapBaseRecordToDraft({
    recordId: "rec1",
    fields: {
      商品名称: "耀莱月饼",
      副标题: "中秋礼盒",
      分类路径: "礼品/食品/月饼",
      主图: "https://example.com/a.jpg, https://example.com/b.jpg",
      规格: "礼盒",
      售价: "199.00",
      划线价: "299.00",
      库存: "20",
      卖点: "宫廷配方;顺丰包邮",
      详情图: "https://example.com/detail.jpg",
      规格参数: "{\"净含量\":\"800g\"}",
      购买须知: "{\"delivery\":\"48小时内发货\"}",
    },
  }, mapping);

  expect(draft.sourceRecordId).toBe("rec1");
  expect(draft.spu.name).toBe("耀莱月饼");
  expect(draft.spu.categoryPath).toEqual(["礼品", "食品", "月饼"]);
  expect(draft.spu.mainImages).toEqual([
    "https://example.com/a.jpg",
    "https://example.com/b.jpg",
  ]);
  expect(draft.skus[0]).toMatchObject({
    specName: "礼盒",
    price: 199,
    originalPrice: 299,
    stockQty: 20,
  });
  expect(draft.detail?.sellingPoints).toEqual([{ text: "宫廷配方" }, { text: "顺丰包邮" }]);
  expect(draft.detail?.specAttrs).toEqual([{ name: "净含量", value: "800g" }]);
  expect(draft.display?.homeRecommendation).toBe(true);
});

test("parses single text field containing structured JSON", () => {
  const draft = mapBaseRecordToDraft({
    recordId: "rec1",
    fields: {
      文本: JSON.stringify({
        externalProductCode: "EXT-1",
        spu: {
          name: "耀莱月饼",
          subtitle: "中秋礼盒",
          categoryPath: ["礼品", "月饼"],
          mainImages: ["https://example.com/a.jpg"],
        },
        skus: [{ specName: "礼盒", price: 199, stockQty: 20 }],
      }),
    },
  }, mapping);

  expect(draft.externalProductCode).toBe("EXT-1");
  expect(draft.spu.name).toBe("耀莱月饼");
  expect(draft.skus[0].specName).toBe("礼盒");
});

test("reports missing required mapped fields", () => {
  try {
    mapBaseRecordToDraft({
      recordId: "rec1",
      fields: { 商品名称: "耀莱月饼" },
    }, mapping);
    throw new Error("expected mapping to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(CliError);
    expect((error as CliError).code).toBe("PRODUCT_IMPORT_MAPPING_FIELD_MISSING");
  }
});
