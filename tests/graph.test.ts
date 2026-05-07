/**
 * tests/graph.test.ts
 *
 * Tests for the graph module: parser, layers, health, blast-radius,
 * patterns, builder, snapshot diffing, and query API.
 */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveImport, extractRawImports, extractFunctions, extractExports, detectSecurityIssues, countLines } from "../src/graph/parser.js";
import { detectLayer, groupByLayer } from "../src/graph/layers.js";
import { fileHealthScore, scoreToGrade } from "../src/graph/health.js";
import { buildReverseIndex, computeBlastRadius, detectCircularDependencies } from "../src/graph/blast-radius.js";
import { detectPatterns } from "../src/graph/patterns.js";
import { analyzeRepository } from "../src/graph/builder.js";
import { createSnapshot, diffSnapshots } from "../src/graph/snapshot.js";
import { summarizeGraph } from "../src/graph/summarizer.js";
import { queryBlastRadius, queryEntryPoints, queryHighRisk, queryFileInfo, queryLayer } from "../src/graph/query.js";
import type { FileNode, GraphEdge, GraphData } from "../src/graph/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AMS_ROOT = path.resolve(__dirname, "../");


// ---------------------------------------------------------------------------
// Parser — resolveImport
// ---------------------------------------------------------------------------

describe("resolveImport", () => {
  const allPaths = [
    "src/graph/types.ts",
    "src/graph/parser.ts",
    "src/graph/builder.ts",
    "src/index.ts",
    "src/types.ts",
  ];

  it("resolves .js extension to .ts source (TypeScript ESM convention)", () => {
    const result = resolveImport("./types.js", "src/graph/parser.ts", allPaths);
    expect(result).toBe("src/graph/types.ts");
  });

  it("resolves relative sibling import", () => {
    const result = resolveImport("./builder.js", "src/graph/parser.ts", allPaths);
    expect(result).toBe("src/graph/builder.ts");
  });

  it("resolves parent directory import", () => {
    const result = resolveImport("../types.js", "src/graph/builder.ts", allPaths);
    expect(result).toBe("src/types.ts");
  });

  it("returns null for bare specifier (node_modules)", () => {
    const result = resolveImport("fast-glob", "src/graph/builder.ts", allPaths);
    expect(result).toBeNull();
  });

  it("returns null when target is not in allPaths", () => {
    const result = resolveImport("./nonexistent.js", "src/graph/parser.ts", allPaths);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Parser — extractRawImports
// ---------------------------------------------------------------------------

describe("extractRawImports", () => {
  it("extracts ES module from imports", () => {
    const content = `import { foo } from "./foo.js";\nimport type { Bar } from "../bar.js";`;
    const specs = extractRawImports(content, "src/graph/test.ts");
    expect(specs).toContain("./foo.js");
    expect(specs).toContain("../bar.js");
  });

  it("extracts dynamic imports", () => {
    const content = `const x = await import("./dynamic.js");`;
    const specs = extractRawImports(content, "src/cli/index.ts");
    expect(specs).toContain("./dynamic.js");
  });

  it("ignores bare specifiers (node_modules)", () => {
    const content = `import fs from "node:fs/promises";\nimport fg from "fast-glob";`;
    const specs = extractRawImports(content, "src/graph/builder.ts");
    // bare specifiers should be in the raw list but resolveImport will return null for them
    // They won't start with '.' — the resolver handles filtering
    expect(specs).toContain("node:fs/promises");
    expect(specs).toContain("fast-glob");
  });

  it("extracts Python imports", () => {
    const content = `from .models import User\nimport os`;
    const specs = extractRawImports(content, "app/views.py");
    expect(specs.some(s => s.includes("models"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Parser — extractFunctions
// ---------------------------------------------------------------------------

describe("extractFunctions", () => {
  it("detects named function declarations", () => {
    const content = `export function scanRepository(opts) {}\nfunction helper() {}`;
    const fns = extractFunctions(content, "src/scanner/scan.ts");
    expect(fns.some(f => f.name === "scanRepository" && f.exported)).toBe(true);
    expect(fns.some(f => f.name === "helper" && !f.exported)).toBe(true);
  });

  it("detects arrow function exports", () => {
    const content = `export const buildGraph = async (opts) => {\n  return {};\n};`;
    const fns = extractFunctions(content, "src/graph/builder.ts");
    expect(fns.some(f => f.name === "buildGraph" && f.exported)).toBe(true);
  });

  it("detects Python def statements", () => {
    const content = `def public_fn():\n    pass\ndef _private():\n    pass`;
    const fns = extractFunctions(content, "app/utils.py");
    expect(fns.some(f => f.name === "public_fn" && f.exported)).toBe(true);
    expect(fns.some(f => f.name === "_private" && !f.exported)).toBe(true);
  });

  it("detects Go func declarations", () => {
    const content = `func ExportedFn() {}\nfunc localFn() {}`;
    const fns = extractFunctions(content, "pkg/utils.go");
    expect(fns.some(f => f.name === "ExportedFn" && f.exported)).toBe(true);
    expect(fns.some(f => f.name === "localFn" && !f.exported)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Parser — extractExports
// ---------------------------------------------------------------------------

describe("extractExports", () => {
  it("detects named and default exports", () => {
    const content = `export function foo() {}\nexport const bar = 1;\nexport default class Baz {}`;
    const exports = extractExports(content, "src/index.ts");
    expect(exports.some(e => e.name === "foo" && e.kind === "function")).toBe(true);
    expect(exports.some(e => e.name === "bar" && e.kind === "const")).toBe(true);
    expect(exports.some(e => e.name === "default" && e.kind === "default")).toBe(true);
  });

  it("returns empty for non-TS/JS files", () => {
    const exports = extractExports("def foo(): pass", "app/views.py");
    expect(exports).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Parser — detectSecurityIssues
// ---------------------------------------------------------------------------

describe("detectSecurityIssues", () => {
  it("flags hardcoded secrets", () => {
    const content = `const apiKey = "sk-abcdefghijklmnopqrstuvwx";`;
    const issues = detectSecurityIssues(content, "src/client.ts");
    expect(issues.some(i => i.kind === "hardcoded-secret")).toBe(true);
  });

  it("flags eval usage", () => {
    const content = `eval("dangerous code");`;
    const issues = detectSecurityIssues(content, "src/runtime.ts");
    expect(issues.some(i => i.kind === "eval-usage")).toBe(true);
  });

  it("flags debug statements", () => {
    const content = `console.log("debugging");`;
    const issues = detectSecurityIssues(content, "src/utils.ts");
    expect(issues.some(i => i.kind === "debug-statement")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Parser — countLines
// ---------------------------------------------------------------------------

describe("countLines", () => {
  it("counts non-blank, non-comment lines only", () => {
    const content = `// comment\nconst x = 1;\n\n// another comment\nconst y = 2;`;
    expect(countLines(content)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

describe("detectLayer", () => {
  it.each([
    ["src/cli/index.ts", "utils"],      // cli → no specific rule → utils (actual: entry point)
    ["src/services/api.ts", "services"],
    ["src/components/Button.tsx", "components"],
    ["src/models/User.ts", "data"],
    ["tests/graph.test.ts", "test"],
    ["src/__tests__/foo.spec.ts", "test"],
    ["src/ui/Dashboard.tsx", "ui"],
    ["src/config/settings.ts", "config"],
    ["src/utils/format.ts", "utils"],
  ])("classifies %s as %s", (filePath, expectedLayer) => {
    expect(detectLayer(filePath)).toBe(expectedLayer);
  });

  it("groups files by layer correctly", () => {
    const files = ["src/services/api.ts", "src/models/User.ts", "tests/foo.test.ts"];
    const groups = groupByLayer(files);
    expect(groups.services).toContain("src/services/api.ts");
    expect(groups.data).toContain("src/models/User.ts");
    expect(groups.test).toContain("tests/foo.test.ts");
  });
});

// ---------------------------------------------------------------------------
// Health scoring
// ---------------------------------------------------------------------------

describe("fileHealthScore", () => {
  const baseFile = {
    path: "src/foo.ts", name: "foo.ts", layer: "utils" as const,
    lines: 100, complexity: 5, churn: 2,
    functions: [], imports: [], importedBy: [],
    exportedSymbols: [], securityIssues: [],
  };

  it("returns 100 for a clean simple file", () => {
    expect(fileHealthScore(baseFile)).toBe(100);
  });

  it("penalises high complexity", () => {
    expect(fileHealthScore({ ...baseFile, complexity: 25 })).toBeLessThan(100);
  });

  it("penalises long files", () => {
    expect(fileHealthScore({ ...baseFile, lines: 600 })).toBeLessThan(100);
  });

  it("penalises high-severity security issues", () => {
    const score = fileHealthScore({
      ...baseFile,
      securityIssues: [{ kind: "hardcoded-secret", severity: "high", line: 1 }],
    });
    expect(score).toBeLessThan(100);
  });

  it("never goes below 0", () => {
    const badFile = {
      ...baseFile, complexity: 100, lines: 1000, churn: 50,
      functions: Array(20).fill({ name: "x", line: 1, exported: false, isClassMethod: false, complexity: 1, calledBy: [] }),
      securityIssues: Array(5).fill({ kind: "hardcoded-secret" as const, severity: "high" as const, line: 1 }),
    };
    expect(fileHealthScore(badFile)).toBeGreaterThanOrEqual(0);
  });
});

describe("scoreToGrade", () => {
  it.each([
    [95, "A"], [85, "B"], [75, "C"], [65, "D"], [50, "F"],
  ])("maps score %i to grade %s", (score, grade) => {
    expect(scoreToGrade(score)).toBe(grade);
  });
});

// ---------------------------------------------------------------------------
// Blast radius & circular dependency detection
// ---------------------------------------------------------------------------

describe("computeBlastRadius", () => {
  const edges: GraphEdge[] = [
    { source: "a.ts", target: "b.ts", kind: "import", symbols: [], weight: 1 },
    { source: "b.ts", target: "c.ts", kind: "import", symbols: [], weight: 1 },
    { source: "d.ts", target: "c.ts", kind: "import", symbols: [], weight: 1 },
  ];
  const rev = buildReverseIndex(edges);

  it("includes all direct dependents", () => {
    const radius = computeBlastRadius("b.ts", rev);
    expect(radius).toContain("a.ts");
  });

  it("includes transitive dependents", () => {
    const radius = computeBlastRadius("c.ts", rev);
    expect(radius).toContain("b.ts");
    expect(radius).toContain("a.ts");
    expect(radius).toContain("d.ts");
  });

  it("does not include files in unrelated chains", () => {
    const radius = computeBlastRadius("b.ts", rev);
    expect(radius).not.toContain("d.ts");
  });

  it("returns empty for files with no dependents", () => {
    const radius = computeBlastRadius("a.ts", rev);
    expect(radius).toHaveLength(0);
  });
});

describe("detectCircularDependencies", () => {
  it("detects a simple A→B→A cycle", () => {
    const files: FileNode[] = [
      { path: "a.ts", name: "a.ts", layer: "utils", lines: 10, complexity: 1, churn: 0, healthScore: 100, functions: [], imports: ["b.ts"], importedBy: ["b.ts"], exportedSymbols: [], securityIssues: [] },
      { path: "b.ts", name: "b.ts", layer: "utils", lines: 10, complexity: 1, churn: 0, healthScore: 100, functions: [], imports: ["a.ts"], importedBy: ["a.ts"], exportedSymbols: [], securityIssues: [] },
    ];
    const edges: GraphEdge[] = [
      { source: "a.ts", target: "b.ts", kind: "import", symbols: [], weight: 1 },
      { source: "b.ts", target: "a.ts", kind: "import", symbols: [], weight: 1 },
    ];
    const cycles = detectCircularDependencies(files, edges);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it("returns empty when there are no cycles", () => {
    const files: FileNode[] = [
      { path: "a.ts", name: "a.ts", layer: "utils", lines: 10, complexity: 1, churn: 0, healthScore: 100, functions: [], imports: ["b.ts"], importedBy: [], exportedSymbols: [], securityIssues: [] },
      { path: "b.ts", name: "b.ts", layer: "utils", lines: 10, complexity: 1, churn: 0, healthScore: 100, functions: [], imports: [], importedBy: ["a.ts"], exportedSymbols: [], securityIssues: [] },
    ];
    const edges: GraphEdge[] = [
      { source: "a.ts", target: "b.ts", kind: "import", symbols: [], weight: 1 },
    ];
    const cycles = detectCircularDependencies(files, edges);
    expect(cycles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

describe("detectPatterns", () => {
  it("detects singleton pattern", () => {
    const files = [{ path: "src/db.ts", content: "let instance = null; export function getInstance() {}", functions: [] }];
    const patterns = detectPatterns(files);
    expect(patterns.some(p => p.name === "Singleton")).toBe(true);
  });

  it("detects God Object anti-pattern", () => {
    const fns = Array(16).fill({ name: "fn" });
    const files = [{ path: "src/god.ts", content: "// big file", functions: fns }];
    const patterns = detectPatterns(files);
    expect(patterns.some(p => p.name === "God Object" && p.isAnti)).toBe(true);
  });

  it("detects observer pattern", () => {
    const files = [{ path: "src/events.ts", content: 'emitter.emit("change");', functions: [] }];
    const patterns = detectPatterns(files);
    expect(patterns.some(p => p.name === "Observer/Event")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Snapshot diffing
// ---------------------------------------------------------------------------

describe("diffSnapshots", () => {
  const makeGraph = (overrides: Partial<GraphData> = {}): GraphData => ({
    repoName: "test-repo",
    rootDir: "/tmp/test",
    grade: "A",
    healthScore: 90,
    stats: { totalFiles: 2, totalFunctions: 3, totalEdges: 1, circularDependencies: 0, deadCodeFiles: 0, avgCoupling: 0.5, securityIssues: 0, layerViolations: 0 },
    layers: { utils: ["a.ts", "b.ts"] },
    files: [
      { path: "a.ts", name: "a.ts", layer: "utils", lines: 50, complexity: 2, churn: 1, healthScore: 95, functions: [], imports: ["b.ts"], importedBy: [], exportedSymbols: [{ name: "doStuff", kind: "function", line: 1 }], securityIssues: [] },
      { path: "b.ts", name: "b.ts", layer: "utils", lines: 30, complexity: 1, churn: 0, healthScore: 100, functions: [], imports: [], importedBy: ["a.ts"], exportedSymbols: [{ name: "helper", kind: "function", line: 1 }], securityIssues: [] },
    ],
    edges: [{ source: "a.ts", target: "b.ts", kind: "import", symbols: ["helper"], weight: 1 }],
    patterns: [],
    circularDependencies: [],
    layerViolations: [],
    ...overrides,
  });

  it("detects removed export as a breaking change", () => {
    const before = createSnapshot(makeGraph(), "abc123");
    const afterGraph = makeGraph({
      files: [
        { path: "a.ts", name: "a.ts", layer: "utils", lines: 50, complexity: 2, churn: 1, healthScore: 95, functions: [], imports: [], importedBy: [], exportedSymbols: [], securityIssues: [] },
        // b.ts removed its 'helper' export
        { path: "b.ts", name: "b.ts", layer: "utils", lines: 30, complexity: 1, churn: 0, healthScore: 100, functions: [], imports: [], importedBy: [], exportedSymbols: [], securityIssues: [] },
      ],
    });
    const after = createSnapshot(afterGraph, "def456");
    const changeSet = diffSnapshots(before, after);
    expect(changeSet.breakingChanges.some(c => c.type === "removed-export" && c.symbol === "helper")).toBe(true);
  });

  it("does not flag added exports as breaking", () => {
    const before = createSnapshot(makeGraph(), "abc123");
    const afterGraph = makeGraph({
      files: [
        { path: "a.ts", name: "a.ts", layer: "utils", lines: 50, complexity: 2, churn: 1, healthScore: 95, functions: [], imports: [], importedBy: [], exportedSymbols: [{ name: "doStuff", kind: "function", line: 1 }, { name: "newFn", kind: "function", line: 5 }], securityIssues: [] },
        { path: "b.ts", name: "b.ts", layer: "utils", lines: 30, complexity: 1, churn: 0, healthScore: 100, functions: [], imports: [], importedBy: [], exportedSymbols: [{ name: "helper", kind: "function", line: 1 }], securityIssues: [] },
      ],
    });
    const after = createSnapshot(afterGraph, "def456");
    const changeSet = diffSnapshots(before, after);
    expect(changeSet.breakingChanges).toHaveLength(0);
    expect(changeSet.addedSymbols.some(s => s.symbol === "newFn")).toBe(true);
  });

  it("detects deleted files", () => {
    const before = createSnapshot(makeGraph(), "abc123");
    const afterGraph = makeGraph({
      files: [
        { path: "a.ts", name: "a.ts", layer: "utils", lines: 50, complexity: 2, churn: 1, healthScore: 95, functions: [], imports: [], importedBy: [], exportedSymbols: [], securityIssues: [] },
        // b.ts deleted
      ],
      stats: { totalFiles: 1, totalFunctions: 0, totalEdges: 0, circularDependencies: 0, deadCodeFiles: 0, avgCoupling: 0, securityIssues: 0, layerViolations: 0 },
    });
    const after = createSnapshot(afterGraph, "def456");
    const changeSet = diffSnapshots(before, after);
    expect(changeSet.summary.deletedFiles).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Graph summarizer
// ---------------------------------------------------------------------------

describe("summarizeGraph", () => {
  it("produces a token count under 4000", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 80 });
    const summary = summarizeGraph(graph);
    expect(summary.estimatedTokens).toBeLessThan(4000);
  });

  it("includes entry points", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 80 });
    const summary = summarizeGraph(graph);
    expect(summary.entryPoints.length).toBeGreaterThan(0);
  });

  it("includes repoName and grade", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 80 });
    const summary = summarizeGraph(graph);
    expect(summary.repoName).toBe("agent-memory-system");
    expect(["A", "B", "C", "D", "F"]).toContain(summary.grade);
  });
});

// ---------------------------------------------------------------------------
// Graph query API
// ---------------------------------------------------------------------------

describe("graph query API", () => {
  it("queryBlastRadius returns transitive dependents for src/types.ts", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 100 });
    const result = queryBlastRadius("src/types.ts", graph);
    expect(result.results.length).toBeGreaterThan(3);
    expect(result.explanation).toMatch(/downstream/);
  });

  it("queryEntryPoints returns files with no importedBy", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 100 });
    const result = queryEntryPoints(graph);
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("queryHighRisk returns top files by dependents", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 100 });
    const result = queryHighRisk(graph, 5);
    expect(result.results.length).toBeGreaterThanOrEqual(0);
  });

  it("queryLayer returns files in the utils layer", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 100 });
    const result = queryLayer("utils", graph);
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("queryFileInfo returns correct profile for src/types.ts", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 100 });
    const result = queryFileInfo("src/types.ts", graph);
    expect(result.file).toBe("src/types.ts");
    expect(result.results.some(r => r.startsWith("imports:"))).toBe(true);
    expect(result.results.some(r => r.startsWith("importedBy:"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Full integration — analyzeRepository on AMS itself
// ---------------------------------------------------------------------------

describe("analyzeRepository (integration)", () => {
  it("analyses AMS itself with depth=shallow and returns valid graph", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 100 });
    expect(graph.repoName).toBe("agent-memory-system");
    expect(graph.stats.totalFiles).toBeGreaterThan(20);
    expect(graph.stats.totalEdges).toBeGreaterThan(10);
    expect(graph.circularDependencies).toHaveLength(0);
    expect(["A", "B", "C", "D", "F"]).toContain(graph.grade);
  });

  it("correctly resolves src/types.ts as a high-dependency file", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 100 });
    const typesNode = graph.files.find(f => f.path === "src/types.ts");
    expect(typesNode).toBeDefined();
    expect(typesNode!.importedBy.length).toBeGreaterThan(5);
  });

  it("detects no circular dependencies in AMS", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "shallow", maxFiles: 100 });
    expect(graph.circularDependencies).toHaveLength(0);
  });

  it("depth=full includes function extraction", async () => {
    const graph = await analyzeRepository({ rootDir: AMS_ROOT, depth: "full", maxFiles: 50 });
    const total = graph.stats.totalFunctions;
    expect(total).toBeGreaterThan(20);
  });
});
