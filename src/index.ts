#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { parseMarkdown, parseMarkdownString, extractCoverData, buildCoverHtml } from "./parser.js";
import { renderToPages } from "./paginator.js";
import { resolveTheme, listBuiltinThemes } from "./themes.js";
import { loadConfig, mergeConfig, validateRenderOptions } from "./config/config-loader.js";
import { scanMissingFonts } from "./font-scanner.js";
import * as path from "path";
import type { OutputResult } from "./types.js";

const program = new Command();

program
  .exitOverride((err) => {
    if (err.code === "commander.helpDisplayed" || err.code === "commander.version") {
      process.exit(0);
    }
    throw err;
  })
  .configureOutput({
    writeErr: (str) => {
      if (!process.argv.includes("--json")) {
        process.stderr.write(str);
      }
    },
  });

program
  .name("carddown")
  .description("Markdown → paginated image cards. Default 1080×1440px, smart pagination, multi-theme.")
  .version("1.1.0")
  .addHelpText(
    "after",
    `
${chalk.bold("Examples:")}
  $ carddown -i README.md                        # Basic conversion
  $ carddown -i doc.md --theme claude-like        # Use built-in theme
  $ carddown -i doc.md --theme ./custom.css       # Use external CSS theme
  $ carddown -i doc.md --scale 2 --json           # 2x retina + Agent JSON output
  $ carddown -i doc.md --format pdf               # Export vector PDF
  $ cat doc.md | carddown --json                  # Read from stdin pipe
  $ carddown list themes                          # List all built-in themes
  $ carddown list themes --json                   # List themes as JSON

${chalk.bold("Config file:")}
  $ carddown -i doc.md --profile config.yaml      # Load options from config file
`
  );

// ── Main convert command ───────────────────────────────────

program
  .option("-i, --input <file>", "Input Markdown file (reads stdin if omitted)")
  .option("-o, --output <dir>", "Output directory", "./output")
  .option("-n, --name <name>", "Output filename prefix (defaults to input filename)")
  .option("--json", "Output structured JSON (for agents and scripts)")
  .option("--theme <name|.css>", "Theme: github / claude-like / claude-like-dark / claude-like-grey, or external .css path")
  .option("--scale <number>", "Output scale factor", "2")
  .option("--width <px>", "Card width in pixels", "1080")
  .option("--height <px>", "Card height in pixels", "1440")
  .option("--padding <px>", "Card padding in pixels", "48")
  .option("--no-cover", "Disable automatic cover page")
  .option("--max-code-lines <n>", "Max code lines per page (0 = unlimited)", "0")
  .option("--fill-threshold <n>", "Page fill threshold, 0-1", "0.85")
  .option("--format <type>", "Output format: png / pdf", "png")
  .option("--profile <file>", "YAML/JSON config file path")
  .option("--allow-html", "Allow raw HTML in Markdown (trusted input only)")
  .option("--allow-local-files", "Allow explicit file: URLs in Markdown/CSS (trusted input only)")
  .option("--list-themes", "List built-in themes (also: carddown list themes)");

// ── list subcommand ────────────────────────────────────────

const listCmd = program.command("list").description("List available resources");

listCmd
  .command("themes")
  .description("List built-in themes")
  .action(() => handleListThemes(!!program.opts().json));

// ── Helper functions ───────────────────────────────────────

function handleListThemes(asJson: boolean): void {
  if (asJson) {
    process.stdout.write(JSON.stringify(listBuiltinThemes(), null, 2) + "\n");
  } else {
    console.log(chalk.bold("Built-in themes:"));
    listBuiltinThemes().forEach((t) => console.log(chalk.cyan(`  - ${t}`)));
  }
}

