import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createRequire } from "module";
import { resolveTheme, PAGINATION_CSS } from "./themes.js";
import type { Root, PhrasingContent, Text, Image, Link, Blockquote, Paragraph } from "mdast";
import type { Plugin } from "unified";

const require = createRequire(import.meta.url);
const KATEX_CSS = require.resolve("katex/dist/katex.min.css");
const KATEX_DIST = path.dirname(KATEX_CSS);

let _katexDir: string | null = null;
export function ensureKatexAssets(): string {
  if (_katexDir && fs.existsSync(_katexDir)) return _katexDir;
  // Directory was deleted by OS temp cleanup — recreate
  _katexDir = fs.mkdtempSync(path.join(os.tmpdir(), "carddown-"));
  fs.copyFileSync(path.join(KATEX_DIST, "katex.min.css"), path.join(_katexDir, "katex.min.css"));
  const fontsDst = path.join(_katexDir, "fonts");
  fs.mkdirSync(fontsDst, { recursive: true });
  for (const f of fs.readdirSync(path.join(KATEX_DIST, "fonts"))) {
    fs.copyFileSync(path.join(KATEX_DIST, "fonts", f), path.join(fontsDst, f));
  }
  return _katexDir;
}

function buildKatexCss(): string {
  const fontsDir = path.join(KATEX_DIST, "fonts").replace(/\\/g, "/");
  let css = fs.readFileSync(path.join(KATEX_DIST, "katex.min.css"), "utf-8");
  css = css.replace(/url\(fonts\//g, `url(file:///${fontsDir}/`);
  return css;
}

let _katexCssCache: string | null = null;
function getKatexCss(): string {
  if (!_katexCssCache) _katexCssCache = buildKatexCss();
  return _katexCssCache;
}

export interface CoverData {
  title: string | null;
  toc: { level: number; text: string }[];
}

export interface ParseMarkdownOptions {
  allowHtml?: boolean;
  allowLocalFiles?: boolean;
}

type NodeWithChildren = { type: string; children?: unknown[]; data?: Record<string, unknown> };
type ParentWithChildren = { children: unknown[] };

function walk(node: unknown, visitor: (node: NodeWithChildren, parent?: ParentWithChildren) => void, parent?: ParentWithChildren): void {
  if (!node || typeof node !== "object") return;
  const current = node as NodeWithChildren;
  visitor(current, parent);
  if (!Array.isArray(current.children)) return;
  for (const child of current.children) {
    walk(child, visitor, current as ParentWithChildren);
  }
}

function isTextNode(node: unknown): node is Text {
  return Boolean(node && typeof node === "object" && (node as { type?: string }).type === "text");
}

function splitHighlightText(value: string): PhrasingContent[] | null {
  const parts: PhrasingContent[] = [];
  const pattern = /==([^=\n]+)==/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: value.slice(lastIndex, match.index) });
    }
    parts.push({
      type: "carddownMark",
      data: { hName: "mark" },
      children: [{ type: "text", value: match[1] }],
    } as unknown as PhrasingContent);
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex === 0) return null;
  if (lastIndex < value.length) {
    parts.push({ type: "text", value: value.slice(lastIndex) });
  }
  return parts;
}

const remarkHighlight: Plugin<[], Root> = () => {
  return (tree) => {
    walk(tree, (_node, parent) => {
      if (!parent) return;
      const children = parent.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!isTextNode(child)) continue;
        const replacement = splitHighlightText(child.value);
        if (replacement) {
          children.splice(i, 1, ...replacement);
          i += replacement.length - 1;
        }
      }
    });
  };
};

function isRemoteImageUrl(url: string): boolean {
  return /^(?:https?:|data:)/i.test(url) || url.startsWith("//");
}

function isWindowsAbsolutePath(url: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(url);
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".webp") return "image/webp";
  if (ext === ".bmp") return "image/bmp";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".tiff" || ext === ".tif") return "image/tiff";
  if (ext === ".avif") return "image/avif";
  // For unknown extensions, use octet-stream and log a warning
  if (ext) console.warn(`Unknown image extension "${ext}" for ${filePath} — using image/png as fallback`);
  return "image/png";
}

