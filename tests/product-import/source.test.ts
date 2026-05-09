import { test, expect } from "bun:test";
import { CliError } from "../../src/core/errors";
import { hashBaseToken, parseBaseUrl } from "../../src/lib/base/source";

test("parseBaseUrl extracts base token table id and view id", () => {
  const parsed = parseBaseUrl(
    "https://j13juzq4tyn.feishu.cn/base/QQCtb4GmEa51jqsu6rncedJPnne?table=tblPxQRGmIxZcSuU&view=vewPQzgUPY",
  );

  expect(parsed.baseToken).toBe("QQCtb4GmEa51jqsu6rncedJPnne");
  expect(parsed.tableId).toBe("tblPxQRGmIxZcSuU");
  expect(parsed.viewId).toBe("vewPQzgUPY");
});

test("parseBaseUrl rejects URL without table id", () => {
  try {
    parseBaseUrl("https://j13juzq4tyn.feishu.cn/base/QQCtb4GmEa51jqsu6rncedJPnne");
    throw new Error("expected parseBaseUrl to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(CliError);
    expect((error as CliError).code).toBe("BASE_URL_TABLE_MISSING");
  }
});

test("hashBaseToken is stable and does not expose the original token", () => {
  const hash = hashBaseToken("QQCtb4GmEa51jqsu6rncedJPnne");

  expect(hash).toHaveLength(64);
  expect(hash).not.toContain("QQCtb4GmEa51jqsu6rncedJPnne");
  expect(hashBaseToken("QQCtb4GmEa51jqsu6rncedJPnne")).toBe(hash);
});
