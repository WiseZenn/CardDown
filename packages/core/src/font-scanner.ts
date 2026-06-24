import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

// Generic font names (always available, no detection needed)
const GENERIC_FONTS = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy",
  "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace",
  "-apple-system", "blinkmacsystemfont", "segoe ui", "roboto",
  "helvetica neue", "arial", "inherit", "initial", "unset",
]);

// Normalize font names for comparison: lowercase, strip spaces/dashes/underscores.
// This bridges the gap between filename-derived names (e.g. "segoeui" from segoeui.ttf)
// and CSS font-family names (e.g. "Segoe UI").
function normalizeFontName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_.]+/g, "");
}

function getSystemFonts(): Set<string> {
  const fonts = new Set<string>();
  const platform = os.platform();
  let scanError = false;

  if (platform === "win32") {
    const fontDir = path.join(process.env.WINDIR || "C:\\Windows", "Fonts");
    try {
      for (const f of fs.readdirSync(fontDir)) {
        const ext = path.extname(f).toLowerCase();
        if ([".ttf", ".ttc", ".otf", ".woff", ".woff2"].includes(ext)) {
          fonts.add(path.basename(f, ext).toLowerCase());
        }
      }
    } catch { scanError = true; }

    // Also scan user fonts directory
    const localFontDir = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "Windows", "Fonts");
    try {
      if (fs.existsSync(localFontDir)) {
        for (const f of fs.readdirSync(localFontDir)) {
          const ext = path.extname(f).toLowerCase();
          if ([".ttf", ".ttc", ".otf"].includes(ext)) {
            fonts.add(path.basename(f, ext).toLowerCase());
          }
        }
      }
    } catch { scanError = true; }
  } else if (platform === "darwin") {
    const fontDirs = [
      "/System/Library/Fonts",
      "/Library/Fonts",
      path.join(os.homedir(), "Library", "Fonts"),
    ];
    for (const dir of fontDirs) {
      try {
        for (const f of fs.readdirSync(dir)) {
          const ext = path.extname(f).toLowerCase();
          if ([".ttf", ".ttc", ".otf"].includes(ext)) {
            fonts.add(path.basename(f, ext).toLowerCase());
          }
        }
      } catch { scanError = true; }
    }
  } else {
    // Linux: try fc-list
    try {
      const output = execSync("fc-list : family 2>/dev/null", { encoding: "utf-8", timeout: 5000 });
      for (const line of output.split("\n")) {
        const trimmed = line.trim().toLowerCase();
        if (!trimmed) continue;
        // fc-list may return comma-separated family names for multi-family fonts
        for (const name of trimmed.split(",")) {
          const clean = name.trim();
          if (clean) fonts.add(clean);
        }
      }
    } catch { scanError = true; }
  }

  if (scanError && fonts.size === 0) {
    console.warn("Could not scan system fonts — font availability check will be unavailable.");
  }

  return fonts;
}

export function extractFontFamilies(css: string): string[] {
  const families = new Set<string>();
  // Match font-family: "Font Name", 'Font Name', Font Name;
  const re = /font-family\s*:\s*([^;}]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    // Skip font-family inside @font-face (injected by zip, considered available)
    const before = css.substring(0, m.index);
    if (/@font-face\s*\{[^}]*$/.test(before)) continue;

    const values = m[1];
    for (const part of values.split(",")) {
      let name = part.trim().replace(/^["']|["']$/g, "").toLowerCase();
      // Skip CSS variables and !important remnants
      if (!name || name.startsWith("var(") || name.includes("!important")) continue;
      if (!GENERIC_FONTS.has(name)) {
        families.add(name);
      }
    }
  }
  return [...families];
}

// Extract font family names declared in @font-face (considered available)
function extractDeclaredFontFamilies(css: string): Set<string> {
  const declared = new Set<string>();
  const faceRe = /@font-face\s*\{[^}]*\}/g;
  let block: RegExpExecArray | null;
  while ((block = faceRe.exec(css)) !== null) {
    const familyMatch = block[0].match(/font-family\s*:\s*["']?([^;"'}]+)["']?/);
    if (familyMatch) {
      declared.add(familyMatch[1].trim().toLowerCase());
    }
  }
  return declared;
}

export function scanMissingFonts(css: string): string[] {
  const requiredFonts = extractFontFamilies(css);
  if (requiredFonts.length === 0) return [];

  const systemFonts = getSystemFonts();
  const declaredFonts = extractDeclaredFontFamilies(css);
  const missing: string[] = [];

  // Pre-normalize system font names for efficient comparison
  const normalizedSystem = new Map<string, string>();
  for (const sys of systemFonts) {
    normalizedSystem.set(normalizeFontName(sys), sys);
  }

  for (const font of requiredFonts) {
    // Fonts declared in @font-face are considered available
    if (declaredFonts.has(font)) continue;
    // Check system fonts using normalized name comparison
    // This handles filename-derived names (e.g. "segoeui" matches "Segoe UI")
    const normFont = normalizeFontName(font);
    const found = normalizedSystem.has(normFont);
    if (!found) {
      missing.push(font);
    }
  }

  return missing;
}