function embedImage(node: Image, baseDir: string, allowLocalFiles: boolean): void {
  const imgPath = node.url.trim();
  if (!imgPath || isRemoteImageUrl(imgPath) || /^file:/i.test(imgPath)) return;

  const isAbsolute = path.isAbsolute(imgPath) || isWindowsAbsolutePath(imgPath);
  if (isAbsolute && !allowLocalFiles) {
    throw new Error("Absolute local image paths are disabled by default. Use --allow-local-files only for trusted input.");
  }

  const absoluteImgPath = isAbsolute ? path.resolve(imgPath) : path.resolve(baseDir, imgPath);
  try {
    const imgData = fs.readFileSync(absoluteImgPath);
    node.url = `data:${mimeFromPath(absoluteImgPath)};base64,${imgData.toString("base64")}`;
  } catch {
    console.error(`Failed to embed local image: ${absoluteImgPath} — keeping original path (will likely show broken image)`);
    node.url = imgPath;
  }
}

function remarkLocalImages(baseDir: string, allowLocalFiles: boolean): Plugin<[], Root> {
  return () => {
    return (tree) => {
      walk(tree, (node) => {
        if (node.type === "image") {
          embedImage(node as unknown as Image, baseDir, allowLocalFiles);
        }
      });
    };
  };
}

const remarkCjkAutolinkTail: Plugin<[], Root> = () => {
  // CJK ranges: \u3000-\u303f (symbols/punctuation), \u3400-\u9fff (unified ideographs + ext-A),
  // \u3040-\u30ff (hiragana+katakana), \uac00-\ud7af (hangul), \uff00-\uffef (halfwidth/fullwidth)
  const cjkTailPattern = /^(https?:\/\/[^\s\u3000-\u303f\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\uff00-\uffef]+)([\u3000-\u303f\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\uff00-\uffef].*)$/u;

  return (tree) => {
    walk(tree, (_node, parent) => {
      if (!parent) return;
      const children = parent.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as Link | undefined;
        if (!child || child.type !== "link" || child.title) continue;
        if (child.children.length !== 1 || !isTextNode(child.children[0])) continue;
        if (child.children[0].value !== child.url) continue;

        const match = child.url.match(cjkTailPattern);
        if (!match) continue;

        child.url = match[1];
        child.children[0].value = match[1];
        children.splice(i + 1, 0, { type: "text", value: match[2] } as Text);
        i++;
      }
    });
  };
};

const remarkCallouts: Plugin<[], Root> = () => {
  const calloutTypes: Record<string, string> = {
    info: "info", warning: "warning", tip: "tip", danger: "danger",
    note: "note", caution: "caution", important: "important",
  };

  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== "blockquote") return;
      const blockquote = node as unknown as Blockquote;
      const firstBlock = blockquote.children[0] as Paragraph | undefined;
      if (!firstBlock || firstBlock.type !== "paragraph") return;

      const firstText = firstBlock.children.find(isTextNode);
      if (!firstText) return;

      const match = firstText.value.match(/^\[!(\w+)\][ \t]*([^\r\n]*)(?:\r?\n)?/);
      if (!match) return;

      const type = match[1].toLowerCase();
      const cls = calloutTypes[type] || type;
      const title = match[2].trim() || match[1];

      blockquote.data = {
        ...(blockquote.data || {}),
        hName: "div",
        hProperties: { className: ["callout", `callout-${cls}`] },
      };

      firstText.value = firstText.value.slice(match[0].length);
      firstBlock.children = firstBlock.children.filter((child) => !isTextNode(child) || child.value.length > 0);
      if (firstBlock.children.length === 0) {
        blockquote.children.shift();
      }

      blockquote.children.unshift({
        type: "paragraph",
        data: { hName: "div", hProperties: { className: ["callout-title"] } },
        children: [{ type: "text", value: title }],
      } as unknown as Paragraph);
    });
  };
};

const rehypeTyporaCodeFenceClass: Plugin<[], any> = () => {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== "element" || (node as { tagName?: string }).tagName !== "pre") return;
      const element = node as { properties?: Record<string, unknown>; children?: unknown[] };
      const hasCodeChild = element.children?.some((child) => {
        return Boolean(child && typeof child === "object" && (child as { type?: string; tagName?: string }).type === "element" && (child as { tagName?: string }).tagName === "code");
      });
      if (!hasCodeChild) return;

      const properties = element.properties || {};
      const className = properties.className;
      const classes = Array.isArray(className) ? className : typeof className === "string" ? className.split(/\s+/) : [];
      if (!classes.includes("md-fences")) {
        classes.push("md-fences");
      }
      element.properties = { ...properties, className: classes };
    });
  };
};

