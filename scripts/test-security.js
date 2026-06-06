import assert from "node:assert/strict";
import { parseMarkdownString } from "@carddown/core";

const css = ":root{--accent:#0070f3}";
const markdown = [
  "# 安全测试",
  "==高亮==",
  "<script>alert(\"x\")</script>",
  "<div onclick=\"alert('x')\">raw html</div>",
  "",
].join("\n");

const safeHtml = await parseMarkdownString(markdown, process.cwd(), css);
assert.match(safeHtml, /<mark>高亮<\/mark>/);
assert.doesNotMatch(safeHtml, /<script>alert\("x"\)<\/script>/);
assert.doesNotMatch(safeHtml, /<div onclick="alert\('x'\)">raw html<\/div>/);

const allowedHtml = await parseMarkdownString(markdown, process.cwd(), css, { allowHtml: true });
assert.match(allowedHtml, /<script>alert\("x"\)<\/script>/);
assert.match(allowedHtml, /<div onclick="alert\('x'\)">raw html<\/div>/);

const fileImageMarkdown = "![secret](file:///C:/secret.png)";
await assert.rejects(
  () => parseMarkdownString(fileImageMarkdown, process.cwd(), css),
  /Explicit file: URLs in Markdown are disabled by default/,
);

const trustedFileImageHtml = await parseMarkdownString(fileImageMarkdown, process.cwd(), css, { allowLocalFiles: true });
assert.match(trustedFileImageHtml, /src="file:\/\/\/C:\/secret\.png"/);

const rawHtmlFileImage = '<img src="file:///C:/secret.png" alt="secret">';
await assert.rejects(
  () => parseMarkdownString(rawHtmlFileImage, process.cwd(), css, { allowHtml: true }),
  /Explicit file: URLs in Markdown are disabled by default/,
);
