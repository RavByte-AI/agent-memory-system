// ============================================================
// src/graph/types.ts — Graph-specific type definitions
// ============================================================

/** Architectural layer a file belongs to. */
export type ArchLayer =
  | "ui"
  | "components"
  | "services"
  | "utils"
  | "data"
  | "config"
  | "test"
  | "modules"
  | "unknown";

/** A single extracted function / method. */
export interface FunctionNode {
  name: string;
  line: number;
  exported: boolean;
  isClassMethod: boolean;
  complexity: number;
  /** File paths that call this function. */
  calledBy: string[];
}

/** An exported symbol from a file. */
export interface ExportedSymbol {
  name: string;
  kind: "function" | "class" | "const" | "type" | "default" | "unknown";
  line: number;
}

/** A security issue detected in a file. */
export interface SecurityIssue {
  kind: "hardcoded-secret" | "sql-injection" | "eval-usage" | "debug-statement";
  severity: "high" | "medium" | "low";
  line: number;
  snippet?: string;
}

/** A design / anti-pattern detected across files. */
export interface PatternMatch {
  name: string;
  severity: "info" | "warning";
  isAnti: boolean;
  files: string[];
  description: string;
  metrics: Record<string, number>;
}

/** A layer violation — a lower-level file importing from a higher-level layer. */
export interface LayerViolation {
  source: string;
  target: string;
  sourceLayer: ArchLayer;
  targetLayer: ArchLayer;
}

/** A graph edge representing a dependency relationship. */
export interface GraphEdge {
  source: string;
  target: string;
  kind: "import" | "call" | "wiki-link" | "md-link";
  /** Specific symbols imported / referenced. */
  symbols: string[];
  weight: number;
}

/** A full node in the dependency graph, representing one file. */
export interface FileNode {
  path: string;
  name: string;
  layer: ArchLayer;
  lines: number;
  complexity: number;
  churn: number;
  /** 0–100 per-file health score. */
  healthScore: number;
  functions: FunctionNode[];
  /** Resolved file paths this file imports. */
  imports: string[];
  /** Resolved file paths that import this file. */
  importedBy: string[];
  exportedSymbols: ExportedSymbol[];
  securityIssues: SecurityIssue[];
}

/** Aggregate statistics for the whole graph. */
export interface GraphStats {
  totalFiles: number;
  totalFunctions: number;
  totalEdges: number;
  circularDependencies: number;
  deadCodeFiles: number;
  avgCoupling: number;
  securityIssues: number;
  layerViolations: number;
}

/** The complete analysed graph for a repository. */
export interface GraphData {
  repoName: string;
  rootDir: string;
  grade: "A" | "B" | "C" | "D" | "F";
  healthScore: number;
  stats: GraphStats;
  /** Files grouped by their detected layer. */
  layers: Partial<Record<ArchLayer, string[]>>;
  files: FileNode[];
  edges: GraphEdge[];
  patterns: PatternMatch[];
  circularDependencies: string[][];
  layerViolations: LayerViolation[];
}

/** A point-in-time snapshot of a GraphData, suitable for diffing. */
export interface GraphSnapshot extends GraphData {
  version: "1.0";
  generatedAt: string;
  commitSha: string;
}

/** A single breaking change detected between two snapshots. */
export interface BreakingChange {
  type:
    | "removed-export"
    | "signature-change"
    | "deleted-file"
    | "renamed-symbol";
  file: string;
  symbol?: string;
  severity: "breaking" | "warning" | "info";
  affectedFiles: string[];
  recommendation: string;
}

/** Full diff between two graph snapshots. */
export interface ChangeSet {
  baseCommit: string;
  headCommit: string;
  generatedAt: string;
  summary: {
    addedExports: number;
    removedExports: number;
    newFiles: number;
    deletedFiles: number;
    blastRadiusTotal: number;
  };
  breakingChanges: BreakingChange[];
  addedSymbols: { file: string; symbol: string; kind: string }[];
  modifiedFiles: {
    file: string;
    changeType: string;
    blastRadius: number;
    transitiveDependents: string[];
  }[];
  blastRadiusMap: Record<string, string[]>;
}

/** Cross-repository dependency link. */
export interface CrossRepoLink {
  sourceRepo: string;
  targetRepo: string;
  targetPackage: string;
  importedSymbols: string[];
  versionConstraint: string;
  breakingRisk: "none" | "low" | "medium" | "high";
  lastScanned?: string;
}

/** Token-efficient graph summary for AI agents. */
export interface AgentGraphSummary {
  repoName: string;
  grade: string;
  healthScore: number;
  entryPoints: string[];
  highRiskFiles: { path: string; dependents: number; reason: string }[];
  criticalPaths: { steps: string[]; description: string }[];
  layers: Partial<Record<ArchLayer, string[]>>;
  circularDeps: string[][];
  layerViolations: { source: string; target: string }[];
  securityIssues: { file: string; kind: string; severity: string }[];
  navigationHints: { query: string; startFile: string; relatedFiles: string[] }[];
  estimatedTokens: number;
}

/** Options for analysing a repository. */
export interface GraphAnalyzeOptions {
  rootDir: string;
  maxFiles?: number;
  includeTests?: boolean;
  excludePatterns?: string[];
  /** 'shallow' = import edges only; 'full' = edges + functions + security */
  depth?: "shallow" | "full";
}
