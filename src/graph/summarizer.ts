/**
 * src/graph/summarizer.ts
 *
 * Produces a token-efficient AgentGraphSummary from a full GraphData.
 * Target: < 2000 tokens vs 50,000+ tokens for the raw graph JSON.
 * Agents should read this first; drill into repository-graph.json only when needed.
 */
import type { AgentGraphSummary, GraphData } from "./types.js";
import { buildReverseIndex, computeBlastRadius } from "./blast-radius.js";

export function summarizeGraph(graph: GraphData): AgentGraphSummary {
  const rev = buildReverseIndex(graph.edges);

  // Entry points
  const entryPoints = graph.files
    .filter((f) => f.importedBy.length === 0 && f.layer !== "test" && f.layer !== "config")
    .map((f) => f.path);

  // High-risk files (most dependents)
  const highRiskFiles = [...graph.files]
    .sort((a, b) => b.importedBy.length - a.importedBy.length)
    .slice(0, 5)
    .filter((f) => f.importedBy.length > 0)
    .map((f) => ({
      path: f.path,
      dependents: f.importedBy.length,
      reason: `${f.importedBy.length} files import this — changes here have the widest blast radius.`,
    }));

  // Critical paths: longest import chain from each entry point
  const criticalPaths: AgentGraphSummary["criticalPaths"] = [];
  for (const ep of entryPoints.slice(0, 3)) {
    const chain = traceChain(ep, graph.edges, 6);
    if (chain.length > 1) {
      criticalPaths.push({ steps: chain, description: `Execution chain from ${ep}` });
    }
  }

  // Security issues (compact)
  const securityIssues = graph.files.flatMap((f) =>
    f.securityIssues.map((i) => ({ file: f.path, kind: i.kind, severity: i.severity }))
  ).slice(0, 10);

  // Layer violations (compact)
  const layerViolations = graph.layerViolations
    .slice(0, 5)
    .map((v) => ({ source: v.source, target: v.target }));

  // Navigation hints
  const navigationHints: AgentGraphSummary["navigationHints"] = [
    {
      query: "Where is the CLI entry point?",
      startFile: entryPoints.find((f) => /cli/i.test(f)) ?? entryPoints[0] ?? "",
      relatedFiles: [],
    },
    {
      query: "What are the highest-risk files to change?",
      startFile: highRiskFiles[0]?.path ?? "",
      relatedFiles: highRiskFiles.slice(1).map((f) => f.path),
    },
  ].filter((h) => h.startFile);

  const summary: AgentGraphSummary = {
    repoName: graph.repoName,
    grade: graph.grade,
    healthScore: graph.healthScore,
    entryPoints,
    highRiskFiles,
    criticalPaths,
    layers: graph.layers,
    circularDeps: graph.circularDependencies.slice(0, 5),
    layerViolations,
    securityIssues,
    navigationHints,
    estimatedTokens: 0,
  };

  // Rough token estimate (1 token ≈ 4 chars)
  summary.estimatedTokens = Math.ceil(JSON.stringify(summary).length / 4);

  return summary;
}

/** Trace the longest direct import chain from a starting file (DFS, no cycles). */
function traceChain(start: string, edges: GraphData["edges"], maxDepth: number): string[] {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind === "import") (adj.get(e.source) ?? (adj.set(e.source, []), adj.get(e.source)!)).push(e.target);
  }

  let longest: string[] = [start];
  const visited = new Set<string>();

  function dfs(node: string, chain: string[]): void {
    if (chain.length > maxDepth || visited.has(node)) return;
    visited.add(node);
    if (chain.length > longest.length) longest = [...chain];
    for (const nb of adj.get(node) ?? []) dfs(nb, [...chain, nb]);
    visited.delete(node);
  }

  dfs(start, [start]);
  return longest;
}
