import assert from "node:assert/strict";
import { validateRenderOptions } from "../packages/cli/dist/config/config-loader.js";

function expectInvalid(opts, pattern) {
  assert.throws(() => validateRenderOptions(opts), pattern);
}

expectInvalid({ scale: "2x" }, /--scale must be a number/);
expectInvalid({ scale: "0" }, /--scale must be >= 1/);
expectInvalid({ width: "1080px" }, /--width must be an integer/);
expectInvalid({ height: "0" }, /--height must be >= 1/);
expectInvalid({ padding: "600", width: "1080", height: "1440" }, /--padding must leave a positive content area/);
expectInvalid({ fillThreshold: "1.2" }, /--fill-threshold must be <= 1/);
expectInvalid({ format: "jpg" }, /--format must be "png" or "pdf"/);
expectInvalid({ output: "" }, /--output must not be empty/);

const valid = validateRenderOptions({
  output: "./out",
  theme: "github",
  scale: "1.5",
  width: "1080",
  height: "1440",
  padding: "48",
  maxCodeLines: "0",
  fillThreshold: "0",
  format: "pdf",
  allowHtml: true,
  allowLocalFiles: true,
  noCover: true,
});

assert.equal(valid.scale, 1.5);
assert.equal(valid.fillThreshold, 0);
assert.equal(valid.format, "pdf");
assert.equal(valid.allowHtml, true);
assert.equal(valid.allowLocalFiles, true);
assert.equal(valid.noCover, true);
