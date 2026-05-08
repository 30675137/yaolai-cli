import { Command } from "commander";

export const VERSION = "0.1.0";

export function registerVersion(program: Command): void {
  program
    .command("version")
    .description("显示 CLI 版本")
    .action(() => {
      console.log(`v${VERSION}`);
    });
}
