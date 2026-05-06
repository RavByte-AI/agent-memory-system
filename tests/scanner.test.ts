import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../src/scanner/scan.js";

describe("scanRepository", () => {
  it("detects Node, Python, Rust, Go, and mixed repository manifests", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-memory-scan-"));
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "mixed", scripts: { test: "vitest" }, dependencies: { next: "1.0.0" } }));
    await fs.writeFile(path.join(root, "pyproject.toml"), "[project]\nname = \"py\"\n");
    await fs.writeFile(path.join(root, "Cargo.toml"), "[package]\nname = \"rusty\"\n");
    await fs.writeFile(path.join(root, "go.mod"), "module example.com/go\n");

    const scan = await scanRepository({ rootDir: root });

    expect(scan.manifests.map((manifest) => manifest.type)).toEqual(expect.arrayContaining(["node", "python", "rust", "go"]));
    expect(scan.detectedProfiles).toContain("monorepo");
    expect(scan.frameworks).toContain("Next.js");
  });

  it("ignores generated directories", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-memory-ignore-"));
    await fs.mkdir(path.join(root, "node_modules/pkg"), { recursive: true });
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "node_modules/pkg/index.ts"), "export const ignored = true;");
    await fs.writeFile(path.join(root, "src/index.ts"), "export const kept = true;");

    const scan = await scanRepository({ rootDir: root });

    expect(scan.sourceFiles).toContain("src/index.ts");
    expect(scan.sourceFiles).not.toContain("node_modules/pkg/index.ts");
  });

  it("extracts environment variable names without values", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-memory-env-"));
    await fs.writeFile(path.join(root, ".env.example"), "DATABASE_URL=postgres://secret\nAPI_KEY=secret\n");
    await fs.writeFile(path.join(root, "index.ts"), "const value = process.env.RUNTIME_FLAG;");

    const scan = await scanRepository({ rootDir: root });

    expect(scan.envVars).toEqual(["API_KEY", "DATABASE_URL", "RUNTIME_FLAG"]);
    expect(JSON.stringify(scan)).not.toContain("postgres://secret");
  });
});
