import { collectFiles } from "./files/collect.js";
import { extractDeclarations } from "./declarations.js";
import { countReferences } from "./references.js";
import { buildDependencyGraph, dependentsOf } from "./dependencies.js";
import { lastModified } from "./git.js";
import { obsoleteScore } from "./score.js";
import type { Find, SourceFile } from "./types.js";

const MAX_REFERENCE_COUNT_TO_CONSIDER = 3;

export async function dig(cwd: string): Promise<Find[]> {
  const files = await collectFiles(cwd);
  const graph = buildDependencyGraph(files);
  const declarations = files.flatMap((file) => extractDeclarations(file));

  const finds: Find[] = [];

  for (const declaration of declarations) {
    const referenceCount = countReferences(files, declaration);
    if (referenceCount > MAX_REFERENCE_COUNT_TO_CONSIDER) continue;

    const dependents = dependentsOf(graph, declaration.file);
    const modified = await lastModified(cwd, declaration.file, declaration.name);

    finds.push({
      name: declaration.name,
      kind: declaration.kind,
      file: declaration.file,
      line: declaration.line,
      lastModifiedDaysAgo: modified?.daysAgo ?? null,
      lastModifiedCommit: modified?.hash ?? null,
      referenceCount,
      hasDocumentation: declaration.hasDocumentation,
      dependents,
      obsoleteScore: obsoleteScore({
        referenceCount,
        lastModifiedDaysAgo: modified?.daysAgo ?? null,
        hasDocumentation: declaration.hasDocumentation,
        dependentCount: dependents.length,
      }),
      snippet: declaration.snippet,
    });
  }

  return finds.sort((a, b) => b.obsoleteScore - a.obsoleteScore);
}

export async function findOne(cwd: string, file: string, name: string): Promise<{ find: Find; files: SourceFile[] } | null> {
  const files = await collectFiles(cwd);
  const target = files.find((f) => f.path === file);
  if (!target) return null;

  const declarations = extractDeclarations(target).filter((declaration) => declaration.name === name);
  if (declarations.length === 0) return null;
  const declaration = declarations[0];

  const graph = buildDependencyGraph(files);
  const referenceCount = countReferences(files, declaration);
  const dependents = dependentsOf(graph, declaration.file);
  const modified = await lastModified(cwd, declaration.file, declaration.name);

  const find: Find = {
    name: declaration.name,
    kind: declaration.kind,
    file: declaration.file,
    line: declaration.line,
    lastModifiedDaysAgo: modified?.daysAgo ?? null,
    lastModifiedCommit: modified?.hash ?? null,
    referenceCount,
    hasDocumentation: declaration.hasDocumentation,
    dependents,
    obsoleteScore: obsoleteScore({
      referenceCount,
      lastModifiedDaysAgo: modified?.daysAgo ?? null,
      hasDocumentation: declaration.hasDocumentation,
      dependentCount: dependents.length,
    }),
    snippet: declaration.snippet,
  };

  return { find, files };
}
