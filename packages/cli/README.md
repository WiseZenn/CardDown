# CardDown CLI

The `carddown` command converts Markdown files into paginated PNG cards or PDF output.

```bash
npm install -g @carddown/cli
npx playwright install chromium

carddown -i document.md
```

Common options:

```bash
carddown -i doc.md --theme claude-like
carddown -i doc.md --format pdf
carddown -i doc.md --json
carddown list themes
```

By default, raw HTML and explicit `file:` URLs are disabled. Use
`--allow-html` and `--allow-local-files` only for trusted documents and themes.

CardDown uses Playwright Chromium for rendering. If Chromium is missing, run:

```bash
npx playwright install chromium
```

See the [CardDown repository](https://github.com/WiseZenn/carddown) for full documentation.
