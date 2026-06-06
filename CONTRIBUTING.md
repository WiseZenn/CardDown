# Contributing to CardDown

Thanks for helping improve CardDown. This project is a TypeScript CLI that turns Markdown into paginated image cards.

## Development Setup

```bash
npm install
npx playwright install chromium
npm test
```

Use `npm run test:render` after changes to parsing, theming, pagination, screenshots, or browser launch behavior.

## Pull Request Checklist

- Keep changes focused on the reported issue or feature.
- Run `npm test` before opening a PR.
- Run `npm run test:render` when rendered output could change.
- Update `README.md` or `CHANGELOG.md` for user-visible changes.
- Avoid committing generated `dist/`, `output/`, cache folders, tarballs, or local binaries.

## Code Notes

- `src/paginator-algo.js` runs inside Chromium through `page.evaluate()`. Keep it plain JavaScript.
- Browser-context constants must be passed into the algorithm explicitly.
- Prefer remark/rehype transforms for Markdown behavior rather than serialized HTML regex replacements.
- Raw HTML and explicit `file:` URLs are trusted-input features. Keep the default path conservative.
