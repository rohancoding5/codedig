import { test } from "node:test";
import assert from "node:assert/strict";
import { extractDeclarations } from "../declarations.js";

test("extractDeclarations finds a function declaration", () => {
  const declarations = extractDeclarations({ path: "a.ts", content: "export function legacyRenderer(x) {\n  return x;\n}\n" });
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].name, "legacyRenderer");
  assert.equal(declarations[0].kind, "function");
  assert.equal(declarations[0].line, 1);
});

test("extractDeclarations finds a class declaration", () => {
  const declarations = extractDeclarations({ path: "a.ts", content: "class LegacyWidget {\n  render() {}\n}\n" });
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].name, "LegacyWidget");
  assert.equal(declarations[0].kind, "class");
});

test("extractDeclarations finds a const arrow function", () => {
  const declarations = extractDeclarations({ path: "a.ts", content: "export const legacyHelper = (x) => x * 2;\n" });
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].name, "legacyHelper");
  assert.equal(declarations[0].kind, "const");
});

test("extractDeclarations does not treat a plain const value as a declaration", () => {
  const declarations = extractDeclarations({ path: "a.ts", content: "export const MAX_RETRIES = 3;\n" });
  assert.equal(declarations.length, 0);
});

test("extractDeclarations detects a JSDoc comment directly above a function", () => {
  const content = "/**\n * does the legacy thing\n */\nfunction legacyRenderer(x) {\n  return x;\n}\n";
  const declarations = extractDeclarations({ path: "a.ts", content });
  assert.equal(declarations[0].hasDocumentation, true);
});

test("extractDeclarations marks a function with no comment above as undocumented", () => {
  const content = "function legacyRenderer(x) {\n  return x;\n}\n";
  const declarations = extractDeclarations({ path: "a.ts", content });
  assert.equal(declarations[0].hasDocumentation, false);
});

test("extractDeclarations finds python functions and classes with docstrings", () => {
  const content = 'def legacy_helper(x):\n    """does the legacy thing"""\n    return x\n\n\nclass LegacyWidget:\n    def render(self):\n        pass\n';
  const declarations = extractDeclarations({ path: "a.py", content });
  const helper = declarations.find((d) => d.name === "legacy_helper");
  const widget = declarations.find((d) => d.name === "LegacyWidget");
  assert.ok(helper);
  assert.equal(helper?.hasDocumentation, true);
  assert.ok(widget);
  assert.equal(widget?.hasDocumentation, false);
});

test("extractDeclarations finds a python async def", () => {
  const declarations = extractDeclarations({ path: "a.py", content: "async def legacy_fetch(x):\n    return x\n" });
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].name, "legacy_fetch");
  assert.equal(declarations[0].kind, "function");
});

test("extractDeclarations finds an indented python async def inside a class", () => {
  const content = "class LegacyWidget:\n    async def render(self):\n        pass\n";
  const declarations = extractDeclarations({ path: "a.py", content });
  const render = declarations.find((d) => d.name === "render");
  assert.ok(render);
  assert.equal(render?.kind, "function");
});

test("extractDeclarations finds a generator function with the star before the name", () => {
  const declarations = extractDeclarations({ path: "a.ts", content: "function *legacyStream(x) {\n  yield x;\n}\n" });
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].name, "legacyStream");
  assert.equal(declarations[0].kind, "function");
});

test("extractDeclarations finds a generator function with the star after the name position", () => {
  const declarations = extractDeclarations({ path: "a.ts", content: "function* legacyStream(x) {\n  yield x;\n}\n" });
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].name, "legacyStream");
});

test("extractDeclarations finds a typescript abstract class", () => {
  const declarations = extractDeclarations({ path: "a.ts", content: "export abstract class LegacyWidget {\n  abstract render(): void;\n}\n" });
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].name, "LegacyWidget");
  assert.equal(declarations[0].kind, "class");
});

test("extractDeclarations does not treat an identifier starting with function as a declaration", () => {
  const declarations = extractDeclarations({ path: "a.ts", content: "functionCallback(1);\n" });
  assert.equal(declarations.length, 0);
});

test("extractDeclarations returns nothing for files with an unsupported extension", () => {
  const declarations = extractDeclarations({ path: "a.md", content: "function legacyRenderer(x) { return x; }" });
  assert.equal(declarations.length, 0);
});

test("extractDeclarations captures a snippet starting at the declaration", () => {
  const declarations = extractDeclarations({ path: "a.ts", content: "function legacyRenderer(x) {\n  return x;\n}\n" });
  assert.match(declarations[0].snippet, /^function legacyRenderer/);
});
