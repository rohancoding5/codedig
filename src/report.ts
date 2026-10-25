import type { ArchaeologicalReport, Find } from "./types.js";

export function renderFind(find: Find, report: ArchaeologicalReport | null): string {
  const lines: string[] = [];
  lines.push("ARCHAEOLOGICAL FIND");
  lines.push("");
  lines.push(`Name: ${find.name} (${find.kind})`);
  lines.push(`Location: ${find.file}:${find.line}`);
  lines.push(`Last modified: ${find.lastModifiedDaysAgo === null ? "unknown" : `${find.lastModifiedDaysAgo} days ago`}`);
  lines.push(`References: ${find.referenceCount}`);
  lines.push(`Documentation: ${find.hasDocumentation ? "yes" : "no"}`);
  lines.push(`Dependencies (files that import ${find.file}): ${find.dependents.length ? find.dependents.join(", ") : "none"}`);
  lines.push(`Probability of being obsolete: ${find.obsoleteScore}%`);
  lines.push("");

  if (report) {
    lines.push("Possible historical purpose");
    lines.push(`  ${report.possibleHistoricalPurpose}`);
    lines.push("");
    lines.push(`Recommendation: ${report.recommendation}`);
    lines.push("");
    lines.push("Reasoning");
    lines.push(`  ${report.reasoning}`);
  } else {
    lines.push("Possible historical purpose");
    lines.push("  no ANTHROPIC_API_KEY set, so codedig only gathered evidence and skipped the historical guess");
    lines.push("  set ANTHROPIC_API_KEY to get a possible purpose and an ARCHIVE or KEEP recommendation");
  }

  return lines.join("\n");
}

export function renderMap(finds: Find[]): string {
  if (finds.length === 0) {
    return "no archaeological finds. everything in this repo appears to have real references, recent activity, or both.";
  }

  const lines: string[] = [];
  lines.push(`ARCHAEOLOGICAL MAP -- ${finds.length} find${finds.length === 1 ? "" : "s"}, ranked by probability of being obsolete`);
  lines.push("");

  for (const find of finds) {
    const age = find.lastModifiedDaysAgo === null ? "unknown age" : `${find.lastModifiedDaysAgo}d ago`;
    lines.push(
      `[${find.obsoleteScore}%] ${find.name} (${find.kind})  ${find.file}:${find.line}  refs=${find.referenceCount}  ${age}  doc=${find.hasDocumentation ? "y" : "n"}`,
    );
  }

  lines.push("");
  lines.push(`run "codedig inspect <name> --file <path>" on any find above for a full report.`);

  return lines.join("\n");
}
