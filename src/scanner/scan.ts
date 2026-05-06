import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { DEFAULT_MAX_FILE_BYTES } from "../constants.js";
import { extractEnvNames } from "../analyzers/env.js";
import { analyzeManifest, commandsFromManifests, detectFrameworks } from "../analyzers/manifest.js";
import type { ManifestInfo, ProjectScan, RepoProfile, ScanOptions } from "../types.js";
import { ignoreGlobs, relativePath } from "./path-utils.js";

const MANIFEST_NAMES = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "tsconfig.json",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml"
]);

function languageFromPath(filePath: string): string | undefined {
  const ext = path.extname(filePath);
  const map: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".py": "Python",
    ".rs": "Rust",
    ".go": "Go",
    ".java": "Java",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP"
  };
  return map[ext];
}

function inferProfiles(scan: Pick<ProjectScan, "manifests" | "sourceFiles" | "readmes">): RepoProfile[] {
  const profiles = new Set<RepoProfile>();
  const nodeManifests = scan.manifests.filter((manifest) => manifest.type === "node");
  const pythonManifests = scan.manifests.filter((manifest) => manifest.type === "python");
  const hasAppRoutes = scan.sourceFiles.some((file) => /(^|\/)app\/.*(page|layout|route)\.(tsx|ts|jsx|js)$/.test(file));
  const hasServerFiles = scan.sourceFiles.some((file) => /(^|\/)(api|server|routes|controllers|domains)\//.test(file));
  const hasCli = nodeManifests.some((manifest) => manifest.scripts && ("start" in manifest.scripts || "bin" in manifest));

  if (nodeManifests.length + pythonManifests.length > 1) profiles.add("monorepo");
  if (hasAppRoutes || nodeManifests.some((manifest) => manifest.dependencies?.some((dep) => ["next", "react", "vue", "svelte"].includes(dep)))) {
    profiles.add("frontend");
  }
  if (hasServerFiles || pythonManifests.length > 0 || nodeManifests.some((manifest) => manifest.dependencies?.some((dep) => ["express", "fastify", "@nestjs/core"].includes(dep)))) {
    profiles.add("backend");
  }
  if (hasCli) profiles.add("cli-package");
  if (scan.readmes.length >= Math.max(2, scan.sourceFiles.length / 20)) profiles.add("docs-heavy");
  if (profiles.size > 1) profiles.add("mixed");
  if (profiles.size === 0) profiles.add("auto");

  return [...profiles].sort() as RepoProfile[];
}

function chooseProfile(requested: RepoProfile, detected: RepoProfile[]): RepoProfile {
  if (requested !== "auto") {
    return requested;
  }
  return detected.includes("mixed") ? "mixed" : detected[0] ?? "auto";
}

async function safeRead(rootDir: string, relPath: string, maxFileBytes: number): Promise<{ content?: string; reason?: string }> {
  const fullPath = path.join(rootDir, relPath);
  try {
    const stat = await fs.stat(fullPath);
    if (stat.size > maxFileBytes) {
      return { reason: `skipped: file exceeds ${maxFileBytes} bytes` };
    }
    return { content: await fs.readFile(fullPath, "utf8") };
  } catch (error) {
    return { reason: error instanceof Error ? error.message : String(error) };
  }
}

export async function scanRepository(options: ScanOptions = {}): Promise<ProjectScan> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const profile = options.profile ?? "auto";
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;

  const files = await fg(["**/*"], {
    cwd: rootDir,
    onlyFiles: true,
    dot: true,
    ignore: ignoreGlobs()
  });

  const manifests: ManifestInfo[] = [];
  const readmes: string[] = [];
  const agentFiles: string[] = [];
  const sourceFiles: string[] = [];
  const routeFiles: string[] = [];
  const apiFiles: string[] = [];
  const configFiles: string[] = [];
  const envVars = new Set<string>();
  const databaseHints = new Set<string>();
  const deploymentHints = new Set<string>();
  const riskNotes = new Set<string>();
  const unreadableFiles: Array<{ path: string; reason: string }> = [];
  const languages = new Set<string>();

  for (const relPath of files.sort()) {
    const base = path.basename(relPath);
    const ext = path.extname(relPath);
    const lang = languageFromPath(relPath);
    if (lang) languages.add(lang);

    const isSource = /\.(ts|tsx|js|jsx|py|rs|go|java|cs|rb|php)$/.test(relPath);
    if (isSource) {
      sourceFiles.push(relPath);
    }
    if (/(^|\/)(routes?|pages?|app|api)\//.test(relPath)) {
      routeFiles.push(relPath);
    }
    if (/(^|\/)(api|controllers?|routes?)\//.test(relPath) || /route\.(ts|js)$/.test(relPath)) {
      apiFiles.push(relPath);
    }
    if (/(^|\/)(config|settings|\.?env)/.test(relPath) || ["tsconfig.json", "pyproject.toml"].includes(base)) {
      configFiles.push(relPath);
    }
    if (/README\.md$/i.test(base)) {
      readmes.push(relPath);
    }
    if (/^(AGENTS|CLAUDE|KIRO|CURSOR)\.md$/i.test(base)) {
      agentFiles.push(relPath);
    }

    const shouldRead =
      MANIFEST_NAMES.has(base) ||
      /^Dockerfile/.test(base) ||
      /^\.env(?:\.|$)/.test(base) ||
      /README\.md$/i.test(base) ||
      /^(AGENTS|CLAUDE|KIRO|CURSOR)\.md$/i.test(base) ||
      /TODO|FIXME|XXX/.test(relPath) ||
      isSource;

    if (!shouldRead) {
      continue;
    }

    const read = await safeRead(rootDir, relPath, maxFileBytes);
    if (!read.content) {
      unreadableFiles.push({ path: relPath, reason: read.reason ?? "unreadable" });
      continue;
    }

    const manifest = analyzeManifest(relPath, read.content);
    if (manifest) {
      manifests.push(manifest);
    }

    for (const name of extractEnvNames(relPath, read.content)) {
      envVars.add(name);
    }

    if (/DATABASE_URL|postgres|mysql|sqlite|prisma|typeorm|sqlalchemy|alembic/i.test(read.content)) {
      databaseHints.add(relPath);
    }
    if (/Dockerfile|docker-compose|kubernetes|helm|vercel|netlify|render|fly\.toml/i.test(relPath + read.content)) {
      deploymentHints.add(relPath);
    }
    if (/TODO|FIXME|XXX|stub|placeholder|not implemented/i.test(read.content)) {
      riskNotes.add(`${relPath}: contains TODO/FIXME/stub-style markers`);
    }
  }

  const partialScan = {
    manifests,
    sourceFiles,
    readmes
  };
  const detectedProfiles = inferProfiles(partialScan);
  const commands = commandsFromManifests(manifests);

  return {
    rootDir,
    repoName: path.basename(rootDir),
    profile: chooseProfile(profile, detectedProfiles),
    detectedProfiles,
    languages: [...languages].sort(),
    frameworks: detectFrameworks(manifests),
    manifests: manifests.sort((a, b) => a.path.localeCompare(b.path)),
    readmes: readmes.sort(),
    agentFiles: agentFiles.sort(),
    sourceFiles: sourceFiles.sort(),
    routeFiles: routeFiles.sort(),
    apiFiles: apiFiles.sort(),
    configFiles: configFiles.sort(),
    envVars: [...envVars].sort(),
    testCommands: commands.testCommands,
    buildCommands: commands.buildCommands,
    databaseHints: [...databaseHints].sort(),
    deploymentHints: [...deploymentHints].sort(),
    riskNotes: [...riskNotes].sort(),
    unreadableFiles
  };
}

export { relativePath };
