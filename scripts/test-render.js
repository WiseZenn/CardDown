/**
 * Browser-backed render tests.
 *
 * These drive the real pagination algorithm inside Chromium through the public
 * Core API, so a break in `paginator-algo.js` fails here instead of shipping.
 * Keep fixtures small and `scale: 1` so the whole file stays CI-friendly.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { extractCoverData, parseMarkdownString, renderToPages, resolveTheme } from "@carddown/core";

const WORK_DIR = path.join(process.cwd(), "output", ".tmp-tests", "render");
fs.rmSync(WORK_DIR, { recursive: true, force: true });
fs.mkdirSync(WORK_DIR, { recursive: true });

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failures.push({ name, message });
    console.log(`  ✘ ${name}\n      ${message.split("\n")[0]}`);
  }
}

/** Parse + paginate a Markdown string through the public Core API. */
async function render(name, markdown, options = {}) {
  const themeCss = await resolveTheme(options.theme || "github");
  const html = await parseMarkdownString(markdown, WORK_DIR, themeCss);
  const cover = extractCoverData(html);
  const warnings = [];
  const files = await renderToPages(html, path.join(WORK_DIR, name), name, {
    scale: 1,
    quiet: true,
    title: options.useDocTitle ? cover.title || undefined : options.title,
    maxCodeLines: options.maxCodeLines ?? 0,
    onWarnings: (list) => warnings.push(...list),
  });
  return { files, html, title: cover.title, warnings };
}

// ── Fixtures that used to abort the whole run ──────────────

const longList = ["# Long List", ""].concat(Array.from({ length: 150 }, (_, i) => `- item ${i}`)).join("\n");

const longTable = ["# Long Table", "", "| a | b | c |", "|---|---|---|"]
  .concat(Array.from({ length: 120 }, (_, i) => `| ${i} | value ${i} | note ${i} |`))
  .join("\n");

const longQuote = ["# Long Quote", ""]
  .concat(
    Array.from(
      { length: 40 },
      (_, i) => `> Quoted paragraph number ${i} with enough words to take up real vertical space.`,
    ),
  )
  .join("\n>\n");

const bigCode = ["# Big Code", "", "```js"]
  .concat(Array.from({ length: 200 }, (_, i) => `const value${i} = compute(${i});`))
  .concat(["```"])
  .join("\n");

// ── Unit-level checks that need no browser ────────────────

console.log("Render tests");

await check("every built-in theme styles the highlight mark", async () => {
  for (const theme of ["github", "claude-like", "claude-like-dark", "claude-like-grey"]) {
    const css = await resolveTheme(theme);
    assert.match(css, /(^|[\n},])mark\{/m, `${theme} must style mark so ==highlight== stays readable`);
  }
});

