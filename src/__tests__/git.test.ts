import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isGitRepo, repoRoot, lastModified, showCommit } from "../git.js";
import { withTempDir } from "./test-utils.js";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", args, { cwd });
}

async function initRepo(dir: string): Promise<void> {
  await git(dir, ["init", "-q", "-b", "main"]);
  await git(dir, ["config", "user.email", "test@example.com"]);
  await git(dir, ["config", "user.name", "test"]);
}

test("isGitRepo returns false for a plain directory", async () => {
  await withTempDir(async (dir) => {
    assert.equal(await isGitRepo(dir), false);
  });
});

test("isGitRepo returns true after git init", async () => {
  await withTempDir(async (dir) => {
    await initRepo(dir);
    assert.equal(await isGitRepo(dir), true);
  });
});

test("repoRoot resolves to the top of the working tree", async () => {
  await withTempDir(async (dir) => {
    await initRepo(dir);
    const { realpathSync } = await import("node:fs");
    assert.equal(realpathSync(await repoRoot(dir)), realpathSync(dir));
  });
});

test("lastModified finds the most recent commit that touched a file", async () => {
  await withTempDir(async (dir) => {
    await initRepo(dir);
    await writeFile(join(dir, "a.ts"), "function foo() {}\n");
    await git(dir, ["add", "a.ts"]);
    await git(dir, ["commit", "-q", "-m", "add foo"]);

    const result = await lastModified(dir, "a.ts");
    assert.ok(result);
    assert.match(result?.hash ?? "", /^[0-9a-f]{40}$/);
    assert.match(result?.date ?? "", /^\d{4}-\d{2}-\d{2}$/);
    assert.ok((result?.daysAgo ?? -1) <= 1);
  });
});

test("lastModified with a symbol only matches commits that changed that symbol's occurrence count", async () => {
  await withTempDir(async (dir) => {
    await initRepo(dir);
    await writeFile(join(dir, "a.ts"), "function foo() {}\n");
    await git(dir, ["add", "a.ts"]);
    await git(dir, ["commit", "-q", "-m", "add foo"]);
    await writeFile(join(dir, "a.ts"), "function foo() {}\nfunction bar() {}\n");
    await git(dir, ["add", "a.ts"]);
    await git(dir, ["commit", "-q", "-m", "add bar, unrelated to foo"]);

    const result = await lastModified(dir, "a.ts", "foo");
    assert.ok(result);
  });
});

test("lastModified computes days ago relative to a given now", async () => {
  await withTempDir(async (dir) => {
    await initRepo(dir);
    await writeFile(join(dir, "a.ts"), "export {}");
    await git(dir, ["add", "a.ts"]);
    await git(dir, ["commit", "-q", "-m", "initial"]);

    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const result = await lastModified(dir, "a.ts", undefined, future);
    assert.ok((result?.daysAgo ?? 0) >= 9);
  });
});

test("lastModified returns null for a file with no history", async () => {
  await withTempDir(async (dir) => {
    await initRepo(dir);
    const result = await lastModified(dir, "nonexistent.ts");
    assert.equal(result, null);
  });
});

test("showCommit returns the diff for a real commit", async () => {
  await withTempDir(async (dir) => {
    await initRepo(dir);
    await writeFile(join(dir, "a.ts"), "export const a = 1;");
    await git(dir, ["add", "a.ts"]);
    await git(dir, ["commit", "-q", "-m", "add a"]);
    const result = await lastModified(dir, "a.ts");

    const output = await showCommit(dir, result?.hash ?? "");
    assert.match(output, /add a/);
  });
});

test("showCommit returns an empty string for a bogus hash instead of throwing", async () => {
  await withTempDir(async (dir) => {
    await initRepo(dir);
    assert.equal(await showCommit(dir, "not-a-real-hash"), "");
  });
});
