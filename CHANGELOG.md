# Changelog

## Unreleased

### Changed

- Reorganized the repository as an npm workspace monorepo.
- Added the reusable `@carddown/core` package for parsing, theming, pagination, and rendering.
- Moved the published `carddown` command into `packages/cli`.
- Reserved `apps/studio` and `apps/desktop` for future CardDown products.

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
