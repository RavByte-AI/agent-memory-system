import fs from "node:fs/promises";
import path from "node:path";
import type { MemoryArtifact } from "../types.js";

export async function writeMemoryArtifacts(rootDir: string, outputDir: string, artifacts: MemoryArtifact[], force = false): Promise<void> {
  const targetDir = path.resolve(rootDir, outputDir);

  try {
    const existing = await fs.readdir(targetDir);
    if (existing.length > 0 && !force) {
      throw new Error(`Output directory already exists and is not empty: ${targetDir}. Re-run with --force to overwrite generated files.`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await fs.mkdir(targetDir, { recursive: true });
  for (const artifact of artifacts) {
    const destination = path.join(targetDir, artifact.path);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, artifact.content, "utf8");
  }
}
