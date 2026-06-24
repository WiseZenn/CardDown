# Changelog

## Unreleased

## 1.2.0 - 2026-06-23

### Changed

- Reorganized the repository as an npm workspace monorepo.
- Added the reusable `@carddown/core` package for parsing, theming, pagination, and rendering.
- Moved the published `carddown` command into `packages/cli`.
- Reserved `apps/studio` and `apps/desktop` for future CardDown products.
- Publish `@carddown/core` as the public runtime dependency for the `carddown` CLI.
- Added release dry-run coverage for both workspace packages.

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