/**
 * Guards `carddown --version` against drifting from the published package
 * version. The 1.2.1 release shipped a CLI that reported 1.2.0 because the
 * version was a hardcoded string and nothing ran `--version` in CI.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const cliDir = path.join(process.cwd(), "packages", "cli");
const cliEntry = path.join(cliDir, "dist", "index.js");
const pkg = JSON.parse(fs.readFileSync(path.join(cliDir, "package.json"), "utf-8"));

const reported = execFileSync(process.execPath, [cliEntry, "--version"], { encoding: "utf-8" }).trim();

assert.equal(
  reported,
  pkg.version,
  `\`carddown --version\` reports ${reported} but packages/cli/package.json is ${pkg.version}`,
);

// The CLI pins @carddown/core exactly, so a version bump must move both.
const corePkg = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "packages", "core", "package.json"), "utf-8"),
);
assert.equal(
  pkg.dependencies["@carddown/core"],
  corePkg.version,
  `@carddown/cli depends on @carddown/core ${pkg.dependencies["@carddown/core"]} but Core is ${corePkg.version}`,
);

console.log(`Version check passed (carddown ${reported}).`);
