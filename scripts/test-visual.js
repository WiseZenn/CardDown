/**
 * Visual checks on rendered output.
 *
 * Two modes:
 *
 *   node scripts/test-visual.js                 run the invariant checks (CI)
 *   node scripts/test-visual.js --diff A B      pixel-compare two output dirs
 *
 * The default mode deliberately does NOT compare against committed reference
 * images. Rendered pixels depend on installed fonts and the platform's text
 * rasteriser, so a Unix CI runner and a Windows development machine produce
 * measurably different PNGs for identical markup. A committed baseline would
 * fail on one of them for reasons that have nothing to do with the change.
 *
 * Instead it asserts invariants that hold on any platform and still catch the
 * failures that matter — content that is blank, and layers that did not paint.
 * The `--diff` mode is the same-machine comparison used while investigating a
 * suspected regression, where an exact match is meaningful.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import { extractCoverData, parseMarkdownString, renderToPages, resolveTheme } from "@carddown/core";

const WORK_DIR = path.join(process.cwd(), "output", ".tmp-tests", "visual");

// ── PNG decoding ──────────────────────────────────────────
// Decoded in-process rather than through a browser: no second launch, and it
// keeps `--diff` usable without Playwright.

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(buffer) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) throw new Error("not a PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colorType = body[9];
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth}`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0;
      const b = previous[x];
      const c = x >= channels ? previous[x - channels] : 0;
      if (filter === 1) line[x] = (line[x] + a) & 0xff;
      else if (filter === 2) line[x] = (line[x] + b) & 0xff;
      else if (filter === 3) line[x] = (line[x] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) line[x] = (line[x] + paeth(a, b, c)) & 0xff;
      else if (filter !== 0) throw new Error(`unsupported PNG filter ${filter}`);
    }
    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      if (channels === 1) {
        out[d] = out[d + 1] = out[d + 2] = line[s];
        out[d + 3] = 255;
      } else if (channels === 2) {
        out[d] = out[d + 1] = out[d + 2] = line[s];
        out[d + 3] = line[s + 1];
      } else if (channels === 3) {
        out[d] = line[s];
        out[d + 1] = line[s + 1];
        out[d + 2] = line[s + 2];
        out[d + 3] = 255;
      } else {
        out[d] = line[s];
        out[d + 1] = line[s + 1];
        out[d + 2] = line[s + 2];
        out[d + 3] = line[s + 3];
      }
    }
    previous = line;
  }

  return { width, height, data: out };
}

// ── Region analysis ───────────────────────────────────────

/** Most common colour in a region, as "r,g,b". */
function dominantColour(img, x0, y0, x1, y1) {
  const counts = new Map();
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * 4;
      const key = `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  let best = "";
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return { colour: best, count: bestCount, total: (x1 - x0) * (y1 - y0) };
}

/**
 * How many pixels in a region differ noticeably from that region's dominant
 * colour. A flat rectangle scores 0; anything drawn on it scores more.
 */
function inkIn(img, x0, y0, x1, y1) {
  const { colour } = dominantColour(img, x0, y0, x1, y1);
  const [r, g, b] = colour.split(",").map(Number);
  let ink = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * 4;
      const delta = Math.abs(img.data[i] - r) + Math.abs(img.data[i + 1] - g) + Math.abs(img.data[i + 2] - b);
      if (delta > 30) ink++;
    }
  }
  return ink;
}

// ── Invariant checks ──────────────────────────────────────

const checks = [];
const failures = [];

function check(name, fn) {
  checks.push({ name, fn });
}

// Long enough to span at least three cards: the header and badge checks need a
// continuation page, and a one-page fixture would silently skip them.
function fixtureDocument() {
  const lines = ["# 视觉回归检查", ""];
  for (let section = 1; section <= 6; section++) {
    lines.push(`## 第 ${section} 节 小节标题`, "");
    lines.push(
      `这是第 ${section} 节的说明段落。它包含足够多的文字，以便在卡片上占据可见的垂直空间，` +
        "并让分页算法在多个段落之间做出取舍。第二个句子用来增加长度。第三个句子做同样的事。",
      "",
    );
    lines.push("- 第一个列表项", "- 第二个列表项", "- 第三个列表项", "");
    if (section % 2 === 0) {
      lines.push("```js", `const answer${section} = compute(${section});`, "return answer;", "```", "");
    } else {
      lines.push("| 名称 | 数值 |", "|---|---|", "| alpha | 1 |", "| beta | 2 |", "");
    }
  }
  return lines.join("\n");
}

