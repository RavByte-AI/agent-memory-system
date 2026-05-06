import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateMemory } from "../src/generator/generate.js";
import { writeMemoryArtifacts } from "../src/generator/write.js";
import { scanRepository } from "../src/scanner/scan.js";
import { validateMemory } from "../src/validators/validate.js";

async function copyDir(source: string, target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDir(src, dst);
    } else {
      await fs.copyFile(src, dst);
    }
  }
}

describe("example repository integrations", () => {
  for (const fixture of ["node-app", "python-api", "monorepo"]) {
    it(`generates and validates memory for examples/${fixture}`, async () => {
      const source = path.resolve("examples", fixture);
      const root = await fs.mkdtemp(path.join(os.tmpdir(), `agent-memory-${fixture}-`));
      await copyDir(source, root);

      const scan = await scanRepository({ rootDir: root });
      const artifacts = await generateMemory(scan);
      await writeMemoryArtifacts(root, "memory", artifacts, false);
      const result = await validateMemory({ rootDir: root, memoryDir: "memory" });

      expect(result.ok).toBe(true);
      expect(await fs.stat(path.join(root, "memory", "context-index.json"))).toBeTruthy();
    });
  }
});
