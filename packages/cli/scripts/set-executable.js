import * as fs from "node:fs";
import * as path from "node:path";

try {
  fs.chmodSync(path.resolve(import.meta.dirname, "..", "dist", "index.js"), 0o755);
} catch {
  // Windows does not need executable bits for npm bin shims.
}
