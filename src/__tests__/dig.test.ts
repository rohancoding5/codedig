import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { dig, findOne } from "../dig.js";
import { withTempDir } from "./test-utils.js";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[], env: NodeJS.ProcessEnv = {}): Promise<void> {
  await execFileAsync("git", args, { cwd, env: { ...process.env, ...env } });
}

async function initRepo(dir: string): Promise<void> {
  await git(dir, ["init", "-q", "-b", "main"]);
  await git(dir, ["config", "user.email", "test@example.com"]);
  await git(dir, ["config", "user.name", "test"]);
}

async function buildDemoRepo(dir: string): Promise<void> {
  await initRepo(dir);
  await mkdir(join(dir, "src"));

  await writeFile(join(dir, "src", "legacy.ts"), "export function legacyRenderer(node) {\n  return node;\n}\n");
  const oldDate = "2024-01-01T00:00:00";
  await git(dir, ["add", "-A"]);
  await git(dir, ["commit", "-q", "-m", "add legacy renderer"], {
    GIT_AUTHOR_DATE: oldDate,
    GIT_COMMITTER_DATE: oldDate,
  });

  await writeFile(
    join(dir, "src", "active.ts"),
    "export function activeHelper(node) {\n  return node;\n}\nactiveHelper(1);\nactiveHelper(2);\nactiveHelper(3);\nactiveHelper(4);\n",
  );
  await git(dir, ["add", "-A"]);
  await git(dir, ["commit", "-q", "-m", "add active helper"]);
}

test("dig finds the unreferenced legacy function and excludes the actively used one", async () => {
  await withTempDir(async (dir) => {
    await buildDemoRepo(dir);
    const finds = await dig(dir);

    assert.equal(finds.length, 1);
    assert.equal(finds[0].name, "legacyRenderer");
    assert.equal(finds[0].referenceCount, 0);
    assert.ok(finds[0].lastModifiedDaysAgo !== null && finds[0].lastModifiedDaysAgo > 300);
    assert.ok(finds[0].obsoleteScore > 80);
  });
});

test("dig ranks finds by obsolete score, most obsolete first", async () => {
  await withTempDir(async (dir) => {
    await initRepo(dir);
    await mkdir(join(dir, "src"));
    await writeFile(
      join(dir, "src", "a.ts"),
      "/**\n * documented and recently touched\n */\nfunction recentlyDocumented() {}\n",
    );
    await writeFile(join(dir, "src", "b.ts"), "function oldAndBare() {}\n");
    await git(dir, ["add", "-A"]);
    await git(dir, ["commit", "-q", "-m", "add both"]);

    const finds = await dig(dir);
    assert.equal(finds.length, 2);
    assert.ok(finds[0].obsoleteScore >= finds[1].obsoleteScore);
    assert.equal(finds[0].name, "oldAndBare");
  });
});

test("findOne returns a full report for a specific declaration", async () => {
  await withTempDir(async (dir) => {
    await buildDemoRepo(dir);
    const result = await findOne(dir, "src/legacy.ts", "legacyRenderer");
    assert.ok(result);
    assert.equal(result?.find.name, "legacyRenderer");
    assert.equal(result?.find.file, "src/legacy.ts");
  });
});

test("findOne returns null for a name that doesn't exist in the given file", async () => {
  await withTempDir(async (dir) => {
    await buildDemoRepo(dir);
    const result = await findOne(dir, "src/legacy.ts", "doesNotExist");
    assert.equal(result, null);
  });
});

test("findOne returns null for a file that doesn't exist", async () => {
  await withTempDir(async (dir) => {
    await buildDemoRepo(dir);
    const result = await findOne(dir, "src/nope.ts", "legacyRenderer");
    assert.equal(result, null);
  });
});