function emitJsonError(opts: Record<string, unknown>, message: string, exitCode = 1): never {
  const inputFile = (opts.input as string | undefined) || "(stdin)";
  const outputPath = opts.output ? path.resolve(opts.output as string) : "";
  const scaleValue = Number(String(opts.scale ?? "2").trim());
  const scale = Number.isFinite(scaleValue) && scaleValue >= 1 ? scaleValue : 2;
  const result: OutputResult = {
    status: "error",
    images: { cover: null, content: [] },
    metadata: {
      input_file: inputFile === "(stdin)" ? inputFile : path.resolve(inputFile),
      output_path: outputPath,
      theme_used: (opts.theme as string) || "github",
      scale,
      page_count: 0,
      duration_seconds: 0,
      fonts_missing: [],
    },
    message,
  };
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(exitCode);
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";

  // Pause stdin to ensure exclusive read (Commander may have resumed it)
  process.stdin.pause();
  process.stdin.resume();

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// ── Convert logic ──────────────────────────────────────────

program.action(async (opts) => {
  const asJson = !!opts.json;
  let errorOpts = opts as Record<string, string | boolean | undefined>;

  try {
    // --list-themes (backward compat)
    if (opts.listThemes) {
      handleListThemes(asJson);
      return;
    }

    // Load config file if provided. Explicit CLI args win; Commander defaults don't override profile.
    let mergedOpts = opts as Record<string, string | boolean | undefined>;
    if (opts.profile) {
      const config = loadConfig(opts.profile);
      mergedOpts = mergeConfig(opts, config, (key) => program.getOptionValueSource(key));
    }
    errorOpts = mergedOpts;

    const validated = validateRenderOptions(mergedOpts);
    const themeName = validated.themeName;
    const themeCss = await resolveTheme(themeName, { allowLocalFiles: validated.allowLocalFiles });

    // Determine input source: CLI -i arg > stdin
    let inputPath: string;
    let html: string;

    if (opts.input) {
      inputPath = opts.input;
      html = await parseMarkdown(inputPath, themeCss, {
        allowHtml: validated.allowHtml,
        allowLocalFiles: validated.allowLocalFiles,
      });
    } else {
      const stdinContent = await readStdin();
      if (!stdinContent.trim()) {
        if (asJson) {
          emitJsonError(errorOpts, "No input: provide -i <file> or pipe Markdown via stdin");
        }
        console.error(chalk.red("No input: provide -i <file> or pipe Markdown via stdin"));
        console.error(chalk.gray("  Example: carddown -i file.md"));
        console.error(chalk.gray("  Example: cat file.md | carddown"));
        process.exit(1);
      }
      inputPath = "(stdin)";
      html = await parseMarkdownString(stdinContent, process.cwd(), themeCss, {
        allowHtml: validated.allowHtml,
        allowLocalFiles: validated.allowLocalFiles,
      });
    }

    const outputDir = validated.outputDir;
    const baseName = opts.name || (opts.input ? path.basename(opts.input, path.extname(opts.input)) : "output");
    const startTime = Date.now();

    if (!asJson) {
      console.log(chalk.bold("CardDown") + chalk.gray(" — Markdown → paginated image cards"));
      console.log(chalk.gray("  Input: ") + inputPath);
      console.log(chalk.gray("  Output: ") + outputDir);
      console.log(chalk.gray("  Theme: ") + chalk.cyan(themeName));
      console.log(chalk.gray("  Parsing Markdown..."));
    }

    // Font scanning
    const missingFonts = scanMissingFonts(themeCss);
    if (!asJson && missingFonts.length > 0) {
      console.log(chalk.yellow(`  ⚠ Missing fonts: ${missingFonts.join(", ")} (system fallback will be used)`));
    }

    // Cover page (disabled by --no-cover or config no_cover)
    const coverData = extractCoverData(html);
    let coverHtml: string | undefined;
    if (!validated.noCover && (coverData.title || coverData.toc.length > 0)) {
      coverHtml = buildCoverHtml(coverData, themeCss);
    }

    if (!asJson) {
      console.log(chalk.gray("  Paginating and capturing screenshots..."));
    }

    const docTitle = coverData.title || undefined;
    const files = await renderToPages(html, outputDir, baseName, {
      coverHtml,
      scale: validated.scale,
      title: docTitle,
      dims: { width: validated.width, height: validated.height, padding: validated.padding },
      maxCodeLines: validated.maxCodeLines,
      quiet: asJson,
      format: validated.format,
      fillThreshold: validated.fillThreshold,
    });

    const duration = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));
    const coverFile = coverHtml ? files[0] : null;
    const contentFiles = coverHtml ? files.slice(1) : files;

    if (asJson) {
      const result: OutputResult = {
        status: "success",
        images: {
          cover: coverFile ? path.resolve(coverFile) : null,
          content: contentFiles.map((f) => path.resolve(f)),
        },
        metadata: {
          input_file: opts.input ? path.resolve(opts.input) : "(stdin)",
          output_path: path.resolve(outputDir),
          theme_used: themeName,
          scale: validated.scale,
          page_count: contentFiles.length,
          duration_seconds: duration,
          fonts_missing: missingFonts,
        },
      };
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    } else {
      console.log("");
      console.log(chalk.green("✔ Done") + chalk.gray(` — ${duration}s, ${contentFiles.length} page(s)`));
      if (coverFile) {
        console.log(chalk.gray("  Cover: ") + coverFile);
      }
      contentFiles.forEach((f, i) => {
        console.log(chalk.gray(`  [${i + 1}] `) + f);
      });
    }
  } catch (err) {
    const message = formatError(err);
    if (asJson) {
      emitJsonError(errorOpts, message);
    }
    console.error(chalk.red("✘ Error: ") + message);
    process.exit(1);
  }
});

// ── Bootstrap ──────────────────────────────────────────────

program.parseAsync().catch((err) => {
  const message = formatError(err);
  if (process.argv.includes("--json")) {
    emitJsonError({ json: true }, message);
  }
  console.error(chalk.red("✘ Error: ") + message);
  process.exit(1);
});
