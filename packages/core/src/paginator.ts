import { chromium, type Browser } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { pathToFileURL } from "url";
import { ensureKatexAssets } from "./parser.js";
import type { PageDimensions } from "./types.js";

// Pagination algorithm — loaded from file to avoid template-literal escaping issues.
const PAGINATION_ALGO = fs.readFileSync(
  path.resolve(import.meta.dirname, "paginator-algo.js"),
  "utf-8"
);

function findEdgePath(): string | undefined {
  const candidates: string[] = [];
  if (os.platform() === "win32") {
    const pf = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const pf64 = process.env.PROGRAMFILES || "C:\\Program Files";
    candidates.push(
      path.join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(pf64, "Microsoft", "Edge", "Application", "msedge.exe"),
    );
  } else if (os.platform() === "darwin") {
    candidates.push("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge");
  }
  return candidates.find((p) => fs.existsSync(p));
}

function formatBrowserError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function launchBrowser(): Promise<Browser> {
  const edgePath = findEdgePath();
  const launchOpts: Record<string, unknown> = {
    args: ["--allow-file-access-from-files"],
  };
  if (edgePath) {
    launchOpts.executablePath = edgePath;
  }
  try {
    return await chromium.launch(launchOpts);
  } catch (err) {
    const fallback = edgePath ? ` Tried Microsoft Edge at: ${edgePath}.` : "";
    throw new Error(
      "Unable to launch a Chromium browser for rendering." +
        fallback +
        " Install the Playwright browser with: npx playwright install chromium." +
        ` Original error: ${formatBrowserError(err)}`
    );
  }
}

export interface RenderOptions {
  coverHtml?: string;
  scale?: number;
  title?: string;
  dims?: PageDimensions;
  maxCodeLines?: number;
  quiet?: boolean;
  format?: "png" | "pdf";
  fillThreshold?: number;
  onPageCount?: (pageCount: number) => void;
}

function cleanupPreviousOutputs(outputDir: string, baseName: string): void {
  if (!fs.existsSync(outputDir)) return;

  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;

    const name = entry.name;
    const isSamePrefixImage = name.startsWith(`${baseName}_`) && (name.endsWith(".png") || name.endsWith(".pdf"));
    const isSamePdf = name === `${baseName}.pdf`;

    if (isSamePrefixImage || isSamePdf) {
      fs.unlinkSync(path.join(outputDir, name));
    }
  }
}

export async function renderToPages(
  html: string,
  outputDir: string,
  baseName: string,
  options: RenderOptions = {}
): Promise<string[]> {
  const {
    coverHtml,
    scale = 1,
    title,
    dims = { width: 1080, height: 1440, padding: 48 },
    maxCodeLines = 0,
    quiet = false,
    format = "png",
    fillThreshold = 0.85,
    onPageCount,
  } = options;

  fs.mkdirSync(outputDir, { recursive: true });
  cleanupPreviousOutputs(outputDir, baseName);

  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ deviceScaleFactor: scale });
    const page = await context.newPage();
    await page.setViewportSize({ width: dims.width, height: dims.height });

    const outputPaths: string[] = [];

    // Cover page (optional): screenshot cover first
    if (coverHtml) {
      await page.setContent(coverHtml, { waitUntil: "domcontentloaded" });
      const ext = format === "pdf" ? ".pdf" : ".png";
      const coverFile = path.join(outputDir, `${baseName}_00_cover${ext}`);
      if (format === "pdf") {
        await page.pdf({ path: coverFile, width: dims.width, height: dims.height, printBackground: true });
      } else {
        await page.screenshot({ path: coverFile, fullPage: false });
      }
      outputPaths.push(coverFile);
      if (!quiet) console.log(`  Cover -> ${coverFile}`);
    }

    // Content pages: write temp file, load via file://
    const tmpDir = ensureKatexAssets();
    const tmpHtml = path.join(tmpDir, `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`);
    fs.writeFileSync(tmpHtml, html);
    await page.goto(pathToFileURL(tmpHtml).href, { waitUntil: "domcontentloaded" });

    await page
      .waitForFunction(
        () => {
          const imgs = Array.from(document.images);
          if (imgs.length === 0) return true;
          return imgs.every((img) => img.naturalWidth > 0);
        },
        { timeout: 30000 }
      )
      .catch(async () => {
        await page.evaluate(() => {
          Array.from(document.images).forEach((img) => {
            if (img.naturalWidth === 0) {
              img.style.width = "400px";
              img.style.height = "200px";
              img.style.display = "block";
            }
          });
        });
        if (!quiet) console.error("Some images failed to load; continuing with placeholder sizes.");
      });

    // Wait for custom fonts before pagination (otherwise fallback fonts cause inaccurate measurement)
    await page.evaluate(() => document.fonts.ready).catch(() => {});

    // Inject parameters into algorithm script and execute
    const algoCode = PAGINATION_ALGO
      .replace(/\{\{PW\}\}/g, String(dims.width))
      .replace(/\{\{PH\}\}/g, String(dims.height))
      .replace(/\{\{PD\}\}/g, String(dims.padding))
      .replace(/\{\{MAX_CODE\}\}/g, String(maxCodeLines))
      .replace(/\{\{FILL\}\}/g, String(fillThreshold))
      .replace(/"\{\{DOC_TITLE\}\}"/g, title ? JSON.stringify(title) : "null");

    const pageCount: number = await page.evaluate(algoCode);
    onPageCount?.(pageCount);

    if (format === "pdf") {
      // PDF: convert cards to flow layout + page breaks, export as single PDF
      if (!quiet) console.log(`Total pages: ${pageCount}. Generating PDF...`);
      await page.evaluate(() => {
        document.querySelectorAll(".page-card").forEach((el) => {
          const e = el as HTMLElement;
          e.style.position = "relative";
          e.style.left = "0";
          e.style.top = "0";
          e.style.pageBreakAfter = "always";
        });
      });
      const pdfFile = path.join(outputDir, `${baseName}.pdf`);
      await page.pdf({ path: pdfFile, printBackground: true, width: String(dims.width), height: String(dims.height) });
      outputPaths.push(pdfFile);
      if (!quiet) console.log(`  -> ${pdfFile}`);
    } else {
      // PNG: screenshot each page
      if (!quiet) console.log(`Total pages: ${pageCount}. Capturing screenshots...`);
      for (let i = 0; i < pageCount; i++) {
        const outFile = path.join(outputDir, `${baseName}_${String(i + 1).padStart(2, "0")}.png`);
        await page.locator(`.page-card[data-page="${i}"]`).screenshot({ path: outFile });
        outputPaths.push(outFile);
        if (!quiet) console.log(`  Page ${i + 1} -> ${outFile}`);
      }
    }

    return outputPaths;
  } finally {
    await browser.close();
  }
}
