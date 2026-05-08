import { test, expect } from "bun:test";
import { CliError, EXIT_CODES, formatErrorOutput } from "../../../src/core/errors";

test("CliError carries code, message, exitCode, traceId, details", () => {
  const e = new CliError("ORDER_NOT_FOUND", "订单不存在", 4, "trace-1", { id: "X" });
  expect(e.code).toBe("ORDER_NOT_FOUND");
  expect(e.message).toBe("订单不存在");
  expect(e.exitCode).toBe(4);
  expect(e.traceId).toBe("trace-1");
  expect(e.details).toEqual({ id: "X" });
});

test("CliError defaults exitCode=GENERIC, traceId='', details={}", () => {
  const e = new CliError("X", "msg");
  expect(e.exitCode).toBe(EXIT_CODES.GENERIC);
  expect(e.traceId).toBe("");
  expect(e.details).toEqual({});
});

test("EXIT_CODES has all 6 standard codes (FR-022)", () => {
  expect(EXIT_CODES).toEqual({
    SUCCESS: 0,
    GENERIC: 1,
    INVALID_ARG: 2,
    AUTH_EXPIRED: 3,
    NOT_FOUND: 4,
    CONFLICT: 5,
  });
});

test("formatErrorOutput - human readable when json=false", () => {
  const out = formatErrorOutput(new CliError("ORDER_NOT_FOUND", "订单不存在", 4, "trace-1"), false);
  expect(out).toBe("Error: ORDER_NOT_FOUND - 订单不存在");
});

test("formatErrorOutput - JSON envelope when json=true", () => {
  const out = formatErrorOutput(
    new CliError("ORDER_NOT_FOUND", "订单不存在", 4, "trace-1", { id: "X" }),
    true,
  );
  const parsed = JSON.parse(out);
  expect(parsed).toEqual({
    code: "ORDER_NOT_FOUND",
    message: "订单不存在",
    trace_id: "trace-1",
    details: { id: "X" },
  });
});

test("formatErrorOutput JSON omits trailing newline", () => {
  const out = formatErrorOutput(new CliError("X", "y"), true);
  expect(out.endsWith("\n")).toBe(false);
});
