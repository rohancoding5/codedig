import type { Declaration, SourceFile } from "./types.js";

function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function countReferences(files: SourceFile[], declaration: Declaration): number {
  const pattern = new RegExp(`\\b${escapeRegex(declaration.name)}\\b`, "g");
  let count = 0;

  for (const file of files) {
    if (file.path !== declaration.file) {
      const matches = file.content.match(pattern);
      count += matches ? matches.length : 0;
      continue;
    }

    const lines = file.content.split("\n");
    lines.forEach((line, index) => {
      if (index === declaration.line - 1) return;
      const matches = line.match(pattern);
      count += matches ? matches.length : 0;
    });
  }

  return count;
}
