import { test } from "node:test";
import assert from "node:assert/strict";
import { countReferences } from "../references.js";
import type { Declaration } from "../types.js";

function declarationAt(file: string, line: number, name: string): Declaration {
  return { name, kind: "function", file, line, hasDocumentation: false, snippet: "" };
}

test("countReferences excludes the declaring line itself", () => {
  const files = [{ path: "a.ts", content: "function legacyRenderer(x) {\n  return x;\n}\n" }];
  const count = countReferences(files, declarationAt("a.ts", 1, "legacyRenderer"));
  assert.equal(count, 0);
});

test("countReferences counts real call sites in other files", () => {
  const files = [
    { path: "a.ts", content: "export function legacyRenderer(x) {\n  return x;\n}\n" },
    { path: "b.ts", content: "import { legacyRenderer } from './a.js';\nlegacyRenderer(1);\n" },
  ];
  const count = countReferences(files, declarationAt("a.ts", 1, "legacyRenderer"));
  assert.equal(count, 2);
});

test("countReferences uses word boundaries, not substring matches", () => {
  const files = [
    { path: "a.ts", content: "function foo(x) {\n  return x;\n}\n" },
    { path: "b.ts", content: "function fooBar() {}\nfooBar();\n" },
  ];
  const count = countReferences(files, declarationAt("a.ts", 1, "foo"));
  assert.equal(count, 0);
});

test("countReferences counts multiple occurrences on the same line", () => {
  const files = [
    { path: "a.ts", content: "function foo(x) {\n  return x;\n}\n" },
    { path: "b.ts", content: "const a = foo(1) + foo(2);\n" },
  ];
  const count = countReferences(files, declarationAt("a.ts", 1, "foo"));
  assert.equal(count, 2);
});
