# Changelog

## Unreleased

### Fixed

- Long lists, tables, blockquotes and oversized paragraphs no longer abort the entire render. Blocks taller than one page are now split across pages, and anything that still cannot fit is clipped with a warning instead of failing the run.
- `--max-code-lines` now actually limits code lines per page. Previously, a code block longer than the limit was emitted whole onto one page and failed the render.
- Document titles containing `$&`, `$'`, `` $` `` or `$$` no longer crash the render or silently corrupt page headers.
- `==highlight==` is readable again on `claude-like-dark` and `claude-like-grey`. Parser CSS was overriding every theme's `mark` styling with a light background; themes now own their own highlight colors.
- Page headers and cover titles show real text instead of HTML entities (a title containing `&` used to render as `&#x26;`).
- Paragraphs that mix an image with text no longer collapse to zero line height, which had made their text unreadable.
- PDF output no longer prints content twice. Blocks that fit on a page were left visible in the document, so the flow layout used for PDF printed both the original and the paginated card.
- Previous output files are removed only after a successful render, so a failed run no longer deletes the last good output.
- Temporary HTML files created during a render are now cleaned up.
- `carddown --version` now reports the actual package version. 1.2.1 shipped reporting `1.2.0`.

### Changed

- `npm test` now runs browser-backed render checks, so a broken pagination algorithm fails in CI instead of shipping.
- CI covers Windows as well as Linux, and Node 20.11 (the declared minimum) as well as 22.

## 1.2.1 - 2026-06-30

### Changed

- Changed the default CLI theme from `github` to `claude-like`.
- Updated README examples for the Claude light default theme, paths with spaces, and global update commands.

### Fixed

- Reduced noisy missing-font warnings by checking whole `font-family` fallback stacks instead of reporting every absent preferred font.

## 1.2.0 - 2026-06-23

### Changed

- Reorganized the repository as an npm workspace monorepo.
- Added the reusable `@carddown/core` package for parsing, theming, pagination, and rendering.
- Moved the published CLI package into `packages/cli` while keeping the installed `carddown` command.
- Reserved `apps/studio` and `apps/desktop` for future CardDown products.
- Publish `@carddown/core` as the public runtime dependency for the `@carddown/cli` package after npm rejected the unscoped `carddown` package name.
- Added release dry-run coverage for both workspace packages.
- Added CLI-only publish scripts for the case where Core has already been published for the current version.

### Fixed

- Allowed remote `http:` and `https:` Markdown images under the generated CSP.
- Fixed Linux font scanning under ESM by removing runtime `require()` usage.
- Report true rendered page counts for PDF JSON and terminal output.
- Wired `--fill-threshold` into the browser pagination algorithm.
- Preserved heading order during fill balancing when moving consecutive heading groups.
- Resolved `.zip` theme internal `@import` and relative asset URLs against archive paths.

## 1.1.0

### Changed

- **License**: Switched from ISC to MIT.
- **Documentation**: Full English translation of README, CLI help text, source comments, error messages, and batch export script.
- **README**: Added npm version, license, CI status, and Node.js badges.
- **Internal docs**: Moved `docs/project-docs/`, `CLAUDE.md`, `AGENTS.md` to `.gitignore` (not published).

### Fixed

- CLI help text and all user-facing messages now consistently English.
- Test scripts updated to match translated error messages.

## 1.0.0

- Initial public-ready CardDown CLI package.
- Converts Markdown from files or stdin into paginated PNG cards or PDF output.
- Supports cover pages, JSON output, strict CLI/config validation, built-in themes, external CSS/ZIP themes, KaTeX math, callouts, local image embedding, and browser-backed rendering through Playwright.
- Defaults raw HTML and explicit `file:` URLs off for safer untrusted-input handling.