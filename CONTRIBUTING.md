# Contributing to CardDown

Thanks for helping improve CardDown. This project is a TypeScript CLI that turns Markdown into paginated image cards.

## Development Setup

```bash
npm install
npx playwright install chromium
npm test
```

To run the CLI directly from a clone:

```bash
npm start -- --input examples/sample.md
```

Use `npm run test:render` after changes to parsing, theming, pagination, screenshots, or browser launch behavior.

## Pull Request Checklist

- Keep changes focused on the reported issue or feature.
- Run `npm test` before opening a PR.
- Run `npm run test:render` when rendered output could change.
- Update `README.md` or `CHANGELOG.md` for user-visible changes.
- Avoid committing generated `dist/`, `output/`, cache folders, tarballs, or local binaries.

## Code Style

Formatting and linting are enforced in CI, and both are part of `npm test`:

```bash
npm run format        # apply Prettier
npm run lint          # ESLint
npm run format:check  # what CI runs
```

Configuration lives in `.prettierrc.json`, `.prettierignore` and `eslint.config.js`. Two paths are deliberately excluded from both tools:

- `packages/core/src/paginator-algo.js` is not valid JavaScript on disk. It is a template — `paginator.ts` substitutes `{{PW}}`, `{{FILL}}`, `{{DOC_TITLE}}` and friends before the text is handed to `page.evaluate()` — so Prettier and ESLint both fail to parse it. Do not add it to a linter glob.
- `docs/assets/` holds brand and design sources rather than code.

## Code Notes

- Import reusable rendering capabilities from the public `@carddown/core` entry point.
- Keep CLI-only behavior inside `packages/cli`.
- `packages/core/src/paginator-algo.js` runs inside Chromium through `page.evaluate()`. Keep it plain JavaScript.
- Browser-context constants must be passed into the algorithm explicitly.
- Prefer remark/rehype transforms for Markdown behavior rather than serialized HTML regex replacements.
- Raw HTML and explicit `file:` URLs are trusted-input features. Keep the default path conservative.