await check("parser does not inject mark styling over the theme", async () => {
  const html = await parseMarkdownString("==highlighted==", WORK_DIR, ":root{--accent:#0070f3}");
  assert.match(html, /<mark>highlighted<\/mark>/);
  assert.doesNotMatch(
    html,
    /mark\{background:#fff3cd/,
    "injected mark CSS overrides dark themes because it is emitted after the theme",
  );
});

await check("cover title decodes HTML entities", async () => {
  const html = await parseMarkdownString("# A & B: Notes on $PATH", WORK_DIR, ":root{--accent:#0070f3}");
  const { title } = extractCoverData(html);
  assert.equal(title, "A & B: Notes on $PATH");
});

await check("cover title keeps markup-free text", async () => {
  const html = await parseMarkdownString("# Plain **bold** title", WORK_DIR, ":root{--accent:#0070f3}");
  const { title } = extractCoverData(html);
  assert.equal(title, "Plain bold title");
});

// ── Browser-backed cases ──────────────────────────────────

await check("long bullet list paginates instead of aborting", async () => {
  const { files } = await render("long-list", longList);
  assert.ok(files.length >= 2, `expected 2+ pages, got ${files.length}`);
});

await check("long table paginates instead of aborting", async () => {
  const { files } = await render("long-table", longTable);
  assert.ok(files.length >= 2, `expected 2+ pages, got ${files.length}`);
});

await check("long blockquote paginates instead of aborting", async () => {
  const { files } = await render("long-quote", longQuote);
  assert.ok(files.length >= 2, `expected 2+ pages, got ${files.length}`);
});

await check("--max-code-lines splits a block larger than the limit", async () => {
  const { files } = await render("code-limited", bigCode, { maxCodeLines: 5 });
  assert.ok(files.length >= 2, `expected 2+ pages, got ${files.length}`);
});

await check("code block without a limit still renders", async () => {
  const { files } = await render("code-unlimited", bigCode);
  assert.ok(files.length >= 1, `expected 1+ pages, got ${files.length}`);
});

await check("title containing $-patterns still renders", async () => {
  const { files } = await render("title-dollar", "# Cost $& in sed replacements\n\nBody text.", {
    useDocTitle: true,
  });
  assert.ok(files.length >= 1, `expected 1+ pages, got ${files.length}`);
});

await check("title containing $$ renders without corrupting the header", async () => {
  const { title } = await render("title-dollars", "# Cost $$5 Deal\n\nBody text.", {
    useDocTitle: true,
  });
  assert.equal(title, "Cost $$5 Deal");
});

await check("only image-only paragraphs are tagged for collapsed line height", async () => {
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  fs.writeFileSync(path.join(WORK_DIR, "tiny.png"), Buffer.from(png, "base64"));
  const markdown = [
    "# Mixed Block",
    "",
    "![tiny](tiny.png)",
    "",
    `![tiny](tiny.png) ${"followed by a long run of text that must stay visible. ".repeat(40)}`,
    "",
  ].join("\n");
  const { html } = await render("mixed-image", markdown);
  const tagged = html.match(/<p class="img-only">/g) || [];
  assert.equal(
    tagged.length,
    1,
    "the image-only paragraph must be tagged, and the image+text paragraph must not — " +
      "line-height:0 on a mixed paragraph collapses its text to nothing",
  );
});

await check("a wide table is reported instead of silently clipped", async () => {
  // Cells hold unbreakable tokens: word-wrapping content simply makes the
  // table taller, but a long token forces it wider than the card.
  const token = "sha256:9f2c7ab41de8b3056ca7f1e2d4b8903af6c5e1d7b2a4908c3e6f1a7d5b0c2e84";
  const wideTable = [
    "# Wide Table",
    "",
    "| identifier | digest | owner | status | created | updated | reference |",
    "|---|---|---|---|---|---|---|",
  ]
    .concat(
      Array.from({ length: 8 }, () => `| ${token} | ${token} | ${token} | ${token} | ${token} | ${token} | ${token} |`),
    )
    .join("\n");

  const { warnings } = await render("wide-table", wideTable);
  assert.ok(
    warnings.some((w) => /wider than the card/i.test(w)),
    `expected a horizontal-clip warning, got: ${JSON.stringify(warnings)}`,
  );
});

await check("an image gallery paginates instead of shrinking to slivers", async () => {
  fs.writeFileSync(
    path.join(WORK_DIR, "tile.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><rect width="600" height="200" fill="#8a7f70"/></svg>',
  );
  const gallery = ["# Gallery", ""].concat(Array.from({ length: 20 }, (_, i) => `![tile ${i}](tile.svg)`)).join("\n\n");

  const { files } = await render("gallery", gallery);
  assert.ok(
    files.length >= 2,
    `20 images 200px tall cannot share one 1440px card, but only ${files.length} page(s) were produced`,
  );
});

await check("re-rendering into the same directory keeps the new files", async () => {
  const themeCss = await resolveTheme("github");
  const html = await parseMarkdownString("# Rerun\n\nBody text.\n", WORK_DIR, themeCss);
  const outDir = path.join(WORK_DIR, "rerun");

  const first = await renderToPages(html, outDir, "rerun", { scale: 1, quiet: true });
  assert.ok(first.length > 0, "first render wrote nothing");

  const second = await renderToPages(html, outDir, "rerun", { scale: 1, quiet: true });
  assert.ok(second.length > 0, "second render wrote nothing");
  for (const file of second) {
    assert.ok(fs.existsSync(file), `${path.basename(file)} was deleted by the stale-output cleanup of its own run`);
  }
});

await check("a pagination failure reports a clean, actionable message", async () => {
  const themeCss = await resolveTheme("github");
  const html = await parseMarkdownString("# Heading\n\nBody text.\n", WORK_DIR, themeCss);
  await assert.rejects(
    () =>
      renderToPages(html, path.join(WORK_DIR, "tiny-card"), "tiny-card", {
        scale: 1,
        quiet: true,
        dims: { width: 1080, height: 120, padding: 50 },
      }),
    (err) => {
      assert.doesNotMatch(err.message, /page\.evaluate/, "Playwright's wrapper leaked into the message");
      assert.doesNotMatch(err.message, /\n\s*at /, "an in-page stack leaked into the message");
      assert.match(err.message, /Pagination overflow/);
      assert.match(err.message, /Hint:/, "the message must tell the user what to do");
      return true;
    },
  );
});

await check("a CLI run leaves no temporary directories behind", async () => {
  const fixture = path.join(WORK_DIR, "temp-check.md");
  fs.writeFileSync(fixture, "# Temp Check\n\nBody text.\n");
  const cliEntry = path.join(process.cwd(), "packages", "cli", "dist", "index.js");
  const before = fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith("carddown-"));

  execFileSync(
    process.execPath,
    [
      cliEntry,
      "-i",
      fixture,
      "-o",
      path.join(WORK_DIR, "temp-check"),
      "--name",
      "temp-check",
      "--scale",
      "1",
      "--no-cover",
    ],
    { stdio: "ignore" },
  );

  const after = fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith("carddown-"));
  const added = after.filter((name) => !before.includes(name));
  assert.deepEqual(added, [], `temp directories leaked: ${added.join(", ")}`);
});

await check("empty document still renders a single card", async () => {
  const { files } = await render("empty", "");
  assert.equal(files.length, 1);
});

await check("heading-only document renders a single card", async () => {
  const { files } = await render("heading-only", "# Just A Heading");
  assert.equal(files.length, 1);
});

// ── Summary ───────────────────────────────────────────────

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} render check(s) failed, ${passed} passed:`);
  for (const f of failures) {
    console.error(`  ✘ ${f.name}`);
    console.error(`    ${f.message.split("\n").slice(0, 4).join("\n    ")}`);
  }
  process.exit(1);
}
console.log(`All ${passed} render checks passed.`);
