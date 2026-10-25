export type Command =
  | { command: "scan"; dir: string; json: boolean }
  | { command: "inspect"; name: string; file: string; dir: string; json: boolean };

function printHelp(): void {
  console.log(`codedig scan [options]
codedig inspect <name> --file <path> [options]

finds code nobody understands anymore and investigates it like a dig site
instead of just flagging it unused: real reference counts, real git history,
real import graph, then a verdict.

  scan                  walk the repo and print an archaeological map, ranked
                        by probability of being obsolete
  inspect <name>        full report for one specific function, class, or
                        constant
  --file <path>         inspect only, the file the name is declared in
  --dir <path>          repo directory to dig through (default: current directory)
  --json                print machine-readable JSON instead of a report
  --help                show this message

examples:
  codedig scan --dir ./src
  codedig inspect legacyRenderer --file src/render.ts
`);
}

export function parseArgs(argv: string[]): Command | null {
  if (argv.length === 0 || argv.includes("--help")) {
    printHelp();
    return null;
  }

  const [first, ...rest] = argv;
  let dir = ".";
  let json = false;

  function next(flag: string, i: number, list: string[]): string {
    const value = list[i + 1];
    if (value === undefined) throw new Error(`${flag} needs a value`);
    return value;
  }

  if (first === "scan") {
    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      if (arg === "--dir") {
        dir = next(arg, i, rest);
        i += 1;
      } else if (arg === "--json") {
        json = true;
      } else if (arg.startsWith("--")) {
        throw new Error(`unknown flag "${arg}"`);
      }
    }
    return { command: "scan", dir, json };
  }

  if (first === "inspect") {
    let name: string | undefined;
    let file: string | undefined;

    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      if (arg === "--dir") {
        dir = next(arg, i, rest);
        i += 1;
      } else if (arg === "--file") {
        file = next(arg, i, rest);
        i += 1;
      } else if (arg === "--json") {
        json = true;
      } else if (arg.startsWith("--")) {
        throw new Error(`unknown flag "${arg}"`);
      } else if (name === undefined) {
        name = arg;
      }
    }

    if (!name) throw new Error("inspect needs a name to look up");
    if (!file) throw new Error("inspect needs --file, the path the name is declared in");
    return { command: "inspect", name, file, dir, json };
  }

  throw new Error(`unknown command "${first}", use "scan" or "inspect"`);
}
