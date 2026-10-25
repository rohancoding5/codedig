import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDependencyGraph, dependentsOf, extractImports } from "../dependencies.js";

test("extractImports finds js import specifiers", () => {
  const specifiers = extractImports("import { foo } from './foo.js';\nimport bar from '../bar.js';\n", "js");
  assert.deepEqual(specifiers.sort(), ["../bar.js", "./foo.js"]);
});

test("extractImports finds python import specifiers", () => {
  const specifiers = extractImports("from pkg.mod import thing\nimport pkg.other\n", "python");
  assert.deepEqual(specifiers.sort(), ["pkg.mod", "pkg.other"]);
});

test("dependentsOf finds every file that imports a given path", () => {
  const files = [
    { path: "src/legacy.ts", content: "export function foo() {}\n" },
    { path: "src/user.ts", content: "import { foo } from './legacy.js';\nfoo();\n" },
    { path: "src/unrelated.ts", content: "export const x = 1;\n" },
  ];
  const graph = buildDependencyGraph(files);
  assert.deepEqual(dependentsOf(graph, "src/legacy.ts"), ["src/user.ts"]);
});

test("dependentsOf resolves a NodeNext style .js specifier back to its .ts source", () => {
  const files = [
    { path: "src/legacy.ts", content: "export function foo() {}\n" },
    { path: "src/user.ts", content: "import { foo } from './legacy.js';\nfoo();\n" },
  ];
  const graph = buildDependencyGraph(files);
  assert.deepEqual(dependentsOf(graph, "src/legacy.ts"), ["src/user.ts"]);
});

test("dependentsOf returns an empty array for a file nothing imports", () => {
  const files = [
    { path: "src/legacy.ts", content: "export function foo() {}\n" },
    { path: "src/unrelated.ts", content: "export const x = 1;\n" },
  ];
  const graph = buildDependencyGraph(files);
  assert.deepEqual(dependentsOf(graph, "src/legacy.ts"), []);
});