export function extractCoverData(html: string): CoverData {
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/);
  const title = h1Match ? h1Match[1].replace(/<[^>]+>/g, "") : null;
  const toc: { level: number; text: string }[] = [];
  const headingRe = /<h([23])[^>]*>(.*?)<\/h[23]>/g;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null) {
    toc.push({ level: parseInt(m[1]), text: m[2].replace(/<[^>]+>/g, "") });
  }
  return { title, toc };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildCoverHtml(cover: CoverData, css: string): string {
  const tocItems = cover.toc
    .map((item) => `<li class="toc-${item.level === 2 ? "h2" : "h3"}">${escapeHtml(item.text)}</li>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'self' data: file: http: https:; font-src 'self' file:;"><style>html,body{height:100%;width:100%;max-width:none!important;margin:0!important;padding:0!important}${css}
body{width:100%!important;max-width:none!important;box-sizing:border-box!important}
.page-cover{display:flex;flex-direction:column;width:100vw;max-width:none;height:100%;box-shadow:inset 0 12px 0 var(--accent, #0070f3);position:relative}
.page-cover-body{display:flex;flex-direction:column;flex:1;padding:80px 56px 0}
.page-cover-body h1{font-size:56px;line-height:1.15;margin:0 0 24px;font-weight:800;letter-spacing:-1.5px}
.page-cover-body h1:after{content:"";display:block;width:48px;height:8px;background:var(--accent, #0070f3);margin-top:28px;border-radius:2px;position:static}
.page-cover-body .toc-list{list-style:none;padding:0;margin:0;margin-top:48px}
.page-cover-body .toc-list li{padding:18px 0;border-bottom:1px solid rgba(128,128,128,0.1);font-size:24px;line-height:1.5}
.page-cover-body .toc-list li:last-child{border-bottom:none}
.page-cover-body .toc-list .toc-h2{font-weight:600}
.page-cover-body .toc-list .toc-h3{font-weight:400;padding-left:56px;font-size:22px;color:var(--accent, #0070f3)}
.page-cover-footer{position:absolute;bottom:36px;left:56px;font-size:15px;opacity:0.22}
</style></head>
<body><div class="page-cover">
<div class="page-cover-body">
${cover.title ? `<h1>${escapeHtml(cover.title)}</h1>` : ""}
${tocItems ? `<ul class="toc-list">${tocItems}</ul>` : ""}
</div>
<div class="page-cover-footer">WiseZenn</div>
</div></body></html>`;
}

export async function parseMarkdown(inputPath: string, css?: string, options: ParseMarkdownOptions = {}): Promise<string> {
  const absolutePath = path.resolve(inputPath);
  const markdownContent = fs.readFileSync(absolutePath, "utf-8");
  return parseMarkdownString(markdownContent, path.dirname(absolutePath), css, options);
}

function assertNoExplicitFileUrls(markdownContent: string): void {
  const patterns = [
    /!\[[^\]]*\]\(\s*<?file:/i,
    /\[[^\]]*\]\(\s*<?file:/i,  // markdown link syntax [text](file://...)
    /<(?:audio|embed|iframe|img|link|object|script|source|video)\b[^>]*(?:href|src)\s*=\s*["']?\s*file:/i,
    /url\(\s*["']?\s*file:/i,
    /@import\s+(?:url\(\s*)?["']?\s*file:/i,  // CSS @import file: URLs
  ];

  if (patterns.some((pattern) => pattern.test(markdownContent))) {
    throw new Error("Explicit file: URLs in Markdown are disabled by default. Use --allow-local-files only for trusted input.");
  }
}

function normalizeDisplayMathFences(markdownContent: string): string {
  const lines = markdownContent.split(/\r?\n/);
  const normalized: string[] = [];
  let codeFence: { marker: "`" | "~"; length: number } | null = null;
  let displayMathOpen = false;

  function splitLinePrefix(line: string): { prefix: string; body: string } {
    const match = line.match(/^(\s*(?:>\s*)*)(.*)$/);
    if (!match) return { prefix: "", body: line };
    return {
      prefix: match[1].replace(/>(?=\S|$)/g, "> "),
      body: match[2],
    };
  }

  function detectFenceStart(trimmed: string): { marker: "`" | "~"; length: number } | null {
    const match = trimmed.match(/^(`{3,}|~{3,})/);
    if (!match) return null;
    return { marker: match[1][0] as "`" | "~", length: match[1].length };
  }

  function isFenceClose(trimmed: string, fence: { marker: "`" | "~"; length: number }): boolean {
    return trimmed.length >= fence.length && [...trimmed].every((char) => char === fence.marker);
  }

  for (const line of lines) {
    const { prefix, body } = splitLinePrefix(line);
    const trimmed = body.trim();

    if (codeFence) {
      normalized.push(line);
      if (isFenceClose(trimmed, codeFence)) {
        codeFence = null;
      }
      continue;
    }

    const fenceStart = detectFenceStart(trimmed);
    if (fenceStart) {
      codeFence = fenceStart;
      normalized.push(line);
      continue;
    }

    if (trimmed === "$$") {
      normalized.push(prefix ? `${prefix}$$` : line);
      displayMathOpen = !displayMathOpen;
      continue;
    }

    if (displayMathOpen) {
      if (trimmed.endsWith("$$") && trimmed.length > 2) {
        normalized.push(`${prefix}${trimmed.slice(0, -2).trimEnd()}`);
        normalized.push(`${prefix}$$`);
        displayMathOpen = false;
      } else {
        normalized.push(line);
      }
      continue;
    }

    if (!trimmed.startsWith("$$")) {
      normalized.push(line);
      continue;
    }

    const startsDisplay = trimmed.startsWith("$$");
    const endsDisplay = trimmed.endsWith("$$");

    if (startsDisplay && endsDisplay && trimmed.length > 4) {
      normalized.push(`${prefix}$$`);
      normalized.push(`${prefix}${trimmed.slice(2, -2).trim()}`);
      normalized.push(`${prefix}$$`);
    } else if (startsDisplay && trimmed.length > 2) {
      normalized.push(`${prefix}$$`);
      normalized.push(`${prefix}${trimmed.slice(2).trimStart()}`);
      displayMathOpen = true;
    } else {
      normalized.push(line);
    }
  }

  if (displayMathOpen) {
    console.warn("Unbalanced $$ display math fence detected — missing closing $$. Output may be corrupted.");
    // Insert a closing fence to prevent all subsequent content from being treated as math
    normalized.push("$$");
  }

  return normalized.join("\n");
}

export async function parseMarkdownString(
  markdownContent: string,
  baseDir = process.cwd(),
  css?: string,
  options: ParseMarkdownOptions = {}
): Promise<string> {
  const allowHtml = options.allowHtml === true;
  const allowLocalFiles = options.allowLocalFiles === true;

  if (!allowLocalFiles) {
    assertNoExplicitFileUrls(markdownContent);
  }
  const normalizedContent = normalizeDisplayMathFences(markdownContent);

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkLocalImages(baseDir, allowLocalFiles))
    .use(remarkCjkAutolinkTail)
    .use(remarkHighlight)
    .use(remarkCallouts)
    .use(remarkRehype, { allowDangerousHtml: allowHtml })
    .use(rehypeKatex as any)
    .use(rehypeTyporaCodeFenceClass as any)
    .use(rehypeStringify as any, { allowDangerousHtml: allowHtml })
    .process(normalizedContent);

  const bodyHtml = String(result);
  const themeCss = css || await resolveTheme("github");
  const katexCss = getKatexCss();
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'self' data: file: http: https:; font-src 'self' file:;" />
  <style>${themeCss}${katexCss}${PAGINATION_CSS}
.callout{border-left:4px solid var(--callout-border,#0070f3);background:var(--callout-bg,#f0f7ff);color:var(--callout-fg,inherit);padding:12px 20px;margin-bottom:20px;border-radius:0 8px 8px 0}
.callout-info{border-color:var(--callout-info-border,#0070f3);background:var(--callout-info-bg,#f0f7ff);color:var(--callout-info-fg,var(--callout-fg,inherit))}
.callout-note{border-color:var(--callout-note-border,#8250df);background:var(--callout-note-bg,#f5f0ff);color:var(--callout-note-fg,var(--callout-fg,inherit))}
.callout-warning{border-color:var(--callout-warning-border,#f5a623);background:var(--callout-warning-bg,#fff8e1);color:var(--callout-warning-fg,var(--callout-fg,inherit))}
.callout-tip,.callout-important{border-color:var(--callout-tip-border,#36b37e);background:var(--callout-tip-bg,#e8f5e9);color:var(--callout-tip-fg,var(--callout-fg,inherit))}
.callout-danger,.callout-caution{border-color:var(--callout-danger-border,#de350b);background:var(--callout-danger-bg,#ffebee);color:var(--callout-danger-fg,var(--callout-fg,inherit))}
.callout-title{font-weight:700;margin-bottom:8px;color:var(--callout-title-fg,currentColor)}
mark{background:#fff3cd;color:inherit;padding:0.08em 0.3em;border-radius:3px}
.katex-display{overflow-x:auto;overflow-y:hidden}
</style></head>
<body>
${bodyHtml}
</body>
</html>`;

  return fullHtml;
}
