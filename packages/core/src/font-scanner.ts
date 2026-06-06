import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Generic font names (always available, no detection needed)
const GENERIC_FONTS = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy",
  "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace",
  "-apple-system", "blinkmacsystemfont", "segoe ui", "roboto",
  "helvetica neue", "arial", "inherit", "initial", "unset",
]);

function getSystemFonts(): Set<string> {
  const fonts = new Set<string>();
  const platform = os.platform();

  if (platform === "win32") {
    const fontDir = path.join(process.env.WINDIR || "C:\\Windows", "Fonts");
    try {
      for (const f of fs.readdirSync(fontDir)) {
        const ext = path.extname(f).toLowerCase();
        if ([".ttf", ".ttc", ".otf", ".woff", ".woff2"].includes(ext)) {
          fonts.add(path.basename(f, ext).toLowerCase());
        }
      }
    } catch { /* ignore */ }

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
    } catch { /* ignore */ }
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
      } catch { /* ignore */ }
    }
  } else {
    // Linux: try fc-list
    try {
      const { execSync } = require("child_process");
      const output = execSync("fc-list : family 2>/dev/null", { encoding: "utf-8", timeout: 5000 });
      for (const line of output.split("\n")) {
        const name = line.trim().toLowerCase();
        if (name) fonts.add(name);
      }
    } catch { /* ignore */ }
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

  for (const font of requiredFonts) {
    // Fonts declared in @font-face are considered available
    if (declaredFonts.has(font)) continue;
    // Check system fonts
    const found = [...systemFonts].some((sys) => sys.includes(font) || font.includes(sys));
    if (!found) {
      missing.push(font);
    }
  }

  return missing;
}
