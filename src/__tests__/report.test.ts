import { test } from "node:test";
import assert from "node:assert/strict";
import { renderFind, renderMap } from "../report.js";
import type { ArchaeologicalReport, Find } from "../types.js";

function find(overrides: Partial<Find> = {}): Find {
  return {
    name: "legacyRenderer",
    kind: "function",
    file: "src/render.ts",
    line: 12,
    lastModifiedDaysAgo: 400,
    lastModifiedCommit: "abcdef1234567890",
    referenceCount: 0,
    hasDocumentation: false,
    dependents: [],
    obsoleteScore: 90,
    snippet: "function legacyRenderer() {}",
    ...overrides,
  };
}

test("renderFind includes the name, location, and metrics", () => {
  const output = renderFind(find(), null);
  assert.match(output, /ARCHAEOLOGICAL FIND/);
  assert.match(output, /Name: legacyRenderer \(function\)/);
  assert.match(output, /Location: src\/render\.ts:12/);
  assert.match(output, /References: 0/);
  assert.match(output, /Probability of being obsolete: 90%/);
});

test("renderFind explains when no ANTHROPIC_API_KEY is set", () => {
  const output = renderFind(find(), null);
  assert.match(output, /ANTHROPIC_API_KEY/);
});

test("renderFind prints the synthesized report when one is present", () => {
  const report: ArchaeologicalReport = {
    possibleHistoricalPurpose: "probably an old rendering path before the redesign",
    recommendation: "ARCHIVE",
    reasoning: "zero references anywhere and no file imports it",
  };
  const output = renderFind(find(), report);
  assert.match(output, /probably an old rendering path/);
  assert.match(output, /Recommendation: ARCHIVE/);
  assert.match(output, /zero references anywhere/);
});

test("renderFind lists dependents when present", () => {
  const output = renderFind(find({ dependents: ["src/app.ts", "src/legacy.ts"] }), null);
  assert.match(output, /src\/app\.ts, src\/legacy\.ts/);
});

test("renderMap reports no finds when the list is empty", () => {
  assert.match(renderMap([]), /no archaeological finds/);
});

test("renderMap lists every find with its score", () => {
  const output = renderMap([find({ obsoleteScore: 90 }), find({ name: "otherHelper", obsoleteScore: 40 })]);
  assert.match(output, /2 finds/);
  assert.match(output, /\[90%\] legacyRenderer/);
  assert.match(output, /\[40%\] otherHelper/);
});
