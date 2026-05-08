import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { SKILL_FILES } from "./skills-content.js";

export async function runSkillsInstall(destDir: string): Promise<void> {
  for (const [relPath, content] of Object.entries(SKILL_FILES)) {
    const full = join(destDir, relPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
}
