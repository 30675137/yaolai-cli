import { test, expect } from "bun:test";
import { renderTable, renderJson } from "../../../src/core/output";

test("renderJson returns compact stringified JSON", () => {
  expect(renderJson({ a: 1, b: "x" })).toBe('{"a":1,"b":"x"}');
});

test("renderJson handles arrays and nested", () => {
  expect(renderJson([{ id: 1 }, { id: 2 }])).toBe('[{"id":1},{"id":2}]');
});

test("renderJson handles null and undefined", () => {
  expect(renderJson(null)).toBe("null");
});

test("renderTable renders with headers", () => {
  const out = renderTable(["ID", "Name"], [["1", "Alice"], ["2", "Bob"]]);
  expect(out).toContain("ID");
  expect(out).toContain("Name");
  expect(out).toContain("Alice");
  expect(out).toContain("Bob");
});

test("renderTable handles empty rows (only headers)", () => {
  const out = renderTable(["ID", "Status"], []);
  expect(out).toContain("ID");
  expect(out).toContain("Status");
});

test("renderTable handles single row", () => {
  const out = renderTable(["X"], [["v1"]]);
  expect(out).toContain("v1");
});
