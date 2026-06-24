import * as fs from "fs";
import * as path from "path";
import YAML from "yaml";
import { DEFAULTS } from "@carddown/core";

export interface Config {
  theme?: string;
  scale?: number;
  width?: number;
  height?: number;
  padding?: number;
  no_cover?: boolean;
  max_code_lines?: number;
  fill_threshold?: number;
  output?: string;
  allow_html?: boolean;
  allow_local_files?: boolean;
}

export type CliOptions = Record<string, string | boolean | undefined>;
export type OptionSource = string;
export type GetOptionSource = (key: string) => OptionSource | undefined;

export interface ValidatedRenderOptions {
  themeName: string;
  outputDir: string;
  scale: number;
  width: number;
  height: number;
  padding: number;
  maxCodeLines: number;
  fillThreshold: number;
  format: "png" | "pdf";
  allowHtml: boolean;
  allowLocalFiles: boolean;
  noCover: boolean;
}

export function loadConfig(profilePath: string): Config {
  const absPath = path.resolve(profilePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Config file not found: ${absPath}`);
  }
  const raw = fs.readFileSync(absPath, "utf-8");
  const ext = path.extname(absPath).toLowerCase();

  let parsed: unknown;
  if (ext === ".json") {
    parsed = JSON.parse(raw);
  } else {
    parsed = YAML.parse(raw);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Config file must contain a YAML/JSON object (mapping), not a ${parsed === null ? "null" : Array.isArray(parsed) ? "list" : typeof parsed}.`);
  }

  return parsed as Config;
}

export function mergeConfig(cliOpts: CliOptions, config: Config, getSource?: GetOptionSource): CliOptions {
  const merged = { ...cliOpts };
  for (const [key, val] of Object.entries(config)) {
    if (val === undefined || val === null) continue;
    const cliKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); // no_cover → noCover

    // CLI args win: only use profile value when the user didn't explicitly pass the option.
    // Commander defaults have source "default" and should not override profile.
    const source = getSource?.(cliKey);
    const isCliProvided = source === "cli" || source === "env";
    if (!isCliProvided) {
      merged[cliKey] = typeof val === "boolean" ? val : String(val);
    }
  }
  return merged;
}

function parseBooleanOption(raw: string | boolean | undefined): boolean {
  return raw === true || raw === "true";
}

function parseNumberOption(
  opts: CliOptions,
  key: string,
  flag: string,
  fallback: string,
  config: { integer?: boolean; min?: number; max?: number } = {}
): number {
  const raw = opts[key] ?? fallback;
  const text = String(raw).trim();
  const numericPattern = config.integer
    ? /^-?(?:0|[1-9]\d*)$/
    : /^-?(?:\d+\.?\d*|\.\d+)$/;

  if (!numericPattern.test(text)) {
    const kind = config.integer ? "an integer" : "a number";
    throw new Error(`${flag} must be ${kind}; received ${JSON.stringify(raw)}.`);
  }

  const value = Number(text);
  if (!Number.isFinite(value) || (config.integer && !Number.isInteger(value))) {
    throw new Error(`${flag} must be a finite ${config.integer ? "integer" : "number"}; received ${JSON.stringify(raw)}.`);
  }
  if (config.min !== undefined && value < config.min) {
    throw new Error(`${flag} must be >= ${config.min}; received ${value}.`);
  }
  if (config.max !== undefined && value > config.max) {
    throw new Error(`${flag} must be <= ${config.max}; received ${value}.`);
  }

  return value;
}

export function validateRenderOptions(opts: CliOptions): ValidatedRenderOptions {
  const outputDir = String(opts.output ?? "./output").trim();
  if (!outputDir) {
    throw new Error("--output must not be empty.");
  }

  const themeName = String(opts.theme ?? "github").trim();
  if (!themeName) {
    throw new Error("--theme must not be empty.");
  }

  const scale = parseNumberOption(opts, "scale", "--scale", "2", { min: 1 });
  const width = parseNumberOption(opts, "width", "--width", String(DEFAULTS.width), { integer: true, min: 1 });
  const height = parseNumberOption(opts, "height", "--height", String(DEFAULTS.height), { integer: true, min: 1 });
  const padding = parseNumberOption(opts, "padding", "--padding", String(DEFAULTS.padding), { integer: true, min: 0 });
  const maxCodeLines = parseNumberOption(opts, "maxCodeLines", "--max-code-lines", "0", { integer: true, min: 0 });
  const fillThreshold = parseNumberOption(opts, "fillThreshold", "--fill-threshold", "0.85", { min: 0, max: 1 });

  if (padding * 2 >= width || padding * 2 >= height) {
    throw new Error("--padding must leave a positive content area inside --width and --height.");
  }

  const formatValue = String(opts.format ?? "png").trim().toLowerCase();
  if (formatValue !== "png" && formatValue !== "pdf") {
    throw new Error(`--format must be "png" or "pdf"; received ${JSON.stringify(opts.format)}.`);
  }

  return {
    themeName,
    outputDir,
    scale,
    width,
    height,
    padding,
    maxCodeLines,
    fillThreshold,
    format: formatValue,
    allowHtml: parseBooleanOption(opts.allowHtml),
    allowLocalFiles: parseBooleanOption(opts.allowLocalFiles),
    noCover: opts.cover === false || parseBooleanOption(opts.noCover),
  };
}
