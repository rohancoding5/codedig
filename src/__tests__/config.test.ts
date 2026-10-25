import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../config.js";

test("parseArgs parses a plain scan command", () => {
  assert.deepEqual(parseArgs(["scan"]), { command: "scan", dir: ".", json: false });
});

test("parseArgs reads --dir and --json for scan", () => {
  assert.deepEqual(parseArgs(["scan", "--dir", "./src", "--json"]), { command: "scan", dir: "./src", json: true });
});

test("parseArgs parses inspect with a name and --file", () => {
  const command = parseArgs(["inspect", "legacyRenderer", "--file", "src/render.ts"]);
  assert.deepEqual(command, { command: "inspect", name: "legacyRenderer", file: "src/render.ts", dir: ".", json: false });
});

test("parseArgs works when flags come before the name for inspect", () => {
  const command = parseArgs(["inspect", "--file", "src/render.ts", "legacyRenderer"]);
  assert.deepEqual(command, { command: "inspect", name: "legacyRenderer", file: "src/render.ts", dir: ".", json: false });
});

test("parseArgs throws when inspect has no name", () => {
  assert.throws(() => parseArgs(["inspect", "--file", "src/render.ts"]), /needs a name/);
});

test("parseArgs throws when inspect has no --file", () => {
  assert.throws(() => parseArgs(["inspect", "legacyRenderer"]), /needs --file/);
});

test("parseArgs throws on an unknown command", () => {
  assert.throws(() => parseArgs(["dig"]), /unknown command/);
});

test("parseArgs throws on an unknown flag", () => {
  assert.throws(() => parseArgs(["scan", "--bogus"]), /unknown flag/);
});

test("parseArgs throws when a flag is missing its value", () => {
  assert.throws(() => parseArgs(["scan", "--dir"]), /needs a value/);
});

test("parseArgs returns null and prints help for --help", () => {
  assert.equal(parseArgs(["--help"]), null);
});

test("parseArgs returns null and prints help for no args", () => {
  assert.equal(parseArgs([]), null);
});
