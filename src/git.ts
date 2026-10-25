import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer: 1024 * 1024 * 32 });
  return stdout;
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
    return true;
  } catch {
    return false;
  }
}

export async function repoRoot(cwd: string): Promise<string> {
  const output = await runGit(["rev-parse", "--show-toplevel"], cwd);
  return output.trim();
}

export type LastModified = {
  hash: string;
  date: string;
  daysAgo: number;
};

function daysBetween(dateStr: string, now: Date): number {
  const then = new Date(`${dateStr}T00:00:00Z`);
  const diffMs = now.getTime() - then.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export async function lastModified(cwd: string, path: string, symbol?: string, now: Date = new Date()): Promise<LastModified | null> {
  const args = symbol
    ? ["log", `-S${symbol}`, "--follow", "--date=short", "--pretty=format:%H\x1f%ad", "-n", "1", "--", path]
    : ["log", "--follow", "--date=short", "--pretty=format:%H\x1f%ad", "-n", "1", "--", path];

  try {
    const output = (await runGit(args, cwd)).trim();
    if (!output) return null;
    const [hash, date] = output.split("\x1f");
    if (!hash || !date) return null;
    return { hash, date, daysAgo: daysBetween(date, now) };
  } catch {
    return null;
  }
}

export async function showCommit(cwd: string, hash: string): Promise<string> {
  try {
    return await runGit(["show", "--stat", "-p", hash], cwd);
  } catch {
    return "";
  }
}
