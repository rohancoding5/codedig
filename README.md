# codedig

Digs up code nobody understands anymore and reports on it using real references, git history, and import links instead of a plain unused flag.

```bash
codedig scan
```

```
ARCHAEOLOGICAL MAP -- 2 finds, ranked by probability of being obsolete

[100%] legacyRenderer (function)  src/legacy.ts:1  refs=0  966d ago  doc=n
[75%] renderWithCanvas (function)  src/legacy.ts:5  refs=1  966d ago  doc=n

run "codedig inspect <name> --file <path>" on any find above for a full report.
```

```bash
codedig inspect legacyRenderer --file src/legacy.ts
```

```
ARCHAEOLOGICAL FIND

Name: legacyRenderer (function)
Location: src/legacy.ts:1
Last modified: 966 days ago
References: 0
Documentation: no
Dependencies (files that import src/legacy.ts): none
Probability of being obsolete: 100%

Possible historical purpose
  probably an early canvas based rendering path, replaced once the DOM
  renderer landed and nothing was ever pointed back at it

Recommendation: ARCHIVE

Reasoning
  zero real references anywhere in the codebase, no file still imports it,
  and it hasn't changed in over two years
```

## Why this exists

"Unused function" tools usually stop at the flag. The actual question is always the next one: is this genuinely dead, or is it an exported utility, an entry point, a plugin hook, something a low reference count makes look abandoned but isn't. Answering that needs more than a reference count, it needs the code's real age, whether anything still imports its file, whether it was ever documented, and some actual judgment about what it looks like it was for. This gathers the real signals (references, git history, the import graph) and only asks Claude to do the part that's genuinely judgment: given this evidence, what was this probably for, and should it be archived.

## Install

Not published to npm yet, so clone and run it directly:

```bash
git clone https://github.com/rohancoding5/codedig.git
cd codedig
npm install
npm run build
node dist/cli.js scan
```

Set `ANTHROPIC_API_KEY` to get a possible historical purpose and an ARCHIVE or KEEP recommendation on `inspect`. Without a key, both commands still compute and print all the real evidence, they just skip the narrative guess.

## Usage

```bash
codedig scan --dir ./src
```

Walks the repo, finds every function, class, and top level const declaration in JS, TS, and Python files, counts real references to each (word boundary matches across every other file, not just a naive grep), builds the real import graph so it knows which files still import the declaring file, and checks git history for when it last actually changed. Anything with 3 or fewer real references gets scored for how likely it is to be obsolete and shown on the map, ranked highest probability first.

```bash
codedig inspect legacyRenderer --file src/legacy.ts
```

Full report for one specific find: the same real metrics, plus, if a key is set, Claude's guess at what it was originally for and whether to archive or keep it.

### Options

```
--dir <path>       repo directory to dig through (default: current directory)
--json             print machine-readable JSON instead of a report
--help             show this message
```

## How it works

Everything except the final narrative guess is deterministic and offline. Declarations are found with regexes tuned per language, doc comments are detected by checking for a closing `*/` directly above (JS/TS) or a docstring directly below the signature (Python), references are counted with a word boundary match so `foo` doesn't match `fooBar`, the import graph resolves both extensionless and NodeNext style `.js` specifiers back to their real `.ts` source, and last-modified dates come from `git log`'s pickaxe search (`-S`) so a rename doesn't get miscounted as still-active just because the old name survives as a substring of the new one. The obsolete score is a plain weighted formula over those signals, not an LLM guess, so it's the same number every time for the same evidence.

## Known limitations

Reference counting is textual, not scope aware. A local variable in an unrelated function that happens to share a name will count as a "reference" it shouldn't. This is meant to surface candidates worth a human look, not to be an authoritative dead code eliminator, always read the find before deleting anything.

## Development

```bash
git clone https://github.com/rohancoding5/codedig.git
cd codedig
npm install
npm test
```

`npm test` builds the project and runs the full suite with Node's built-in test runner: unit tests for declaration extraction, reference counting, the import graph (including the NodeNext `.js` specifier case), and the obsolete score formula, integration tests against real temporary git repositories with real backdated commits, and a wire-format test for the real Anthropic SDK's structured-output parsing against a local HTTP server standing in for the Messages API.

## License

MIT
