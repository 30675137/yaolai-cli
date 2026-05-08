import { test, expect, beforeEach } from "bun:test";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runSkillsInstall } from "../../../src/commands/skills";

let dest: string;
beforeEach(() => {
  dest = mkdtempSync(join(tmpdir(), "yaolai-skills-"));
});

test("install writes 4 skills to dest with SKILL.md each", async () => {
  await runSkillsInstall(dest);
  ["yaolai-goods-list", "yaolai-goods-get", "yaolai-orders-list", "yaolai-payments-status"].forEach((s) => {
    expect(existsSync(join(dest, s, "SKILL.md"))).toBe(true);
  });
});

test("installed SKILL.md contains expected frontmatter", async () => {
  await runSkillsInstall(dest);
  const content = readFileSync(join(dest, "yaolai-goods-list", "SKILL.md"), "utf8");
  expect(content).toContain("name: yaolai-goods-list");
  expect(content).toContain("version: 0.1.0");
  expect(content).toContain("yaolai goods list");
});

test("install is idempotent (overwrites existing)", async () => {
  await runSkillsInstall(dest);
  await runSkillsInstall(dest);
  expect(existsSync(join(dest, "yaolai-goods-list", "SKILL.md"))).toBe(true);
});
