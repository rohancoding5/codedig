import { dirname, join, normalize, extname } from "path";
import type { SourceFile } from "./types.js";

const JS_IMPORT_RE = /(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+(?:[\s\S]*?\s+from\s+)?|require\()\s*["'`]([^"'`]+)["'`]/g;
const PY_IMPORT_RE = /^\s*(?:from\s+([.\w]+)\s+import|import\s+([.\w]+))/gm;

export function extractImports(content: string, language: "js" | "python"): string[] {
  const imports: string[] = [];
  const pattern = language === "js" ? JS_IMPORT_RE : PY_IMPORT_RE;
  for (const match of content.matchAll(pattern)) {
    const specifier = language === "js" ? match[1] : (match[1] ?? match[2]);
    if (specifier) imports.push(specifier);
  }
  return imports;
}

function languageFor(path: string): "js" | "python" | "other" {
  const ext = extname(path);
  if (ext === ".py") return "python";
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "js";
  return "other";
}

function resolveJsSpecifier(fromPath: string, specifier: string, knownPaths: Set<string>): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const base = normalize(join(dirname(fromPath), specifier));
  const withoutExt = base.replace(/\.(js|jsx|mjs|cjs)$/, "");
  const candidates = [
    base,
    withoutExt,
    `${withoutExt}.ts`,
    `${withoutExt}.tsx`,
    `${withoutExt}.js`,
    `${withoutExt}.jsx`,
    join(withoutExt, "index.ts"),
    join(withoutExt, "index.tsx"),
    join(withoutExt, "index.js"),
  ];
  return candidates.find((candidate) => knownPaths.has(candidate));
}

function resolvePythonSpecifier(specifier: string, knownPaths: Set<string>): string | undefined {
  const asSuffix = `${specifier.replace(/\./g, "/")}.py`;
  for (const candidate of knownPaths) {
    if (candidate.endsWith(asSuffix)) return candidate;
  }
  return undefined;
}

export function buildDependencyGraph(files: SourceFile[]): Map<string, Set<string>> {
  const knownPaths = new Set(files.map((file) => file.path));
  const graph = new Map<string, Set<string>>();

  for (const file of files) {
    const language = languageFor(file.path);
    if (language === "other") {
      graph.set(file.path, new Set());
      continue;
    }

    const specifiers = extractImports(file.content, language);
    const resolved = new Set<string>();

    for (const specifier of specifiers) {
      const target =
        language === "js"
          ? resolveJsSpecifier(file.path, specifier, knownPaths)
          : resolvePythonSpecifier(specifier, knownPaths);
      if (target) resolved.add(target);
    }

    graph.set(file.path, resolved);
  }

  return graph;
}

export function dependentsOf(graph: Map<string, Set<string>>, path: string): string[] {
  const dependents: string[] = [];
  for (const [from, targets] of graph) {
    if (targets.has(path)) dependents.push(from);
  }
  return dependents.sort();
}
