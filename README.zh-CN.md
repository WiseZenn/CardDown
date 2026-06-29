# CardDown

<p align="center">
  <img src="./docs/assets/brand/carddown-icon.svg" alt="CardDown 图标" width="112" height="112">
</p>
<p align="center">
  <strong>可配置、可换肤的 Markdown 卡片渲染器。</strong>
</p>

<p align="center">
  <a href="./README.md">English</a> | <a href="#快速开始">快速开始</a> | <a href="#展示示例">展示示例</a> | <a href="#命令行参数">命令行参数</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@carddown/cli"><img alt="npm version" src="https://img.shields.io/npm/v/@carddown/cli"></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg"></a>
  <a href="https://github.com/WiseZenn/carddown/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/WiseZenn/carddown/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://nodejs.org"><img alt="Node.js" src="https://img.shields.io/badge/node-%3E%3D20.11-brightgreen"></a>
</p>

![CardDown Claude 亮色展示图](./docs/assets/readme/carddown-claude-light-showcase.png)

CardDown 可以把 Markdown 文档渲染成排版精致、自动分页的图片卡片。它面向技术文章、课程笔记、教程长文、复盘文档、Vibe Coding 过程记录，以及需要在图文平台或短视频里展示的长内容。CardDown 的特色是浏览器级渲染、智能分页、尺寸可配置、主题可定制：默认输出 1080x1440，但宽度、高度、内边距和缩放倍数都可以调整；主题既有内置风格，也支持外部 CSS 和 Typora `.zip` 主题包。

## 适合什么场景

- 把长文档拆成可连续阅读的图文卡片。
- 用可配置尺寸适配小红书、抖音图文、文章配图、课程讲义等不同场景。
- 用内置主题快速出图，也可以接入自己的 CSS 或 Typora 主题包。
- 把数学公式、代码块、表格和 callout 保持成清晰排版。
- 给脚本、Agent 或批量任务返回结构化 JSON。

## 核心能力

- 智能分页：标题、段落、代码块、表格、图片和公式会尽量保持可读。
- 主题可定制：内置 `github` / `claude-like` 系列主题，也支持外部 `.css` 和 Typora `.zip` 主题包。
- 输出可配置：默认 1080x1440 PNG 卡片，可调整宽度、高度、内边距、缩放倍数，也支持自动封面和页码。
- Markdown 支持完整：GFM 表格、任务列表、代码高亮、KaTeX 数学公式、`==高亮==`、引用块、Obsidian 风格 callout。
- 适合自动化且默认更安全：`--json` 输出可供脚本消费，原始 HTML 和显式 `file:` URL 默认关闭。

## 快速开始

```bash
npm install -g @carddown/cli
npx playwright install chromium

carddown -i document.md
```

默认输出目录是 `./output/`。

## 从 GitHub 运行

```bash
git clone https://github.com/WiseZenn/carddown.git
cd carddown
npm ci
npx playwright install chromium

npm run dev
npm start -- --input path/to/document.md
npm start -- --help
```

`npm start --` 会先构建 Core 和 CLI 工作区，然后把后续参数转发给编译后的 `carddown` 命令。

## 展示示例

上方展示图使用仓库内置的数值分析示例和 Claude 亮色主题生成：

```bash
npm start -- --input examples/demo-numerical-analysis.md \
  --theme claude-like \
  --output output/douyin-demo-claude-light \
  --name douyin-demo-claude-light \
  --scale 1
```

使用默认卡片尺寸时，这条命令会生成 1 张封面和 6 张内容卡片，适合直接作为图文轮播、短视频切片或后续海报设计素材：

```text
output/douyin-demo-claude-light/
├── douyin-demo-claude-light_00_cover.png
├── douyin-demo-claude-light_01.png
├── douyin-demo-claude-light_02.png
├── douyin-demo-claude-light_03.png
├── douyin-demo-claude-light_04.png
├── douyin-demo-claude-light_05.png
└── douyin-demo-claude-light_06.png
```

## 命令行参数

