// build.ts — 调 scripts/gen-skills.ts + bun build --compile 三平台单二进制
// FR-023, ADR-0017/0020, REQ-052 Task 16
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { generateSkillsContent } from "./scripts/gen-skills.ts";

const targets = [
  { target: "bun-darwin-arm64", outfile: "dist/yaolai-cli-darwin-arm64" },
  { target: "bun-linux-x64", outfile: "dist/yaolai-cli-linux-x64" },
  { target: "bun-windows-x64", outfile: "dist/yaolai-cli-windows-x64.exe" },
];

function compile(): void {
  mkdirSync("dist", { recursive: true });
  for (const t of targets) {
    console.log(`building ${t.target}...`);
    const r = spawnSync(
      "bun",
      [
        "build",
        "src/cli.ts",
        "--compile",
        "--minify",
        `--target=${t.target}`,
        `--outfile=${t.outfile}`,
      ],
      { stdio: "inherit" },
    );
    if (r.status !== 0) {
      console.error(`build failed for ${t.target}`);
      process.exit(1);
    }
  }
}

generateSkillsContent();
compile();
console.log("built dist/yaolai-cli-{darwin-arm64,linux-x64,windows-x64.exe}");
