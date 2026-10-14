import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Temp directories holding browser inputs: KaTeX and its fonts, extracted
 * `.zip` theme resources, and zip theme fonts.
 *
 * They cannot be released as soon as they are created — the `file://` URLs they
 * contain are baked into the generated HTML and only resolve while the page is
 * being rendered. They also cannot simply be left behind: a caller that runs
 * the CLI thousands of times (the `--json` agent workflow) would accumulate one
 * directory per run, or per zip theme, for the lifetime of the machine.
 *
 * So they live until the process exits, which is the shortest lifetime that is
 * still correct.
 */
const tempDirs = new Set<string>();
let exitHookInstalled = false;

function installExitHook(): void {
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  process.once("exit", () => {
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best effort: cleanup must never turn a clean exit into a failure.
      }
    }
    tempDirs.clear();
  });
}

export function createTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.add(dir);
  installExitHook();
  return dir;
}
