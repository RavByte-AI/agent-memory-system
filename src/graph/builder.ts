/**
 * src/graph/builder.ts
 *
 * The main orchestrator: reads source files from disk, runs all analyzers,
 * and assembles a complete GraphData object.
 */
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import type { ArchLayer, FileNode, GraphAnalyzeOptions, GraphData, GraphEdge } from "./types.js";
import {
  isIncluded,
  extractRawImports,
  resolveImport,
  extractFunctions,
  extractExports,
  detectSecurityIssues,
  countLines,
} from "./parser.js";
import { detectLayer, groupByLayer } from "./layers.js";
import { fileHealthScore, repoHealthScore, scoreToGrade } from "./health.js";
import { buildReverseIndex, computeBlastRadius, detectCircularDependencies, detectLayerViolations } from "./blast-radius.js";
import { detectPatterns } from "./patterns.js";

const DEFAULT_IGNORE = [
  "node_modules", ".git", "dist", "build", ".next", "coverage",
  "__pycache__", ".venv", "venv", ".tox", "vendor", "target",
];

const DEFAULT_MAX_FILE_BYTES = 200_000; // 200 KB

async function safeRead(filePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > DEFAULT_MAX_FILE_BYTES) return null;
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function repoNameFromPackageJson(packageJson: string): string | null {
  try {
    const manifest = JSON.parse(packageJson) as {
      repository?: string | { url?: string };
      name?: string;
    };
    const repositoryUrl = typeof manifest.repository === "string"
      ? manifest.repository
      : manifest.repository?.url;
    const repositoryName = repositoryUrl
      ?.replace(/^git\+/, "")
      .replace(/\.git$/, "")
      .split("/")
      .filter(Boolean)
      .at(-1);
    return repositoryName ?? manifest.name ?? null;
  } catch {
    return null;
  }
}

async function inferRepoName(rootDir: string): Promise<string> {
  const manifest = await safeRead(path.join(rootDir, "package.json"));
  return (manifest ? repoNameFromPackageJson(manifest) : null) ?? path.basename(rootDir);
}

/** Build the full dependency + call graph for a local repository. */
export async function analyzeRepository(opts: GraphAnalyzeOptions): Promise<GraphData> {
  const rootDir = path.resolve(opts.rootDir);
  const repoName = await inferRepoName(rootDir);
  const depth = opts.depth ?? "full";
  const maxFiles = opts.maxFiles ?? 1000;

  const ignore = [
    ...DEFAULT_IGNORE,
    ...(opts.excludePatterns ?? []),
  ];

  if (!opts.includeTests) {
    ignore.push("**/*.spec.*", "**/*.test.*", "**/tests/**", "**/__tests__/**");
  }

  // 1. Gather all files
  const allRelPaths = await fg(["**/*"], {
    cwd: rootDir,
    onlyFiles: true,
    dot: true,
    ignore: ignore.map((p) => (p.includes("*") ? p : `**/${p}/**`)),
  });

  const includedPaths = allRelPaths
    .filter((p) => isIncluded(path.basename(p)))
    .slice(0, maxFiles);

  // 2. Parse each file
  interface RawFile {
    path: string;
    content: string;
    functions: ReturnType<typeof extractFunctions>;
  }
  const rawFiles: RawFile[] = [];

  for (const relPath of includedPaths) {
    const content = await safeRead(path.join(rootDir, relPath));
    if (!content) continue;
    rawFiles.push({
      path: relPath,
      content,
      functions: depth === "full" ? extractFunctions(content, relPath) : [],
    });
  }

  // 3. Build dependency edges
  const edges: GraphEdge[] = [];
  const allPaths = rawFiles.map((f) => f.path);

  for (const file of rawFiles) {
    const rawImports = extractRawImports(file.content, file.path);
    for (const spec of rawImports) {
      const resolved = resolveImport(spec, file.path, allPaths);
      if (resolved && resolved !== file.path) {
        // Deduplicate edges
        const exists = edges.some((e) => e.source === file.path && e.target === resolved && e.kind === "import");
        if (!exists) {
          edges.push({ source: file.path, target: resolved, kind: "import", symbols: [], weight: 1 });
        }
      }
    }
  }

  // 4. Build importedBy map from edges
  const importedByMap = new Map<string, string[]>();
  for (const e of edges) {
    const arr = importedByMap.get(e.target) ?? [];
    arr.push(e.source);
    importedByMap.set(e.target, arr);
  }

  // 5. Assemble FileNodes
  const fileNodes: FileNode[] = rawFiles.map((raw) => {
    const imports = edges.filter((e) => e.source === raw.path).map((e) => e.target);
    const importedBy = importedByMap.get(raw.path) ?? [];
    const securityIssues = depth === "full" ? detectSecurityIssues(raw.content, raw.path) : [];
    const exportedSymbols = depth === "full" ? extractExports(raw.content, raw.path) : [];
    const lines = countLines(raw.content);

    const partial = {
      path: raw.path,
      name: path.basename(raw.path),
      layer: detectLayer(raw.path) as ArchLayer,
      lines,
      complexity: raw.functions.reduce((s, f) => s + f.complexity, 0) || 1,
      churn: 0, // populated later if git is available
      functions: raw.functions,
      imports,
      importedBy,
      exportedSymbols,
      securityIssues,
    };

    return { ...partial, healthScore: fileHealthScore(partial) };
  });

  // 6. Graph-level analysis
  const reverseIdx = buildReverseIndex(edges);
  const circularDependencies = detectCircularDependencies(fileNodes, edges);
  const layerViolations = detectLayerViolations(fileNodes, edges);
  const patterns = depth === "full"
    ? detectPatterns(rawFiles.map((f) => ({ path: f.path, content: f.content, functions: f.functions })))
    : [];

  const healthScore = repoHealthScore(fileNodes, circularDependencies, layerViolations, edges.length);
  const grade = scoreToGrade(healthScore);
  const layers = groupByLayer(fileNodes.map((f) => f.path));

  const deadCodeFiles = fileNodes.filter(
    (f) => f.importedBy.length === 0 && !/(index|main)/.test(f.path) && f.layer !== "config" && f.layer !== "test"
  ).length;

  const stats = {
    totalFiles: fileNodes.length,
    totalFunctions: fileNodes.reduce((s, f) => s + f.functions.length, 0),
    totalEdges: edges.length,
    circularDependencies: circularDependencies.length,
    deadCodeFiles,
    avgCoupling: fileNodes.length > 0 ? Math.round((edges.length / fileNodes.length) * 10) / 10 : 0,
    securityIssues: fileNodes.reduce((s, f) => s + f.securityIssues.length, 0),
    layerViolations: layerViolations.length,
  };

  return { repoName, rootDir, grade, healthScore, stats, layers, files: fileNodes, edges, patterns, circularDependencies, layerViolations };
}

/** Quick convenience: get the blast radius of a single file. */
export function getBlastRadius(filePath: string, graph: GraphData): string[] {
  const rev = buildReverseIndex(graph.edges);
  return computeBlastRadius(filePath, rev);
}
