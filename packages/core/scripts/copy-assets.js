import * as fs from "node:fs";
import * as path from "node:path";

const packageRoot = path.resolve(import.meta.dirname, "..");
const source = path.join(packageRoot, "src", "paginator-algo.js");
const target = path.join(packageRoot, "dist", "paginator-algo.js");

if (!fs.existsSync(source)) {
  throw new Error(`Build asset missing: ${source}`);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
