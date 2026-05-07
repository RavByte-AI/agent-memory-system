/**
 * src/graph/index.ts — Public re-exports for the graph module.
 */
export { analyzeRepository, getBlastRadius } from "./builder.js";
export { createSnapshot, writeSnapshot, readSnapshot, diffSnapshots } from "./snapshot.js";
export { summarizeGraph } from "./summarizer.js";
export {
  queryBlastRadius,
  queryCallers,
  queryDependencies,
  queryDependents,
  queryEntryPoints,
  queryFileInfo,
  queryHighRisk,
  queryLayer,
} from "./query.js";
export { detectLayer, groupByLayer } from "./layers.js";
export { fileHealthScore, repoHealthScore, scoreToGrade } from "./health.js";
export type {
  AgentGraphSummary,
  ArchLayer,
  BreakingChange,
  ChangeSet,
  CrossRepoLink,
  ExportedSymbol,
  FileNode,
  FunctionNode,
  GraphAnalyzeOptions,
  GraphData,
  GraphEdge,
  GraphSnapshot,
  GraphStats,
  LayerViolation,
  PatternMatch,
  SecurityIssue,
} from "./types.js";
