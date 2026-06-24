import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseMarkdownString } from "@carddown/core";

const css = ":root{--accent:#0070f3}";
const tmpDir = path.join(process.cwd(), "output", ".tmp-tests", "parser");
fs.mkdirSync(tmpDir, { recursive: true });

const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
fs.writeFileSync(path.join(tmpDir, "tiny.png"), Buffer.from(tinyPng, "base64"));

const markdown = [
  "# Parser",
  "==\u9ad8\u4eae== text",
  "",
  '![tiny](tiny.png "\u56fe\u7247")',
  "",
  "> [!WARNING] \u6ce8\u610f",
  "> **\u6b63\u6587** and $x^2$",
  "",
  "$$\\int_0^1 x\\,dx$$",
  "",
  "$$M = \\begin{pmatrix}",
  "1 & 0 \\\\",
  "0 & 1",
  "\\end{pmatrix}$$",
  "",
  "> [!TIP] \u516c\u5f0f\u4e4b\u540e",
  "> \u4ecd\u7136\u89e3\u6790\u4e3a\u63d0\u793a",
  "",
  "> [!IMPORTANT] \u5f15\u7528\u516c\u5f0f",
  ">$$q = 1$$",
  "> \u5f15\u7528\u516c\u5f0f\u4e4b\u540e",
  "",
  "Inline double dollars should stay with this sentence: text $$x$$",
  "and this continuation remains a plain paragraph.",
  "",
  "https://example.com\u4e2d\u6587\u5c3e\u5df4",
  "",
  "```ts",
  "const x = 1;",
  "```",
  "",
  "```md",
  "$$literal$$",
  "```",
].join("\n");

const html = await parseMarkdownString(markdown, tmpDir, css);
assert.match(html, /img-src 'self' data: file: http: https:/);
assert.match(html, /<mark>\u9ad8\u4eae<\/mark>/u);
assert.match(html, /<img src="data:image\/png;base64,/);
assert.match(html, /title="\u56fe\u7247"/u);
assert.match(html, /<div class="callout callout-warning">/);
assert.match(html, /<div class="callout-title">\u6ce8\u610f<\/div>/u);
assert.match(html, /<div class="callout callout-tip">/);
assert.match(html, /<div class="callout-title">\u516c\u5f0f\u4e4b\u540e<\/div>/u);
assert.match(html, /<div class="callout callout-important">/);
assert.match(html, /\u5f15\u7528\u516c\u5f0f\u4e4b\u540e/u);
assert.match(html, /<p>Inline double dollars should stay with this sentence:[\s\S]*and this continuation remains a plain paragraph\.<\/p>/u);
assert.match(html, /<strong>\u6b63\u6587<\/strong>/u);
assert.match(html, /class="katex/);
assert.match(html, /katex-display/);
assert.match(html, /<a href="https:\/\/example\.com">https:\/\/example\.com<\/a>\u4e2d\u6587\u5c3e\u5df4/u);
assert.match(html, /<pre class="md-fences"><code class="language-ts">/);
assert.match(html, /<pre class="md-fences"><code class="language-md">\$\$literal\$\$/);

await assert.rejects(
  () => parseMarkdownString("![secret](C:/secret.png)", tmpDir, css),
  /Absolute local image paths are disabled by default/,
);