```bash
carddown -i <file> [options]
cat doc.md | carddown --json
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-i, --input <file>` | 输入 Markdown 文件；省略时读取 stdin | - |
| `-o, --output <dir>` | 输出目录 | `./output` |
| `-n, --name <name>` | 输出文件名前缀 | 输入文件名或 `output` |
| `--theme <name\|.css>` | 内置主题名，或外部 `.css` / `.zip` 主题路径 | `github` |
| `--scale <number>` | 输出缩放倍数 | `2` |
| `--width <px>` | 卡片宽度 | `1080` |
| `--height <px>` | 卡片高度 | `1440` |
| `--padding <px>` | 卡片内边距 | `48` |
| `--no-cover` | 关闭自动封面 | - |
| `--max-code-lines <n>` | 每页最多代码行数，`0` 表示不限制 | `0` |
| `--fill-threshold <n>` | 页面填充阈值，范围 0-1 | `0.85` |
| `--format <type>` | 输出格式：`png` 或 `pdf` | `png` |
| `--profile <file>` | YAML/JSON 配置文件路径 | - |
| `--allow-html` | 允许渲染 Markdown 中的原始 HTML，仅用于可信输入 | - |
| `--allow-local-files` | 允许 Markdown/CSS 中显式 `file:` URL，仅用于可信输入 | - |
| `--json` | 输出结构化 JSON | - |

配置优先级：命令行显式参数 > `--profile` 配置文件 > CLI 默认值。

数值参数会严格校验：`--scale` 必须 >= 1；`--width`、`--height`、`--padding`、`--max-code-lines` 必须是正整数；`--fill-threshold` 必须在 0-1 之间；`--format` 只能是 `png` 或 `pdf`。

## 常用命令

```bash
carddown -i examples/sample.md
carddown -i doc.md --theme claude-like
carddown -i doc.md --theme ./custom.css --scale 1
carddown list themes
carddown list themes --json
```

## 内置主题

```text
github
claude-like
claude-like-dark
claude-like-grey
```

也支持外部 `.css` 文件和 Typora `.zip` 主题包。未知主题名或不存在的主题文件会直接报错。可以用 `carddown list themes` 查看当前内置主题。

## JSON 输出

```bash
carddown -i file.md --json
```

成功时：

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

失败时：

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

## 安全默认值

默认不会渲染 Markdown 里的原始 HTML。只有在输入可信时再开启：

```bash
carddown -i doc.md --allow-html
```

Markdown 和外部主题 CSS 里的显式 `file:` URL 默认也会被拒绝。相对路径图片仍会转换为 data URL。只有在文档和主题都可信时再开启：

```bash
carddown -i doc.md --allow-local-files
```

## 浏览器依赖

CardDown 使用 Playwright 启动 Chromium 完成渲染。如果缺少浏览器：

```bash
npx playwright install chromium
```

在 CI 或服务器环境中，需要允许 headless browser 运行，并安装 Playwright 对应平台依赖。

## 项目结构

```text
packages/
├── core/                 可复用的 @carddown/core 渲染 API
│   └── src/
│       ├── index.ts      Core 公开导出
│       ├── parser.ts     Markdown -> HTML
│       ├── paginator.ts  Playwright 渲染编排
│       └── themes.ts     内置和外部主题
└── cli/                  发布的 carddown 命令
    └── src/
        ├── index.ts      Commander.js 入口
        └── config/       YAML/JSON 配置和校验
apps/
├── desktop/              预留给 CardDown Desktop
└── studio/               预留给 CardDown Studio
tools/                    仓库内部工具
```

## 开发

```bash
npm ci
npx playwright install chromium
npm run typecheck
npm run build
npm test
npm run test:render
npm run batch-export
```

根工作区是 private，只是为了避免误发布 workspace wrapper。`@carddown/core` 是公开发布的运行时依赖，供 `carddown` CLI 使用。

## 贡献与安全

- 贡献指南：[CONTRIBUTING.md](./CONTRIBUTING.md)
- 安全策略：[SECURITY.md](./SECURITY.md)
- 更新日志：[CHANGELOG.md](./CHANGELOG.md)

## License

[MIT](./LICENSE)
