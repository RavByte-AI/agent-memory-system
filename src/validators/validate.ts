import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { ValidateOptions, ValidationResult } from "../types.js";
import { findSecretPatterns, hasLastUpdatedNearTop, isRepositoryRelativePath, missingRequiredFiles, validateContextIndex, validateGraphFreshness } from "./rules.js";

async function readIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

export async function validateMemory(memoryPathOrOptions: string | ValidateOptions = {}): Promise<ValidationResult> {
  const options: ValidateOptions =
    typeof memoryPathOrOptions === "string"
      ? { memoryDir: memoryPathOrOptions }
      : memoryPathOrOptions;
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const memoryDir = path.resolve(rootDir, options.memoryDir ?? "memory");
  const errors: string[] = [];
  const warnings: string[] = [];
  const secretFindings: string[] = [];
  const staleFileFindings: string[] = [];

  let files: string[] = [];
  try {
    files = await fg(["**/*"], { cwd: memoryDir, onlyFiles: true, dot: true });
  } catch {
    errors.push(`Memory directory does not exist: ${memoryDir}`);
  }

  const missing = missingRequiredFiles(files);
  for (const file of missing) {
    errors.push(`Missing required memory file: ${file}`);
  }

  for (const file of files.filter((item) => item.endsWith(".md"))) {
    const content = await readIfExists(path.join(memoryDir, file));
    if (!content) continue;
    if (!hasLastUpdatedNearTop(content)) {
      errors.push(`${file} is missing Last Updated near the top`);
      staleFileFindings.push(file);
    }
    for (const finding of findSecretPatterns(content)) {
      errors.push(`${file} contains possible secret pattern: ${finding}`);
      secretFindings.push(`${file}: ${finding}`);
    }
  }

  const indexContent = await readIfExists(path.join(memoryDir, "context-index.json"));
  if (indexContent) {
    try {
      const parsed = JSON.parse(indexContent) as unknown;
      if (!validateContextIndex(parsed)) {
        errors.push("context-index.json is missing required topics or entry fields");
      } else {
        for (const [topic, entry] of Object.entries(parsed)) {
          if (!isRepositoryRelativePath(entry.file)) {
            errors.push(`context-index topic ${topic} has non-relative file path: ${entry.file}`);
          }
        }
      }
    } catch {
      errors.push("context-index.json is not valid JSON");
    }
  }

  if (!options.strict) {
    for (const file of files) {
      if (/node_modules|dist|build|\.next|\.venv|__pycache__|target/.test(file)) {
        warnings.push(`Generated/vendor path appears inside memory directory: ${file}`);
      }
    }
  }

  // Graph freshness check (non-blocking — warnings only)
  const graphWarnings = await validateGraphFreshness(memoryDir, rootDir);
  warnings.push(...graphWarnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    secretFindings,
    staleFileFindings,
    missingRequiredFiles: missing
  };
}
