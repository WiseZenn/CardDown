import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import JSZip from "jszip";

const GITHUB_CSS = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;font-size:16px;line-height:1.8;color:#333;background:#fff;padding:48px 56px;width:1080px}h1{font-size:32px;margin-bottom:24px;color:#111;font-weight:700}h1:after{content:"";display:block;width:48px;height:3px;background:var(--accent);margin-top:12px;border-radius:2px}h2{font-size:24px;margin:32px 0 16px;color:#222;font-weight:700}h3{font-size:20px;margin:24px 0 12px;color:#333;font-weight:700}p{margin-bottom:16px}pre{background:#f6f8fa;border:1px solid #e1e4e8;border-radius:8px;padding:16px;margin-bottom:20px;overflow:hidden;font-family:"JetBrains Mono","Fira Code",monospace;font-size:14px;line-height:1.6}code{font-family:"JetBrains Mono","Fira Code",monospace}p>code{background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:14px}img{display:block;max-width:100%;max-height:700px;height:auto;object-fit:contain;border-radius:8px;margin:0}p:has(>img:only-child){line-height:0;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:15px}th,td{border:1px solid #ddd;padding:10px 14px;text-align:left}th{background:#f6f8fa;font-weight:700}blockquote{border-left:4px solid #0070f3;background:#f0f7ff;padding:12px 20px;margin-bottom:20px;border-radius:0 8px 8px 0;color:#444}strong{font-weight:700}.page-card{box-shadow:inset 0 4px 0 #0070f3}.page-header h1{font-size:32px;margin:0 0 10px;font-weight:700;color:#111}.page-header h1:after{content:"";display:block;width:48px;height:3px;background:var(--accent);margin-top:8px;border-radius:2px}.page-number{position:absolute;bottom:32px;right:56px;background:#0070f3;color:#fff;font-family:-apple-system,sans-serif;font-size:13px;padding:4px 14px;border-radius:999px;font-weight:500;letter-spacing:0.5px;z-index:10}`;

