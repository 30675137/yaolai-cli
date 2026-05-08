#!/usr/bin/env bun
import { Command } from "commander";
import { registerVersion } from "./commands/version.js";

const program = new Command();
program.name("yaolai").description("耀莱商城运营 CLI").version("0.1.0");

registerVersion(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
