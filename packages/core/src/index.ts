export {
  buildCoverHtml,
  ensureKatexAssets,
  extractCoverData,
  parseMarkdown,
  parseMarkdownString,
} from "./parser.js";
export type { CoverData, ParseMarkdownOptions } from "./parser.js";

export { renderToPages } from "./paginator.js";
export type { RenderOptions } from "./paginator.js";

export { listBuiltinThemes, PAGINATION_CSS, resolveTheme } from "./themes.js";
export type { ThemeResolveOptions } from "./themes.js";

export { extractFontFamilies, scanMissingFonts } from "./font-scanner.js";

export { DEFAULTS } from "./types.js";
export type { PageDimensions } from "./types.js";
