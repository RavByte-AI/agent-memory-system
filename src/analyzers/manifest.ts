import path from "node:path";
import type { ManifestInfo } from "../types.js";

function safeJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

function dependencyNames(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.keys(value as Record<string, unknown>).sort();
}

export function analyzeManifest(filePath: string, content: string): ManifestInfo | undefined {
  const name = path.basename(filePath);

  if (name === "package.json") {
    const parsed = safeJson(content) as
      | {
          name?: string;
          author?: string | { name?: string; email?: string; url?: string };
          homepage?: string;
          scripts?: Record<string, string>;
          dependencies?: unknown;
          devDependencies?: unknown;
          agentMemory?: ManifestInfo["owner"];
        }
      | undefined;
    return {
      path: filePath,
      type: "node",
      name: parsed?.name,
      author: typeof parsed?.author === "string" ? parsed.author : parsed?.author?.name,
      homepage: parsed?.homepage,
      owner: parsed?.agentMemory,
      scripts: parsed?.scripts ?? {},
      dependencies: [...dependencyNames(parsed?.dependencies), ...dependencyNames(parsed?.devDependencies)]
    };
  }

  if (name === "pyproject.toml") {
    const projectName = /name\s*=\s*["']([^"']+)["']/.exec(content)?.[1];
    return { path: filePath, type: "python", name: projectName, dependencies: [] };
  }

  if (name === "requirements.txt") {
    const dependencies = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(/[<>=~!]/)[0].trim());
    return { path: filePath, type: "python", dependencies };
  }

  if (name === "Cargo.toml") {
    const crateName = /name\s*=\s*["']([^"']+)["']/.exec(content)?.[1];
    return { path: filePath, type: "rust", name: crateName, dependencies: [] };
  }

  if (name === "go.mod") {
    const moduleName = /module\s+(\S+)/.exec(content)?.[1];
    return { path: filePath, type: "go", name: moduleName, dependencies: [] };
  }

  if (name === "pom.xml") {
    const artifact = /<artifactId>([^<]+)<\/artifactId>/.exec(content)?.[1];
    return { path: filePath, type: "java", name: artifact, dependencies: [] };
  }

  if (name === "tsconfig.json") {
    return { path: filePath, type: "typescript", dependencies: [] };
  }

  if (/^Dockerfile/.test(name) || name === "docker-compose.yml" || name === "docker-compose.yaml") {
    return { path: filePath, type: "docker", dependencies: [] };
  }

  return undefined;
}

export function detectFrameworks(manifests: ManifestInfo[]): string[] {
  const dependencies = new Set(manifests.flatMap((manifest) => manifest.dependencies ?? []));
  const frameworks = new Set<string>();
  const checks: Array<[string, string]> = [
    ["next", "Next.js"],
    ["react", "React"],
    ["vue", "Vue"],
    ["svelte", "Svelte"],
    ["express", "Express"],
    ["fastify", "Fastify"],
    ["@nestjs/core", "NestJS"],
    ["fastapi", "FastAPI"],
    ["django", "Django"],
    ["flask", "Flask"],
    ["pytest", "pytest"],
    ["vitest", "Vitest"],
    ["jest", "Jest"]
  ];

  for (const [dep, label] of checks) {
    if (dependencies.has(dep)) {
      frameworks.add(label);
    }
  }

  return [...frameworks].sort();
}

export function commandsFromManifests(manifests: ManifestInfo[]): { testCommands: string[]; buildCommands: string[] } {
  const testCommands = new Set<string>();
  const buildCommands = new Set<string>();

  for (const manifest of manifests) {
    if (manifest.type === "node" && manifest.scripts) {
      if (manifest.scripts.test) testCommands.add(`npm test (${manifest.path})`);
      if (manifest.scripts.build) buildCommands.add(`npm run build (${manifest.path})`);
    }
    if (manifest.type === "python") {
      testCommands.add(`pytest (${manifest.path})`);
    }
    if (manifest.type === "rust") {
      testCommands.add(`cargo test (${manifest.path})`);
      buildCommands.add(`cargo build (${manifest.path})`);
    }
    if (manifest.type === "go") {
      testCommands.add(`go test ./... (${manifest.path})`);
      buildCommands.add(`go build ./... (${manifest.path})`);
    }
  }

  return { testCommands: [...testCommands].sort(), buildCommands: [...buildCommands].sort() };
}
