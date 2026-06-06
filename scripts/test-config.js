import assert from "node:assert/strict";
import { mergeConfig } from "../packages/cli/dist/config/config-loader.js";

const defaultOpts = {
  output: "./output",
  scale: "2",
  width: "1080",
  height: "1440",
  padding: "48",
  format: "png",
  cover: true,
};

const profile = {
  output: "profile-output",
  scale: 1,
  width: 720,
  height: 960,
  padding: 32,
  format: "pdf",
  no_cover: true,
  allow_html: true,
  allow_local_files: true,
};

const profileWins = mergeConfig(defaultOpts, profile, () => "default");
assert.equal(profileWins.output, "profile-output");
assert.equal(profileWins.scale, "1");
assert.equal(profileWins.width, "720");
assert.equal(profileWins.height, "960");
assert.equal(profileWins.padding, "32");
assert.equal(profileWins.format, "pdf");
assert.equal(profileWins.noCover, true);
assert.equal(profileWins.allowHtml, true);
assert.equal(profileWins.allowLocalFiles, true);

const cliOpts = { ...defaultOpts, output: "cli-output", scale: "3" };
const sources = new Map([
  ["output", "cli"],
  ["scale", "cli"],
]);

const cliWins = mergeConfig(cliOpts, profile, (key) => sources.get(key) ?? "default");
assert.equal(cliWins.output, "cli-output");
assert.equal(cliWins.scale, "3");
assert.equal(cliWins.width, "720");
assert.equal(cliWins.allowHtml, true);
assert.equal(cliWins.allowLocalFiles, true);
