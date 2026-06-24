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

## Run From GitHub

You do not need a globally installed npm package to use CardDown from this repository.

```bash
git clone https://github.com/WiseZenn/carddown.git
cd carddown
npm ci
npx playwright install chromium

# Convert the included example
npm run dev

# Convert your own Markdown file
npm start -- --input path/to/document.md

# Show every CLI option
npm start -- --help
```

Output images are saved to `./output/` by default.

`npm start --` builds the Core and CLI workspaces, then forwards the remaining
arguments to the compiled `carddown` command.

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
packages/
├── core/                 Reusable @carddown/core rendering API
│   └── src/
│       ├── index.ts      Public Core exports
│       ├── parser.ts     Markdown → HTML
│       ├── paginator.ts  Playwright rendering orchestration
│       └── themes.ts     Built-in and external themes
└── cli/                  Published carddown command
    └── src/
        ├── index.ts      Commander.js entry
        └── config/       YAML/JSON config and validation
apps/
├── desktop/              Reserved for CardDown Desktop
└── studio/               Reserved for CardDown Studio
tools/                    Repository-only utilities
```

## Development

```bash
npm ci                    # Install the exact workspace dependencies
npx playwright install chromium
npm run typecheck         # Type-check workspace projects
npm run build             # Compile to dist/
npm test                  # Run all checks
npm run test:render       # Optional browser-backed render test
npm run batch-export      # Render every example with every built-in theme
```

The repository is public on GitHub. The root workspace is private only to
prevent accidental publication of the workspace wrapper. `@carddown/core` is a
published runtime dependency used by the `carddown` CLI.

## Contributing & Security

- Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security policy: [SECURITY.md](./SECURITY.md)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)

## License

[MIT](./LICENSE)
