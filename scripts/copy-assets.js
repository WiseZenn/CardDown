import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const assets = [
  ["src/paginator-algo.js", "dist/paginator-algo.js"],
];

for (const [from, to] of assets) {
  const source = path.join(root, from);
  const target = path.join(root, to);

  if (!fs.existsSync(source)) {
    throw new Error(`Build asset missing: ${source}`);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

try {
  fs.chmodSync(path.join(root, "dist/index.js"), 0o755);
} catch {
  // Windows does not need executable bits for npm bin shims.
}
