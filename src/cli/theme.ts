import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const useColor = !process.env.NO_COLOR && (process.env.FORCE_COLOR || process.stdout.isTTY);

function wrap(code: number, value: string): string {
  return useColor ? `\u001b[${code}m${value}\u001b[0m` : value;
}

export const theme = {
  accent: (value: string) => wrap(92, value),
  cyan: (value: string) => wrap(96, value),
  warn: (value: string) => wrap(93, value),
  error: (value: string) => wrap(91, value),
  muted: (value: string) => wrap(90, value),
  bold: (value: string) => wrap(1, value),
  path: (value: string) => wrap(36, value),
  command: (value: string) => wrap(95, value)
};

export function logSuccess(message: string): void {
  console.log(`${theme.accent("✓")} ${message}`);
}

export function logInfo(message: string): void {
  console.log(`${theme.cyan("•")} ${message}`);
}

export function logWarning(message: string): void {
  console.log(`${theme.warn("!")} ${message}`);
}

export function logError(message: string): void {
  console.error(`${theme.error("✗")} ${message}`);
}

async function readPackageMeta(): Promise<{ name: string; version: string }> {
  const packageUrl = new URL("../../package.json", import.meta.url);
  const parsed = JSON.parse(await fs.readFile(packageUrl, "utf8")) as { name?: string; version?: string };
  return {
    name: parsed.name ?? "@ravbyte/agent-memory-system",
    version: parsed.version ?? "0.0.0"
  };
}

function parseVersion(version: string): [number, number, number] {
  const [major = "0", minor = "0", patch = "0"] = version.replace(/^v/, "").split(".");
  return [Number(major) || 0, Number(minor) || 0, Number(patch) || 0];
}

function isNewerVersion(latest: string, current: string): boolean {
  const left = parseVersion(latest);
  const right = parseVersion(current);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return true;
    if (left[index] < right[index]) return false;
  }
  return false;
}

export async function maybePrintLatestNotice(): Promise<void> {
  if (process.env.AGENT_MEMORY_SKIP_UPDATE_CHECK === "1") {
    return;
  }

  try {
    const { name, version } = await readPackageMeta();
    const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
    const { stdout } = await execFileAsync(npmBin, ["view", name, "version", "--silent"], { timeout: 2500 });
    const latest = stdout.trim();
    if (latest && isNewerVersion(latest, version)) {
      logWarning(`A newer ${name} is available: ${version} -> ${latest}`);
      console.log(`  ${theme.command(`npx ${name}@latest init`)}`);
      console.log(`  ${theme.command(`npm install -g ${name}@latest`)}`);
    }
  } catch {
    // Update checks must never block core CLI work.
  }
}
