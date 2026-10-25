#!/usr/bin/env node
import { resolve } from "path";
import { parseArgs } from "./config.js";
import { isGitRepo } from "./git.js";
import { dig, findOne } from "./dig.js";
import { excavate, isExcavationAvailable } from "./excavate.js";
import { renderFind, renderMap } from "./report.js";
import type { ArchaeologicalReport } from "./types.js";

async function runScan(command: Extract<ReturnType<typeof parseArgs>, { command: "scan" }>): Promise<void> {
  const dir = resolve(command.dir);
  if (!(await isGitRepo(dir))) {
    console.error(`${dir} isn't a git repository, codedig needs real commit history to date its finds`);
    process.exitCode = 1;
    return;
  }

  const finds = await dig(dir);

  if (command.json) {
    console.log(JSON.stringify(finds, null, 2));
    return;
  }

  console.log(renderMap(finds));
}

async function runInspect(command: Extract<ReturnType<typeof parseArgs>, { command: "inspect" }>): Promise<void> {
  const dir = resolve(command.dir);
  if (!(await isGitRepo(dir))) {
    console.error(`${dir} isn't a git repository, codedig needs real commit history to date its finds`);
    process.exitCode = 1;
    return;
  }

  const result = await findOne(dir, command.file, command.name);
  if (!result) {
    console.error(`couldn't find a function, class, or constant named "${command.name}" in ${command.file}`);
    process.exitCode = 1;
    return;
  }

  let report: ArchaeologicalReport | null = null;
  if (isExcavationAvailable()) {
    try {
      report = await excavate(result.find);
    } catch (err) {
      console.error(`claude excavation failed, falling back to raw evidence: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (command.json) {
    console.log(JSON.stringify({ find: result.find, report }, null, 2));
    return;
  }

  console.log(renderFind(result.find, report));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let command: ReturnType<typeof parseArgs>;
  try {
    command = parseArgs(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }
  if (!command) return;

  if (command.command === "scan") await runScan(command);
  else await runInspect(command);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
