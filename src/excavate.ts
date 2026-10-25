import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ArchaeologicalReportSchema } from "./schema.js";
import type { ArchaeologicalReport, Find } from "./types.js";

const SYSTEM_PROMPT = `You are a software archaeologist looking at a real dig site: a function, class, or constant that real analysis found has almost no references left in the codebase. You're given its code, real metrics about it (how many real references exist, how many other files import its file, whether it's documented, how long since it last changed), and the goal is to guess why it was built and whether it should be archived.

Rules:
- possibleHistoricalPurpose is a narrative guess, a couple sentences, at what this was probably for, based on the actual code and naming, not a generic description of what the code literally does line by line.
- recommendation is ARCHIVE or KEEP. Recommend KEEP when the evidence suggests this is still load bearing despite low reference counts (for example, an exported utility other files still import, an entry point, a plugin hook, test fixture, or something with a name suggesting it's part of a public API). Recommend ARCHIVE when the evidence points to genuinely stale, superseded, or forgotten code.
- reasoning explains the recommendation in a few sentences, tied to the actual evidence given (reference count, dependents, age, documentation), not vague hedging.
- If the evidence is genuinely ambiguous, say so honestly in reasoning, and lean towards KEEP, since archiving something still in use is worse than leaving something unused a little longer.`;

function formatEvidence(find: Find): string {
  const dependents = find.dependents.length ? find.dependents.join(", ") : "none";
  return [
    `Name: ${find.name} (${find.kind})`,
    `File: ${find.file}:${find.line}`,
    `Real references elsewhere in the codebase: ${find.referenceCount}`,
    `Other files that import this file: ${dependents}`,
    `Has a doc comment: ${find.hasDocumentation ? "yes" : "no"}`,
    `Last modified: ${find.lastModifiedDaysAgo === null ? "unknown" : `${find.lastModifiedDaysAgo} days ago`}${find.lastModifiedCommit ? ` (${find.lastModifiedCommit.slice(0, 8)})` : ""}`,
    "",
    "Code:",
    find.snippet,
  ].join("\n");
}

export async function excavate(find: Find, clientOptions?: ConstructorParameters<typeof Anthropic>[0]): Promise<ArchaeologicalReport> {
  const client = new Anthropic(clientOptions);
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: formatEvidence(find) }],
    output_config: { format: zodOutputFormat(ArchaeologicalReportSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("claude didn't return an archaeological report in the expected shape");
  }

  return response.parsed_output;
}

export function isExcavationAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
