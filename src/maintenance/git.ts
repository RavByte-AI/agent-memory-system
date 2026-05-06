import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { MemoryImpact } from "../types.js";

const execFileAsync = promisify(execFile);

async function gitLines(rootDir: string, args: string[]): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: rootDir });
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function getChangedFiles(rootDir: string, since = "main"): Promise<string[]> {
  const changed = new Set<string>();

  for (const file of await gitLines(rootDir, ["diff", "--name-only", `${since}...HEAD`])) {
    changed.add(file);
  }
  for (const file of await gitLines(rootDir, ["diff", "--name-only"])) {
    changed.add(file);
  }
  for (const file of await gitLines(rootDir, ["diff", "--name-only", "--cached"])) {
    changed.add(file);
  }
  for (const line of await gitLines(rootDir, ["status", "--porcelain"])) {
    const file = line.slice(3).trim();
    if (file) changed.add(file.replace(/^.* -> /, ""));
  }

  return [...changed].sort();
}

export function classifyMemoryImpact(changedFiles: string[]): MemoryImpact {
  const suggestedTopics = new Set<string>();
  const structuralFiles: string[] = [];

  for (const file of changedFiles) {
    const lower = file.toLowerCase();
    const isStructural =
      /(^|\/)(package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|pom\.xml|tsconfig\.json)$/.test(lower) ||
      /(^|\/)(api|routes?|controllers?|app|pages?|schemas?|models?|migrations?|config|settings|commands?|packages?)\//.test(lower) ||
      /(^|\/)(dockerfile|docker-compose\.ya?ml|\.github\/workflows\/)/.test(lower) ||
      /(^|\/)(agents|claude|cursor|kiro)\.md$/.test(lower);

    if (!isStructural || lower.startsWith("memory/")) {
      continue;
    }

    structuralFiles.push(file);

    if (/(package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|pom\.xml|tsconfig\.json)/.test(lower)) {
      suggestedTopics.add("project-overview");
      suggestedTopics.add("development-workflow");
      suggestedTopics.add("testing-quality");
    }
    if (/(api|routes?|controllers?|app|pages?)/.test(lower)) {
      suggestedTopics.add("api-interfaces");
      suggestedTopics.add("system-architecture");
    }
    if (/(schemas?|models?|migrations?|database|db|prisma|typeorm|sqlalchemy)/.test(lower)) {
      suggestedTopics.add("data-storage");
    }
    if (/(config|settings|\.env|security|auth|secrets?)/.test(lower)) {
      suggestedTopics.add("security-config");
    }
    if (/(agents|claude|cursor|kiro)\.md/.test(lower)) {
      suggestedTopics.add("agent-guidelines");
    }
  }

  return {
    changedFiles,
    structuralFiles,
    suggestedTopics: [...suggestedTopics].sort(),
    requiresMemoryUpdate: structuralFiles.length > 0
  };
}
