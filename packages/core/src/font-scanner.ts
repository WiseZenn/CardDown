import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

// Generic font names are always valid CSS fallbacks and do not need filesystem detection.
const GENERIC_FONTS = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy",
  "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace",
  "-apple-system", "blinkmacsystemfont", "segoe ui", "roboto",
  "helvetica neue", "arial", "inherit", "initial", "unset",
]);

function normalizeFontName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_.]+/g, "");
}

function isGenericFont(name: string): boolean {
  const lower = name.toLowerCase();
  return GENERIC_FONTS.has(lower) || GENERIC_FONTS.has(normalizeFontName(lower));
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
    try {
      const output = execSync("fc-list : family 2>/dev/null", { encoding: "utf-8", timeout: 5000 });
      for (const line of output.split("\n")) {
        const trimmed = line.trim().toLowerCase();
        if (!trimmed) continue;
        for (const name of trimmed.split(",")) {
          const clean = name.trim();
          if (clean) fonts.add(clean);
        }
      }
    } catch { scanError = true; }
  }

  if (scanError && fonts.size === 0) {
    console.warn("Could not scan system fonts - font availability check will be unavailable.");
  }

  return fonts;
}

function parseFontFamilyList(values: string): string[] {
  return values
    .split(",")
    .map((part) => part.trim().replace(/^['"]|['"]$/g, "").toLowerCase())
    .filter((name) => name && !name.startsWith("var(") && !name.includes("!important"));
}

function extractFontFamilyStacks(css: string): string[][] {
  const stacks: string[][] = [];
  const re = /font-family\s*:\s*([^;}]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const before = css.substring(0, m.index);
    if (/@font-face\s*\{[^}]*$/.test(before)) continue;

    const stack = parseFontFamilyList(m[1]);
    if (stack.length > 0) stacks.push(stack);
  }
  return stacks;
}

export function extractFontFamilies(css: string): string[] {
  const families = new Set<string>();
  for (const stack of extractFontFamilyStacks(css)) {
    for (const name of stack) {
      if (!isGenericFont(name)) families.add(name);
    }
  }
  return [...families];
}

function extractDeclaredFontFamilies(css: string): Set<string> {
  const declared = new Set<string>();
  const faceRe = /@font-face\s*\{[^}]*\}/g;
  let block: RegExpExecArray | null;
  while ((block = faceRe.exec(css)) !== null) {
    const familyMatch = block[0].match(/font-family\s*:\s*["']?([^;"'}]+)["']?/);
    if (familyMatch) {
      declared.add(normalizeFontName(familyMatch[1].trim()));
    }
  }
  return declared;
}

function fontIsAvailable(font: string, normalizedSystem: Set<string>, declaredFonts: Set<string>): boolean {
  const normalized = normalizeFontName(font);
  return declaredFonts.has(normalized) || normalizedSystem.has(normalized);
}

export function scanMissingFonts(css: string): string[] {
  const stacks = extractFontFamilyStacks(css);
  if (stacks.length === 0) return [];

  const normalizedSystem = new Set<string>();
  for (const sys of getSystemFonts()) {
    normalizedSystem.add(normalizeFontName(sys));
  }
  const declaredFonts = extractDeclaredFontFamilies(css);
  const missing = new Set<string>();

  for (const stack of stacks) {
    const namedFonts = stack.filter((font) => !isGenericFont(font));
    if (namedFonts.length === 0) continue;

    const hasGenericFallback = stack.some(isGenericFont);
    const hasAvailableNamedFont = namedFonts.some((font) => fontIsAvailable(font, normalizedSystem, declaredFonts));
    if (hasGenericFallback || hasAvailableNamedFont) continue;

    for (const font of namedFonts) {
      missing.add(font);
    }
  }

  return [...missing];
}
