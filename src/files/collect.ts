import { readdir, readFile } from "fs/promises";
import { join, extname, relative } from "path";
import type { SourceFile } from "../types.js";

const DEFAULT_IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", "out"]);
const DEFAULT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]);
const MAX_FILE_BYTES = 512 * 1024;

export async function collectFiles(root: string, extensions: Set<string> = DEFAULT_EXTENSIONS): Promise<SourceFile[]> {
  const results: SourceFile[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }

      if (!extensions.has(extname(entry.name))) continue;

      try {
        const content = await readFile(fullPath, "utf8");
        if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) continue;
        results.push({ path: relative(root, fullPath), content });
      } catch {
        continue;
      }
    }
  }

  await walk(root);
  return results;
}
