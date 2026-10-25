import { extname } from "path";
import type { Declaration, DeclarationKind, SourceFile } from "./types.js";

const SNIPPET_LINES = 12;

const JS_FUNCTION_RE = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function(?:\s+\*?\s*|\s*\*\s*)([A-Za-z_$][\w$]*)\s*\(/;
const JS_CLASS_RE = /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/;
const JS_CONST_FN_RE = /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)\s*=>|function\b)/;

const PY_DEF_RE = /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/;
const PY_CLASS_RE = /^\s*class\s+([A-Za-z_]\w*)/;

function isJs(path: string): boolean {
  return [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(extname(path));
}

function isPython(path: string): boolean {
  return extname(path) === ".py";
}

function jsHasDocAbove(lines: string[], lineIndex: number): boolean {
  let i = lineIndex - 1;
  while (i >= 0 && lines[i].trim() === "") i -= 1;
  return i >= 0 && lines[i].trim().endsWith("*/");
}

function pyHasDocBelow(lines: string[], lineIndex: number): boolean {
  let i = lineIndex;
  while (i < lines.length && !lines[i].includes(":")) i += 1;
  i += 1;
  while (i < lines.length && lines[i].trim() === "") i += 1;
  if (i >= lines.length) return false;
  const trimmed = lines[i].trim();
  return trimmed.startsWith('"""') || trimmed.startsWith("'''");
}

function snippetAt(lines: string[], lineIndex: number): string {
  return lines.slice(lineIndex, Math.min(lines.length, lineIndex + SNIPPET_LINES)).join("\n");
}

export function extractDeclarations(file: SourceFile): Declaration[] {
  if (!isJs(file.path) && !isPython(file.path)) return [];

  const lines = file.content.split("\n");
  const declarations: Declaration[] = [];

  lines.forEach((line, index) => {
    let match: RegExpMatchArray | null = null;
    let kind: DeclarationKind | null = null;
    let hasDocumentation = false;

    if (isJs(file.path)) {
      if ((match = line.match(JS_FUNCTION_RE))) {
        kind = "function";
        hasDocumentation = jsHasDocAbove(lines, index);
      } else if ((match = line.match(JS_CLASS_RE))) {
        kind = "class";
        hasDocumentation = jsHasDocAbove(lines, index);
      } else if ((match = line.match(JS_CONST_FN_RE))) {
        kind = "const";
        hasDocumentation = jsHasDocAbove(lines, index);
      }
    } else {
      if ((match = line.match(PY_DEF_RE))) {
        kind = "function";
        hasDocumentation = pyHasDocBelow(lines, index);
      } else if ((match = line.match(PY_CLASS_RE))) {
        kind = "class";
        hasDocumentation = pyHasDocBelow(lines, index);
      }
    }

    if (match && kind) {
      declarations.push({
        name: match[1],
        kind,
        file: file.path,
        line: index + 1,
        hasDocumentation,
        snippet: snippetAt(lines, index),
      });
    }
  });

  return declarations;
}
