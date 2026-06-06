/**
 * CardDown batch export script
 * Renders all Markdown examples in the examples/ folder
 * using every available built-in theme.
 */
import {
  buildCoverHtml,
  extractCoverData,
  listBuiltinThemes,
  parseMarkdown,
  renderToPages,
  resolveTheme,
  scanMissingFonts,
} from "@carddown/core";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT_ROOT = path.join(PROJECT_ROOT, "output");

// Input file definitions
const EXAMPLES_DIR = path.join(PROJECT_ROOT, "examples");
const INPUTS: { label: string; file: string }[] = fs.existsSync(EXAMPLES_DIR)
  ? fs.readdirSync(EXAMPLES_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => ({ label: path.basename(file, ".md"), file: path.join(EXAMPLES_DIR, file) }))
  : [];

// Scale setting: scale=1 for fast export
const SCALE = 1;

async function main() {
  const themes = listBuiltinThemes();
  console.log(chalk.bold(`CardDown Batch Export`));
  console.log(chalk.gray(`  Themes: ${themes.length}`));
  console.log(chalk.gray(`  Input files: ${INPUTS.length}`));
  console.log(chalk.gray(`  Total tasks: ${themes.length * INPUTS.length}`));
  console.log("");

  const totalStart = Date.now();
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const input of INPUTS) {
    if (!fs.existsSync(input.file)) {
      console.log(chalk.yellow(`  ⚠ Skipping missing file: ${input.file}`));
      continue;
    }

    for (const themeName of themes) {
      const taskLabel = `${input.label} × ${themeName}`;
      const startTime = Date.now();

      try {
        // Load theme CSS
        const themeCss = await resolveTheme(themeName);

        // Parse Markdown
        const html = await parseMarkdown(input.file, themeCss);

        // Output dir — replace / with _ to avoid nesting
        const safeLabel = input.label.replace(/\//g, "_");
        const safeTheme = themeName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const outputDir = path.join(OUTPUT_ROOT, `${safeLabel}__${safeTheme}`);

        // Font scanning
        const missingFonts = scanMissingFonts(themeCss);
        if (missingFonts.length > 0) {
          console.log(chalk.yellow(`  ⚠ [${taskLabel}] Missing fonts: ${missingFonts.join(", ")}`));
        }

        // Cover page
        const coverData = extractCoverData(html);
        const coverHtml = (coverData.title || coverData.toc.length > 0)
          ? buildCoverHtml(coverData, themeCss)
          : undefined;

        // Render
        const files = await renderToPages(html, outputDir, safeLabel, {
          coverHtml,
          scale: SCALE,
          title: coverData.title || undefined,
          quiet: true,
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const coverFile = coverHtml ? files[0] : null;
        const pageCount = coverHtml ? files.length - 1 : files.length;

        console.log(
          chalk.green(`  ✔ [${taskLabel}]`) +
          chalk.gray(` ${pageCount} page(s) · ${duration}s`)
        );
        successCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(chalk.red(`  ✘ [${taskLabel}] ${msg}`));
        errors.push(`${taskLabel}: ${msg}`);
        failCount++;
      }
    }
  }

  const totalDuration = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log("");
  console.log(chalk.bold("Batch export complete"));
  console.log(chalk.green(`  ✔ Success: ${successCount}`));
  if (failCount > 0) {
    console.log(chalk.red(`  ✘ Failed: ${failCount}`));
    for (const err of errors) {
      console.log(chalk.gray(`    ${err}`));
    }
  }
  console.log(chalk.gray(`  Total time: ${totalDuration}s`));
}

main().catch((err) => {
  console.error(chalk.red("Batch export failed:"), err);
  process.exit(1);
});
