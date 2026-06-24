import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

const algo = fs.readFileSync(path.join(process.cwd(), "packages", "core", "src", "paginator-algo.js"), "utf-8");

assert.match(algo, /var FILL_TARGET = FILL;/);
assert.match(algo, /for \(var hi = pk; hi <= followerIdx; hi\+\+\)/);
assert.match(algo, /for \(var mi = pk; mi <= followerIdx; mi\+\+\)/);
assert.doesNotMatch(algo, /removeFromCard\(nxtKids\[followerIdx\], nxt\)/);