check("rendered pages are not blank", async () => {
  const themeCss = await resolveTheme("github");
  const html = await parseMarkdownString(fixtureDocument(), WORK_DIR, themeCss);
  const files = await renderToPages(html, path.join(WORK_DIR, "invariants"), "invariants", {
    scale: 1,
    quiet: true,
    title: extractCoverData(html).title || undefined,
  });

  assert.ok(files.length >= 2, `fixture should span at least 2 pages, got ${files.length}`);

  for (const file of files) {
    const img = decodePng(fs.readFileSync(file));
    const ink = inkIn(img, 0, 0, img.width, img.height);
    const ratio = ink / (img.width * img.height);
    assert.ok(
      ratio > 0.005,
      `${path.basename(file)} looks blank: only ${(ratio * 100).toFixed(2)}% of pixels differ from the background`,
    );
  }
});

check("the page-number badge is painted, not a flat rectangle", async () => {
  const themeCss = await resolveTheme("github");
  const html = await parseMarkdownString(fixtureDocument(), WORK_DIR, themeCss);
  const files = await renderToPages(html, path.join(WORK_DIR, "badge"), "badge", {
    scale: 1,
    quiet: true,
  });

  for (const file of files) {
    const img = decodePng(fs.readFileSync(file));
    // .page-number sits at bottom:32px right:56px on a 1080x1440 card.
    const box = { x0: img.width - 190, y0: img.height - 70, x1: img.width - 50, y1: img.height - 25 };
    const ink = inkIn(img, box.x0, box.y0, box.x1, box.y1);
    assert.ok(
      ink > 40,
      `${path.basename(file)}: the page-number region is flat (${ink} non-background pixels). ` +
        "This is the signature of a capture path that skips composited layers — see AI_DIARY P61.",
    );
  }
});

check("the running header is painted on continuation pages", async () => {
  const themeCss = await resolveTheme("github");
  const html = await parseMarkdownString(fixtureDocument(), WORK_DIR, themeCss);
  const files = await renderToPages(html, path.join(WORK_DIR, "header"), "header", {
    scale: 1,
    quiet: true,
    title: "视觉回归检查",
  });

  // Page 1 carries the document's own heading; pages 2+ carry the injected
  // running header, which is the part that regressed silently before.
  for (const file of files.slice(1)) {
    const img = decodePng(fs.readFileSync(file));
    const ink = inkIn(img, 40, 30, img.width - 40, 120);
    assert.ok(ink > 200, `${path.basename(file)}: the running header region is empty (${ink} non-background pixels)`);
  }
});

// ── --diff mode ───────────────────────────────────────────

async function diffMode(dirA, dirB) {
  const files = fs.readdirSync(dirA).sort();
  let identical = 0;
  const differences = [];

  for (const file of files) {
    const other = path.join(dirB, file);
    if (!fs.existsSync(other)) {
      differences.push(`${file}: missing on the right`);
      continue;
    }
    const a = decodePng(fs.readFileSync(path.join(dirA, file)));
    const b = decodePng(fs.readFileSync(other));
    if (a.width !== b.width || a.height !== b.height) {
      differences.push(`${file}: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
      continue;
    }

    let differing = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < a.height; y++) {
      for (let x = 0; x < a.width; x++) {
        const i = (y * a.width + x) * 4;
        const delta =
          Math.abs(a.data[i] - b.data[i]) +
          Math.abs(a.data[i + 1] - b.data[i + 1]) +
          Math.abs(a.data[i + 2] - b.data[i + 2]);
        if (delta > 12) {
          differing++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (differing === 0) {
      identical++;
    } else {
      // Reporting the bounding box is what makes this useful: it names the
      // element that broke instead of leaving a pixel count to interpret.
      differences.push(
        `${file}: ${differing} px differ (${((differing / (a.width * a.height)) * 100).toFixed(3)}%), ` +
          `bounding box x ${minX}-${maxX}, y ${minY}-${maxY}`,
      );
    }
  }

  console.log(`  pixel-identical: ${identical}/${files.length}`);
  for (const d of differences.slice(0, 10)) console.log(`    ${d}`);
  if (differences.length > 0) process.exitCode = 1;
}

// ── Entry point ───────────────────────────────────────────

const diffIndex = process.argv.indexOf("--diff");
if (diffIndex !== -1) {
  const [, dirA, dirB] = process.argv.slice(diffIndex);
  if (!dirA || !dirB) {
    console.error("usage: node scripts/test-visual.js --diff <dirA> <dirB>");
    process.exit(2);
  }
  await diffMode(dirA, dirB);
} else {
  fs.rmSync(WORK_DIR, { recursive: true, force: true });
  fs.mkdirSync(WORK_DIR, { recursive: true });

  console.log("Visual checks");
  for (const { name, fn } of checks) {
    try {
      await fn();
      console.log(`  ✔ ${name}`);
    } catch (err) {
      failures.push({ name, message: err instanceof Error ? err.message : String(err) });
      console.log(`  ✘ ${name}`);
    }
  }

  if (failures.length > 0) {
    console.log("");
    console.error(`${failures.length} visual check(s) failed:`);
    for (const f of failures) {
      console.error(`  ✘ ${f.name}`);
      console.error(`    ${f.message}`);
    }
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} visual checks passed.`);
}
