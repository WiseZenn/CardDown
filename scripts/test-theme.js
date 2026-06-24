import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import JSZip from "jszip";
import { listBuiltinThemes, resolveTheme } from "@carddown/core";

assert.deepEqual(listBuiltinThemes(), [
  "claude-like",
  "claude-like-dark",
  "claude-like-grey",
  "github",
]);

const css = await resolveTheme("github");
assert.match(css, /--accent:#0070f3/);

await assert.rejects(
  () => resolveTheme("gitub"),
  /Theme not found: gitub/,
);

const tmpDir = path.join(process.cwd(), "output", ".tmp-tests");
fs.mkdirSync(tmpDir, { recursive: true });
const fileUrlTheme = path.join(tmpDir, "file-url-theme.css");
fs.writeFileSync(fileUrlTheme, 'body{background:url("file:///C:/secret.png")}');

await assert.rejects(
  () => resolveTheme(fileUrlTheme),
  /Explicit file: URLs in theme CSS are disabled by default/,
);

const trustedCss = await resolveTheme(fileUrlTheme, { allowLocalFiles: true });
assert.match(trustedCss, /file:\/\/\/C:\/secret\.png/);

const zipThemePath = path.join(tmpDir, "nested-theme.zip");
const zip = new JSZip();
zip.file("theme/main.css", '@import "./partials/colors.css"; body{background:url("../assets/bg.png")}');
zip.file("theme/partials/colors.css", 'h1{color:#123456;background:url("../../assets/title.png")}');
zip.file("assets/bg.png", Buffer.from("bg"));
zip.file("assets/title.png", Buffer.from("title"));
fs.writeFileSync(zipThemePath, await zip.generateAsync({ type: "nodebuffer" }));

const zipCss = await resolveTheme(zipThemePath);
assert.match(zipCss, /begin @import "\.\/partials\/colors\.css"/);
assert.match(zipCss, /h1\{color:#123456;background:url\("file:\/\/\/[^"]+title\.png"\)\}/);
assert.match(zipCss, /body\{background:url\("file:\/\/\/[^"]+bg\.png"\)\}/);
