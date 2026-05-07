/**
 * src/graph/health.ts — Per-file and repo-level health scoring.
 */
import type { FileNode, GraphData } from "./types.js";

export function fileHealthScore(file: Omit<FileNode, "healthScore">): number {
  let score = 100;
  if (file.complexity > 20) score -= 20; else if (file.complexity > 10) score -= 10;
  if (file.lines > 500) score -= 15; else if (file.lines > 300) score -= 8;
  score -= file.securityIssues.filter((i) => i.severity === "high").length * 15;
  score -= file.securityIssues.filter((i) => i.severity === "medium").length * 5;
  score -= file.securityIssues.filter((i) => i.severity === "low").length * 2;
  if (file.churn > 20) score -= 10; else if (file.churn > 10) score -= 5;
  if (file.functions.length > 15) score -= 15; else if (file.functions.length > 10) score -= 5;
  return Math.max(0, Math.min(100, score));
}

export function scoreToGrade(score: number): GraphData["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function repoHealthScore(
  files: FileNode[],
  circularDeps: string[][],
  layerViolations: { source: string }[],
  totalEdges: number
): number {
  if (files.length === 0) return 100;
  const avg = files.reduce((s, f) => s + f.healthScore, 0) / files.length;
  let score = avg;
  score -= circularDeps.length * 10;
  score -= layerViolations.length * 3;
  const avgCoupling = totalEdges / files.length;
  if (avgCoupling > 10) score -= 10; else if (avgCoupling > 5) score -= 5;
  const dead = files.filter(
    (f) => f.importedBy.length === 0 && !/(index|main)/.test(f.path) && f.layer !== "config" && f.layer !== "test"
  );
  score -= (dead.length / files.length) * 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}
