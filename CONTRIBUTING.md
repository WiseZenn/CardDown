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

## Visual Checks

`npm test` includes `scripts/test-visual.js`, which renders a fixture and asserts invariants on the resulting pixels: pages are not blank, the page-number badge is not a flat rectangle, and continuation pages carry a running header. Those three hold on any platform and catch content that silently failed to paint.

It deliberately does **not** compare against committed reference images. Rendered pixels depend on installed fonts and the platform's text rasteriser, so a Unix CI runner and a Windows machine produce measurably different PNGs for identical markup — a committed baseline would fail on one of them for reasons unrelated to the change.

For a same-machine comparison, where an exact match *is* meaningful:

```bash
node scripts/test-visual.js --diff output/render-before output/render-after
```

It prints the bounding box of each difference, which names the element that broke. On a real regression this reported `bounding box x 973-1009, y 1388-1401` — the page-number badge — rather than leaving a pixel count to interpret.

## Code Notes

- Import reusable rendering capabilities from the public `@carddown/core` entry point.
- Keep CLI-only behavior inside `packages/cli`.
- `packages/core/src/paginator-algo.js` runs inside Chromium through `page.evaluate()`. Keep it plain JavaScript.
- Browser-context constants must be passed into the algorithm explicitly.
- Prefer remark/rehype transforms for Markdown behavior rather than serialized HTML regex replacements.
- Raw HTML and explicit `file:` URLs are trusted-input features. Keep the default path conservative.
