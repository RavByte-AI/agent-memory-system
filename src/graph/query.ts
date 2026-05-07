/**
 * src/graph/query.ts — Agent-facing graph query API.
 *
 * Provides simple, named queries that agents can use to navigate
 * the repository relationship graph without parsing raw JSON.
 */
import type { FileNode, GraphData } from "./types.js";
import { buildReverseIndex, computeBlastRadius } from "./blast-radius.js";

export interface QueryResult {
  query: string;
  file?: string;
  results: string[];
  explanation: string;
}

/** Find all files that import the given file. */
export function queryDependents(filePath: string, graph: GraphData): QueryResult {
  const file = graph.files.find((f) => f.path === filePath || f.path.endsWith(filePath));
  if (!file) return { query: "dependents", file: filePath, results: [], explanation: `File "${filePath}" not found in graph.` };
  return {
    query: "dependents",
    file: file.path,
    results: file.importedBy,
    explanation: `${file.importedBy.length} file(s) directly import ${file.path}.`,
  };
}

/** Find all files that the given file imports. */
export function queryDependencies(filePath: string, graph: GraphData): QueryResult {
  const file = graph.files.find((f) => f.path === filePath || f.path.endsWith(filePath));
  if (!file) return { query: "dependencies", file: filePath, results: [], explanation: `File "${filePath}" not found.` };
  return {
    query: "dependencies",
    file: file.path,
    results: file.imports,
    explanation: `${file.path} imports ${file.imports.length} file(s).`,
  };
}

/** Transitive blast radius of changing a file. */
export function queryBlastRadius(filePath: string, graph: GraphData): QueryResult {
  const file = graph.files.find((f) => f.path === filePath || f.path.endsWith(filePath));
  if (!file) return { query: "blast-radius", file: filePath, results: [], explanation: `File "${filePath}" not found.` };
  const rev = buildReverseIndex(graph.edges);
  const radius = computeBlastRadius(file.path, rev);
  return {
    query: "blast-radius",
    file: file.path,
    results: radius,
    explanation: `Changing ${file.path} could break ${radius.length} downstream file(s).`,
  };
}

/** All entry points (files with no importedBy, non-test, non-config). */
export function queryEntryPoints(graph: GraphData): QueryResult {
  const entries = graph.files.filter(
    (f) => f.importedBy.length === 0 && f.layer !== "test" && f.layer !== "config"
  ).map((f) => f.path);
  return {
    query: "entry-points",
    results: entries,
    explanation: `${entries.length} entry point(s) found (files with no importers).`,
  };
}

/** All files in a given layer. */
export function queryLayer(layer: string, graph: GraphData): QueryResult {
  const files = graph.files.filter((f) => f.layer === layer).map((f) => f.path);
  return {
    query: `layer:${layer}`,
    results: files,
    explanation: `${files.length} file(s) in layer "${layer}".`,
  };
}

/** Files by relevance — most depended-upon files first. */
export function queryHighRisk(graph: GraphData, topN = 10): QueryResult {
  const ranked = [...graph.files]
    .sort((a, b) => b.importedBy.length - a.importedBy.length)
    .slice(0, topN);
  return {
    query: "high-risk",
    results: ranked.map((f) => `${f.path} (${f.importedBy.length} dependents)`),
    explanation: `Top ${topN} files by number of dependents. Changes here have the widest blast radius.`,
  };
}

/** Find which functions call a given function name. */
export function queryCallers(fnName: string, graph: GraphData): QueryResult {
  const callers: string[] = [];
  for (const file of graph.files) {
    for (const fn of file.functions) {
      if (fn.name === fnName) {
        callers.push(...fn.calledBy);
      }
    }
  }
  return {
    query: `callers:${fnName}`,
    results: [...new Set(callers)],
    explanation: `${callers.length} call-site(s) found for function "${fnName}".`,
  };
}

/** Summarise a file for agent consumption. */
export function queryFileInfo(filePath: string, graph: GraphData): QueryResult {
  const file = graph.files.find((f) => f.path === filePath || f.path.endsWith(filePath));
  if (!file) return { query: "file-info", file: filePath, results: [], explanation: "File not found." };
  const summary = [
    `layer: ${file.layer}`,
    `lines: ${file.lines}`,
    `complexity: ${file.complexity}`,
    `health: ${file.healthScore}/100`,
    `imports: ${file.imports.length}`,
    `importedBy: ${file.importedBy.length}`,
    `functions: ${file.functions.length}`,
    `exports: ${file.exportedSymbols.map((s) => s.name).join(", ") || "none"}`,
    `securityIssues: ${file.securityIssues.length}`,
  ];
  return {
    query: "file-info",
    file: file.path,
    results: summary,
    explanation: `Full profile for ${file.path}.`,
  };
}
