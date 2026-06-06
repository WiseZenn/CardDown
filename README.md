# CardDown

[![npm version](https://img.shields.io/npm/v/carddown)](https://www.npmjs.com/package/carddown)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/WiseZenn/carddown/actions/workflows/ci.yml/badge.svg)](https://github.com/WiseZenn/carddown/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.11-brightgreen)](https://nodejs.org)

Convert Markdown files into paginated image cards. Default output is 1080×1440px PNG cards with smart pagination, cover pages, KaTeX math, code syntax highlighting, and multiple themes.

## Quick Start

```bash
# Install from npm
npm install -g carddown
npx playwright install chromium

# Convert a file
carddown -i document.md
```

Or run from source:

```bash
git clone https://github.com/WiseZenn/carddown.git
cd carddown
npm install
npx playwright install chromium
npm run dev
```

Output images are saved to `./output/` by default.

## Usage

```bash
carddown -i <file> [options]
cat doc.md | carddown --json
```

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --input <file>` | Input Markdown file; reads stdin if omitted | — |
| `-o, --output <dir>` | Output directory | `./output` |
| `-n, --name <name>` | Output filename prefix | Input filename or `output` |
| `--theme <name\|.css>` | Built-in theme name, or path to external `.css` / `.zip` theme | `github` |
| `--scale <number>` | Output scale factor | `2` |
| `--width <px>` | Card width | `1080` |
| `--height <px>` | Card height | `1440` |
| `--padding <px>` | Card padding | `48` |
| `--no-cover` | Disable automatic cover page | — |
| `--max-code-lines <n>` | Max code lines per page (`0` = unlimited) | `0` |
| `--fill-threshold <n>` | Page fill threshold, range 0–1 | `0.85` |
| `--format <type>` | Output format: `png` or `pdf` | `png` |
| `--profile <file>` | YAML/JSON config file path | — |
| `--allow-html` | Allow raw HTML in Markdown (trusted input only) | — |
| `--allow-local-files` | Allow explicit `file:` URLs in Markdown/CSS (trusted input only) | — |
| `--json` | Output structured JSON (for agents and scripts) | — |

Config precedence: explicit CLI args > `--profile` file > CLI defaults.

Numeric options are strictly validated: `--scale` must be ≥ 1, `--width` / `--height` / `--padding` / `--max-code-lines` must be positive integers, `--fill-threshold` must be 0–1, `--format` must be `png` or `pdf`.

## Examples

```bash
carddown -i examples/sample.md
carddown -i doc.md --theme claude-like
carddown -i doc.md --theme ./custom.css --scale 1
carddown -i doc.md --format pdf
carddown list themes
carddown list themes --json
```

## Built-in Themes

```text
github
claude-like
claude-like-dark
claude-like-grey
```

External `.css` files and Typora `.zip` theme packs are also supported. Unknown theme names or missing files will produce an error. Use `carddown list themes` to see available built-in themes.

## JSON Output

```bash
carddown -i file.md --json
```

On success:

```json
{
  "status": "success",
  "images": {
    "cover": "/absolute/path/output/file_00_cover.png",
    "content": ["/absolute/path/output/file_01.png"]
  },
  "metadata": {
    "input_file": "/absolute/path/file.md",
    "output_path": "/absolute/path/output",
    "theme_used": "github",
    "scale": 2,
    "page_count": 1,
    "duration_seconds": 3.2,
    "fonts_missing": []
  }
}
```

On error:

```json
{
  "status": "error",
  "images": {
    "cover": null,
    "content": []
  },
  "metadata": {
    "input_file": "missing.md",
    "output_path": "",
    "theme_used": "github",
    "scale": 2,
    "page_count": 0,
    "duration_seconds": 0,
    "fonts_missing": []
  },
  "message": "ENOENT: no such file or directory"
}
```

## Security

By default, raw HTML in Markdown is **not** rendered. To enable it for trusted documents:

```bash
carddown -i doc.md --allow-html
```

Do **not** use `--allow-html` with untrusted Markdown. This mode preserves raw HTML from the input as-is.

By default, explicit `file:` URLs in Markdown and external theme CSS are rejected to prevent the browser renderer from accessing unexpected local files. Relative-path images are still converted to data URLs. Only use this flag with trusted documents and themes:

```bash
carddown -i doc.md --allow-local-files
```

## Browser Dependency

CardDown uses Playwright to launch Chromium for rendering. If the browser is missing or fails to start:

```bash
npx playwright install chromium
```

In CI or server environments, ensure headless browser execution is allowed and install the platform-specific dependencies required by Playwright.

## Project Structure

```text
src/
├── index.ts              CLI entry (Commander.js)
├── parser.ts             Markdown → HTML (unified + KaTeX + local image embedding)
├── paginator.ts          Playwright rendering and screenshot orchestration
├── paginator-algo.js     Browser-context pagination algorithm
├── themes.ts             Built-in themes and external theme loading
├── font-scanner.ts       Missing font detection
├── types.ts              Shared types
└── config/
    └── config-loader.ts  YAML/JSON config loading and validation
```

## Development

```bash
npm run typecheck         # Type-check without emitting
npm run build             # Compile to dist/
npm test                  # Run all checks
npm run test:render       # Optional browser-backed render test
```

## Contributing & Security

- Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security policy: [SECURITY.md](./SECURITY.md)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)

## License

[MIT](./LICENSE)