const CLAUDE_LIKE_CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,"Times New Roman","Songti SC","Noto Serif CJK SC","Source Han Serif SC","SimSun","PingFang SC","Microsoft YaHei",serif;font-size:16px;line-height:1.62;color:#2b2621;background:#faf9f5;padding:48px 56px;width:1080px;-webkit-font-smoothing:antialiased}
h1{font-size:1.84em;line-height:1.16;margin-top:0.35rem;margin-bottom:0.7rem;font-weight:700;color:#1c1815;position:relative;padding-bottom:10px}
h1:after{content:"";display:block;width:48px;height:3px;background:#bc6a3a;position:absolute;bottom:0;left:0;border-radius:2px}
h2{font-size:1.48em;line-height:1.2;margin:1.45rem 0 0.7rem;font-weight:700;color:#1c1815;padding-bottom:6px;border-bottom:1px solid #e5ddd3}
h3{font-size:1.24em;line-height:1.32;margin:1.2rem 0 0.6rem;font-weight:700;color:#1c1815}
p,blockquote,ul,ol,table{margin:0.78em 0}
ul,ol{padding-left:1.5em}
pre{font-family:Menlo,Monaco,Consolas,monospace;border:1px solid #e9e2d8;background:#fcfcfa;color:#1c1815;border-radius:8px;padding:0.9rem 1rem 0.85rem;font-size:0.9em;line-height:1.55;margin:14px 0 18px;box-shadow:0 1px 0 rgba(43,38,33,0.03)}
code{font-family:Menlo,Monaco,Consolas,monospace;border:1px solid #d7cec5;background:#f2eeea;color:#b14a40;border-radius:999px;padding:0.08em 0.42em 0.1em;font-size:0.9em}
pre code{border:0;background:transparent;padding:0;border-radius:0;box-shadow:none;color:inherit;font-size:inherit}
img{display:block;max-width:100%;max-height:700px;height:auto;object-fit:contain;border-radius:8px;margin:0}
p:has(>img:only-child){line-height:0;margin-bottom:20px}
table{width:100%;border-collapse:collapse;border-top:1px solid #cbb9a6;border-bottom:1px solid #cbb9a6;font-size:0.93rem}
th,td{border:0;padding:12px 18px 12px 0;text-align:left;font-size:0.93rem}
th{font-weight:700;color:#1c1815;border-bottom:1px solid #cbb9a6}
td{border-bottom:1px solid rgba(114,105,94,0.26)}
tr:last-child td{border-bottom:0}
blockquote{border-left:2px solid #d8cbbb;background:#f3ede5;padding:0.55rem 1rem;margin-bottom:20px;color:#625950;border-radius:10px}
strong{font-weight:700;color:#1c1815}
a{color:#bc6a3a;text-decoration:none;font-family:inherit;font-size:inherit}
mark{background:#fff3cd;color:#2b2621;padding:0.08em 0.2em;border-radius:3px}
.page-card{box-shadow:inset 0 4px 0 #bc6a3a}
.page-header h1{font-size:1.84em;line-height:1.16;margin-top:0;margin-bottom:0.7rem;font-weight:700;color:#1c1815;position:relative;padding-bottom:10px}
.page-header h1:after{content:"";display:block;width:48px;height:3px;background:#bc6a3a;position:absolute;bottom:0;left:0;border-radius:2px}
.page-number{position:absolute;bottom:32px;right:56px;background:#bc6a3a;color:#fff;font-family:-apple-system,sans-serif;font-size:13px;padding:4px 14px;border-radius:999px;font-weight:500;letter-spacing:0.5px;z-index:10}`;

const CLAUDE_LIKE_DARK_CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Anthropic Serif",Georgia,"Times New Roman","Songti SC","Noto Serif CJK SC","Source Han Serif SC","PingFang SC","Hiragino Sans GB",serif;font-size:16px;line-height:1.62;color:#ddd4ca;background:#151210;padding:48px 56px;width:1080px;-webkit-font-smoothing:antialiased}
h1{font-size:1.84em;line-height:1.16;margin-top:0.35rem;margin-bottom:0.7rem;font-weight:700;color:#f2e9df;position:relative;padding-bottom:10px}
h1:after{content:"";display:block;width:48px;height:3px;background:#d59567;position:absolute;bottom:0;left:0;border-radius:2px}
h2{font-size:1.48em;line-height:1.2;margin:1.45rem 0 0.7rem;font-weight:700;color:#f2e9df;padding-bottom:6px;border-bottom:1px solid #2f2924}
h3{font-size:1.24em;line-height:1.32;margin:1.2rem 0 0.6rem;font-weight:700;color:#f2e9df}
p,blockquote,ul,ol,table{margin:0.78em 0}
ul,ol{padding-left:1.5em}
pre{font-family:Menlo,Monaco,"SF Mono",Consolas,"Cascadia Code",monospace;border:1px solid #332b25;background:#1d1917;color:#e8dfd5;border-radius:8px;padding:0.9rem 1rem 0.85rem;font-size:0.9em;line-height:1.55;margin:14px 0 18px;box-shadow:0 1px 0 rgba(255,255,255,0.02)}
code{font-family:Menlo,Monaco,"SF Mono",Consolas,"Cascadia Code",monospace;border:1px solid #3a3029;background:#241d19;color:#e1a092;border-radius:999px;padding:0.08em 0.42em 0.1em;font-size:0.9em}
pre code{border:0;background:transparent;padding:0;border-radius:0;box-shadow:none;color:inherit;font-size:inherit}
img{display:block;max-width:100%;max-height:700px;height:auto;object-fit:contain;border-radius:8px;margin:0}
p:has(>img:only-child){line-height:0;margin-bottom:20px}
table{width:100%;border-collapse:collapse;border-top:1px solid #5a4c41;border-bottom:1px solid #5a4c41;font-size:0.93rem}
th,td{border:0;padding:12px 18px 12px 0;text-align:left;font-size:0.93rem}
th{font-weight:700;color:#f2e9df;border-bottom:1px solid #5a4c41}
td{border-bottom:1px solid rgba(232,223,213,0.14)}
tr:last-child td{border-bottom:0}
blockquote{border-left:2px solid #4c4037;background:#1c1815;padding:0.55rem 1rem;margin-bottom:20px;color:#d0c2b4;border-radius:10px}
strong{font-weight:700;color:#f2e9df}
a{color:#d59567;text-decoration:none;font-family:inherit;font-size:inherit}
mark{background:rgba(213,149,103,0.2);color:#ddd4ca;padding:0.08em 0.2em;border-radius:3px}
.page-card{box-shadow:inset 0 4px 0 #d59567}
.page-header h1{font-size:1.84em;line-height:1.16;margin-top:0;margin-bottom:0.7rem;font-weight:700;color:#f2e9df;position:relative;padding-bottom:10px}
.page-header h1:after{content:"";display:block;width:48px;height:3px;background:#d59567;position:absolute;bottom:0;left:0;border-radius:2px}
.page-number{position:absolute;bottom:32px;right:56px;background:#d59567;color:#151210;font-family:-apple-system,sans-serif;font-size:13px;padding:4px 14px;border-radius:999px;font-weight:500;letter-spacing:0.5px;z-index:10}`;

const CLAUDE_LIKE_GREY_CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Anthropic Serif",Georgia,"Times New Roman","Songti SC","Noto Serif CJK SC","Source Han Serif SC","PingFang SC","Hiragino Sans GB",serif;font-size:16px;line-height:1.62;color:#dde2e7;background:#444a52;padding:48px 56px;width:1080px;-webkit-font-smoothing:antialiased}
h1{font-size:1.84em;line-height:1.16;margin-top:0.35rem;margin-bottom:0.7rem;font-weight:700;color:#ecf0f5;position:relative;padding-bottom:10px}
h1:after{content:"";display:block;width:48px;height:3px;background:#c89478;position:absolute;bottom:0;left:0;border-radius:2px}
h2{font-size:1.48em;line-height:1.2;margin:1.45rem 0 0.7rem;font-weight:700;color:#ecf0f5;padding-bottom:6px;border-bottom:1px solid #535a63}
h3{font-size:1.24em;line-height:1.32;margin:1.2rem 0 0.6rem;font-weight:700;color:#ecf0f5}
p,blockquote,ul,ol,table{margin:0.78em 0}
ul,ol{padding-left:1.5em}
pre{font-family:Menlo,Monaco,"SF Mono",Consolas,"Cascadia Code",monospace;border:1px solid #5d6670;background:#4b525a;color:#e2e7ec;border-radius:8px;padding:0.9rem 1rem 0.85rem;font-size:0.9em;line-height:1.55;margin:14px 0 18px;box-shadow:0 1px 0 rgba(255,255,255,0.03)}
code{font-family:Menlo,Monaco,"SF Mono",Consolas,"Cascadia Code",monospace;border:1px solid #636b75;background:#4f565f;color:#e6b09b;border-radius:999px;padding:0.08em 0.42em 0.1em;font-size:0.9em}
pre code{border:0;background:transparent;padding:0;border-radius:0;box-shadow:none;color:inherit;font-size:inherit}
img{display:block;max-width:100%;max-height:700px;height:auto;object-fit:contain;border-radius:8px;margin:0}
p:has(>img:only-child){line-height:0;margin-bottom:20px}
table{width:100%;border-collapse:collapse;border-top:1px solid #6c7480;border-bottom:1px solid #6c7480;font-size:0.93rem}
th,td{border:0;padding:12px 18px 12px 0;text-align:left;font-size:0.93rem}
th{font-weight:700;color:#ecf0f5;border-bottom:1px solid #6c7480}
td{border-bottom:1px solid rgba(220,226,232,0.14)}
tr:last-child td{border-bottom:0}
blockquote{border-left:2px solid #6a7178;background:#424850;padding:0.55rem 1rem;margin-bottom:20px;color:#c4cad1;border-radius:10px}
strong{font-weight:700;color:#ecf0f5}
a{color:#c89478;text-decoration:none;font-family:inherit;font-size:inherit}
mark{background:rgba(200,148,120,0.2);color:#dde2e7;padding:0.08em 0.2em;border-radius:3px}
.page-card{box-shadow:inset 0 4px 0 #c89478}
.page-header h1{font-size:1.84em;line-height:1.16;margin-top:0;margin-bottom:0.7rem;font-weight:700;color:#ecf0f5;position:relative;padding-bottom:10px}
.page-header h1:after{content:"";display:block;width:48px;height:3px;background:#c89478;position:absolute;bottom:0;left:0;border-radius:2px}
.page-number{position:absolute;bottom:32px;right:56px;background:#c89478;color:#444a52;font-family:-apple-system,sans-serif;font-size:13px;padding:4px 14px;border-radius:999px;font-weight:500;letter-spacing:0.5px;z-index:10}`;

// Global pagination styles — injected into all themes. Color via CSS var --accent.
// resolveTheme() injects the matching --accent for each theme.
// Only styles cards and page numbers; does not modify h1 (avoids conflicting with Typora theme heading decorations).
export const PAGINATION_CSS = `.page-card{box-shadow:inset 0 4px 0 var(--accent)}.page-header h1{position:relative;padding-bottom:10px}.page-header h1:after{content:"";display:block;width:48px;height:3px;background:var(--accent);position:absolute;bottom:0;left:0;border-radius:2px}.page-number{position:absolute;bottom:32px;right:56px;background:var(--accent);color:#fff;font-family:-apple-system,sans-serif;font-size:13px;padding:4px 14px;border-radius:999px;font-weight:500;letter-spacing:0.5px;z-index:10}`;

const BUILTIN: Record<string, string> = {
  github: GITHUB_CSS,
  "claude-like": CLAUDE_LIKE_CSS,
  "claude-like-dark": CLAUDE_LIKE_DARK_CSS,
  "claude-like-grey": CLAUDE_LIKE_GREY_CSS,
};

// Accent colors for built-in themes
const BUILTIN_ACCENTS: Record<string, string> = {
  github: "#0070f3",
  "claude-like": "#bc6a3a",
  "claude-like-dark": "#d59567",
  "claude-like-grey": "#c89478",
};

const BUILTIN_ROOT_EXTRAS: Record<string, string> = {
  "claude-like-dark": [
    "--callout-fg:#ddd4ca",
    "--callout-title-fg:#f2e9df",
    "--callout-info-bg:#172026",
    "--callout-info-border:#4e9cc9",
    "--callout-note-bg:#201d29",
    "--callout-note-border:#a58add",
    "--callout-warning-bg:#2a2117",
    "--callout-warning-border:#d59567",
    "--callout-tip-bg:#18231d",
    "--callout-tip-border:#57b889",
    "--callout-danger-bg:#2a1818",
    "--callout-danger-border:#df6b5c",
  ].join(";"),
  "claude-like-grey": [
    "--callout-fg:#e2e7ec",
    "--callout-title-fg:#ecf0f5",
    "--callout-info-bg:#3d4852",
    "--callout-info-border:#8db7d3",
    "--callout-note-bg:#454252",
    "--callout-note-border:#b7a1e1",
    "--callout-warning-bg:#51483c",
    "--callout-warning-border:#d7a27f",
    "--callout-tip-bg:#3e4c45",
    "--callout-tip-border:#88c5a2",
    "--callout-danger-bg:#553f42",
    "--callout-danger-border:#e09b92",
  ].join(";"),
};

export interface ThemeResolveOptions {
  allowLocalFiles?: boolean;
}

// ── Theme resolution ───────────────────────────────────────

export async function resolveTheme(themeArg: string, options: ThemeResolveOptions = {}): Promise<string> {
  // 1. Built-in theme
  if (BUILTIN[themeArg]) {
    const accent = BUILTIN_ACCENTS[themeArg] || "#0070f3";
    const extraVars = BUILTIN_ROOT_EXTRAS[themeArg] ? `;${BUILTIN_ROOT_EXTRAS[themeArg]}` : "";
    return `:root{--accent:${accent}${extraVars}}` + BUILTIN[themeArg];
  }

  // 2. File path (.css or .zip)
  const absPath = path.resolve(themeArg);
  if (!fs.existsSync(absPath)) {
    const available = listBuiltinThemes().join(", ");
    throw new Error(`Theme not found: ${themeArg}. Built-in themes: ${available}. You can also pass a path to an existing .css or .zip file.`);
  }

  return await loadThemeFile(absPath, options);
}

function assertNoExplicitFileUrls(css: string, source: string): void {
  if (/url\(\s*["']?\s*file:/i.test(css) || /@import\s+(?:url\(\s*)?["']?\s*file:/i.test(css)) {
    throw new Error(`Explicit file: URLs in theme CSS are disabled by default (${source}). Use --allow-local-files only for trusted themes.`);
  }
}

/**
 * Resolve @import directives in CSS by inlining the imported files.
 * Handles: @import "./other.css";  @import url("./other.css");
 */
function resolveCssImports(css: string, baseDir: string, options: ThemeResolveOptions): string {
  const importRe = /@import\s+(?:url\(\s*)?["']([^"']+\.css)["'](?:\s*\))?\s*;/g;
  return css.replace(importRe, (_match, importPath: string) => {
    if (!options.allowLocalFiles && /^file:/i.test(importPath)) {
      throw new Error(`Explicit file: @import is disabled by default: ${importPath}. Use --allow-local-files only for trusted themes.`);
    }
    const resolved = path.resolve(baseDir, importPath);
    if (!fs.existsSync(resolved)) {
      console.warn(`  ⚠ @import not found: ${importPath} (resolved: ${resolved})`);
      return `/* @import "${importPath}" — file not found */`;
    }
    const importedCss = fs.readFileSync(resolved, "utf-8");
    if (!options.allowLocalFiles) {
      assertNoExplicitFileUrls(importedCss, resolved);
    }
    const resolved2 = resolveCssImports(importedCss, path.dirname(resolved), options);
    return `/* begin @import "${importPath}" */\n${resolved2}\n/* end @import "${importPath}" */`;
  });
}

/**
 * Load a theme from a CSS or ZIP file path.
 * Handles CSS file reading, ZIP extraction, @font-face rewriting, and sanitization.
 */
async function loadThemeFile(themePath: string, options: ThemeResolveOptions): Promise<string> {
  let css: string;

  if (themePath.endsWith(".zip")) {
    css = await loadZipTheme(themePath, options);
  } else {
    css = fs.readFileSync(themePath, "utf-8");
    if (!options.allowLocalFiles) {
      assertNoExplicitFileUrls(css, themePath);
    }
  }

  // Resolve @import directives
  css = resolveCssImports(css, path.dirname(themePath), options);

  // Handle font dir: rewrite relative font URLs to absolute file:// paths
  css = rewriteFontUrls(css, path.dirname(themePath));

  // Post-process: remove @media / @include-when-export / #write → body
  css = sanitizeThemeCss(css);

  // Inject --accent variable for PAGINATION_CSS
  const accent = extractAccent(css);
  css = ":root{--accent:" + accent + "}" + css;

  return css;
}

/**
 * Extract CSS and fonts from a ZIP theme package.
 * Fonts are extracted to a temp directory with absolute file:// URLs.
 */
async function loadZipTheme(zipPath: string, options: ThemeResolveOptions): Promise<string> {
  const buf = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(buf);

  // Find .css file: prefer root dir, then any location
  let cssFile: JSZip.JSZipObject | null = null;
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (!name.endsWith(".css")) continue;
    if (!cssFile || !name.includes("/")) {
      cssFile = entry;
    }
  }
  if (!cssFile) {
    throw new Error(`No .css file found in zip theme: ${zipPath}`);
  }
  let css = await cssFile.async("text");
  if (!options.allowLocalFiles) {
    assertNoExplicitFileUrls(css, zipPath);
  }

  // Parse original @font-face declarations, build fileName → FontFaceDef[] map
  const faceRe = /@font-face\s*\{([^}]+)\}/g;
  const fileMap = new Map<string, { family: string; weight: string; style: string; unicodeRange: string }[]>();
  let m: RegExpExecArray | null;
  while ((m = faceRe.exec(css)) !== null) {
    const body = m[1];
    const family = body.match(/font-family\s*:\s*["']?([^;"']+)["']?/)?.[1]?.trim() || "";
    const url = body.match(/url\s*\(\s*["']?([^)"']+)["']?\)/)?.[1]?.trim() || "";
    const weight = body.match(/font-weight\s*:\s*([^;]+)/)?.[1]?.trim() || "400";
    const style = body.match(/font-style\s*:\s*([^;]+)/)?.[1]?.trim() || "normal";
    const unicodeRange = body.match(/unicode-range\s*:\s*([^;]+)/)?.[1]?.trim() || "";

    if (!family || !url) continue;
    const fileName = path.basename(url);
    if (!fileName) continue;

    const defs = fileMap.get(fileName) || [];
    defs.push({ family, weight, style, unicodeRange });
    fileMap.set(fileName, defs);
  }

  // Remove original @font-face (relative URLs can't resolve in browser)
  css = css.replace(/@font-face\s*\{[^}]*\}/g, "");

  // Extract font files to temp dir, generate @font-face
  const fontDir = fs.mkdtempSync(path.join(os.tmpdir(), "carddown-fonts-"));
  const fontExts = [".ttf", ".ttc", ".otf", ".woff", ".woff2"];
  const fontFaces: string[] = [];

  const formatMap: Record<string, string> = {
    ".ttf": "truetype", ".ttc": "truetype",
    ".otf": "opentype",
    ".woff": "woff", ".woff2": "woff2",
  };

  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const ext = path.extname(name).toLowerCase();
    if (!fontExts.includes(ext)) continue;

    const fontData = await entry.async("nodebuffer");
    const fileName = path.basename(name);
    fs.writeFileSync(path.join(fontDir, fileName), fontData);

    const absPath = path.join(fontDir, fileName).replace(/\\/g, "/");
    const format = formatMap[ext] || "truetype";

    const defs = fileMap.get(fileName);
    if (defs && defs.length > 0) {
      for (const def of defs) {
        const parts: string[] = [
          `font-family:"${def.family}"`,
          `src:url("file:///${absPath}") format("${format}")`,
          `font-weight:${def.weight}`,
          `font-style:${def.style}`,
          `font-display:swap`,
        ];
        if (def.unicodeRange) {
          parts.push(`unicode-range:${def.unicodeRange}`);
        }
        fontFaces.push(`@font-face{${parts.join(";")}}`);
      }
    } else {
      const familyName = path.basename(name, ext)
        .replace(/[-_](regular|bold|italic|light|medium|semibold|thin|heavy|oblique|normal)$/i, "")
        .replace(/[-_]/g, " ");
      fontFaces.push(
        `@font-face{font-family:"${familyName}";src:url("file:///${absPath}") format("${format}");font-display:swap}`
      );
    }
  }

  if (fontFaces.length > 0) {
    css = fontFaces.join("\n") + "\n" + css;
  }

  return css;
}

/**
 * Rewrite @font-face url() references from relative paths to absolute file:// URLs.
 */
function rewriteFontUrls(css: string, cssDir: string): string {
  return css.replace(
    /url\(\s*["']?([^"')]+)["']?\s*\)(\s*format\([^)]+\))?/g,
    (_match, urlPath: string, existingFormat: string | undefined) => {
      if (/^(https?:|data:|file:\/\/|\/)/.test(urlPath)) {
        return _match;
      }
      const resolved = path.resolve(cssDir, urlPath).replace(/\\/g, "/");
      let formatStr = existingFormat || "";
      if (!existingFormat) {
        const ext = path.extname(urlPath).toLowerCase();
        const formatMap: Record<string, string> = {
          ".ttf": "truetype", ".ttc": "truetype",
          ".otf": "opentype",
          ".woff": "woff", ".woff2": "woff2",
        };
        const fmt = formatMap[ext];
        if (fmt) formatStr = ` format("${fmt}")`;
      }
      return `url("file:///${resolved}")${formatStr}`;
    }
  );
}

/**
 * Sanitize Typora theme CSS for static output:
 * - Remove @media blocks
 * - Remove @include-when-export directives
 * - Replace #write with body
 * - Fix overflow on pre.md-fences
 */
function sanitizeThemeCss(css: string): string {
  // Remove @media blocks — handle nested { } correctly
  let idx = 0;
  while ((idx = css.indexOf("@media", idx)) !== -1) {
    const braceStart = css.indexOf("{", idx);
    if (braceStart === -1) break;
    let depth = 1;
    let pos = braceStart + 1;
    while (pos < css.length && depth > 0) {
      if (css[pos] === "{") depth++;
      else if (css[pos] === "}") depth--;
      pos++;
    }
    css = css.substring(0, idx) + css.substring(pos);
  }
  css = css.replace(/@include-when-export[^;]*;/g, "");

  // #write selector → body
  css = css.replace(/#write/g, "body");

  // Fix overflow issues in Typora themes for static output
  css = css.replace(
    /pre\.md-fences\s*\{\s*overflow\s*:\s*visible\b([^}]*)\}/g,
    "pre.md-fences{overflow-x:auto!important$1}"
  );

  return css;
}

function extractAccent(css: string): string {
  var m = css.match(/--accent-color:\s*([^;]+)/);
  if (m) return m[1].trim();
  m = css.match(/a\s*\{[^}]*color:\s*([^;]+)/);
  if (m) return m[1].trim();
  m = css.match(/h1:after\s*\{[^}]*background:\s*([^;]+)/);
  if (m) return m[1].trim();
  return "#0070f3";
}

export function listBuiltinThemes(): string[] {
  return Object.keys(BUILTIN).sort();
}
