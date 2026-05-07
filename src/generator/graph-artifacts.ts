/**
 * src/generator/graph-artifacts.ts
 *
 * Generates the five new graph-powered memory files:
 *   - repository-graph.json
 *   - architecture-flow.md
 *   - breaking-changes.json      (only when a previous snapshot exists)
 *   - cross-repo-links.json      (stub, populated by `graph link` command)
 *   - dependency-impact.md       (only when breaking changes exist)
 */
import type { ChangeSet, GraphData, GraphSnapshot } from "../graph/types.js";
import type { MemoryArtifact } from "../types.js";
import { createSnapshot } from "../graph/snapshot.js";
import { summarizeGraph } from "../graph/summarizer.js";
import { buildReverseIndex, computeBlastRadius } from "../graph/blast-radius.js";

function artifact(p: string, content: string): MemoryArtifact {
  return { path: p, content: `${content.trimEnd()}\n` };
}

// ---------------------------------------------------------------------------
// repository-graph.json
// ---------------------------------------------------------------------------

export function buildRepositoryGraphArtifact(
  graph: GraphData,
  commitSha: string
): MemoryArtifact {
  const snapshot = createSnapshot(graph, commitSha);
  return artifact("repository-graph.json", JSON.stringify(snapshot, null, 2));
}

// ---------------------------------------------------------------------------
// architecture-flow.md
// ---------------------------------------------------------------------------

export function buildArchitectureFlowArtifact(graph: GraphData, commitSha: string): MemoryArtifact {
  const summary = summarizeGraph(graph);
  const rev = buildReverseIndex(graph.edges);

  // High-coupling table
  const couplingRows = [...graph.files]
    .sort((a, b) => b.importedBy.length - a.importedBy.length)
    .slice(0, 8)
    .filter((f) => f.importedBy.length > 0)
    .map((f) => `| \`${f.path}\` | ${f.importedBy.length} | ${f.importedBy.length > 5 ? "High" : "Medium"} |`)
    .join("\n");

  // Layer table
  const layerRows = Object.entries(graph.layers)
    .filter(([, files]) => files && files.length > 0)
    .map(([layer, files]) => `| \`${layer}\` | ${files!.length} files | ${files!.slice(0, 2).map((f) => `\`${f}\``).join(", ")}${files!.length > 2 ? ` +${files!.length - 2} more` : ""} |`)
    .join("\n");

  // Critical paths
  const paths = summary.criticalPaths
    .map((p, i) => `${i + 1}. **${p.description}**\n   \`${p.steps.join(" → ")}\``)
    .join("\n\n");

  // Dead code files
  const dead = graph.files.filter(
    (f) => f.importedBy.length === 0 && !/(index|main)/.test(f.path) && f.layer !== "config" && f.layer !== "test"
  );

  const content = `# Architecture Flow

**Last Updated:** ${new Date().toISOString().slice(0, 10)}
**Graph Commit:** ${commitSha}
**Health:** ${graph.grade} (${graph.healthScore}/100)
**Files:** ${graph.stats.totalFiles} | **Edges:** ${graph.stats.totalEdges} | **Functions:** ${graph.stats.totalFunctions}

---

## Architectural Layers

| Layer | Summary |
|---|---|
${layerRows}

## Critical Paths

${paths || "_No multi-hop paths detected._"}

## High-Coupling Files

Files with the most dependents — changes here have the widest blast radius.

| File | Dependents | Risk |
|---|---|---|
${couplingRows || "_No high-coupling files detected._"}

## Entry Points

Public surface — files that no other file imports:

${summary.entryPoints.map((f) => `- \`${f}\``).join("\n") || "- _None detected._"}

## Circular Dependencies

${graph.circularDependencies.length === 0
    ? "None detected. ✅"
    : graph.circularDependencies.map((c) => `- \`${c.join(" → ")}\``).join("\n")}

## Layer Violations

${graph.layerViolations.length === 0
    ? "None detected. ✅"
    : graph.layerViolations.slice(0, 10).map((v) => `- \`${v.source}\` (${v.sourceLayer}) → \`${v.target}\` (${v.targetLayer})`).join("\n")}

## Potentially Dead Code

${dead.length === 0
    ? "No unreferenced non-entry files detected. ✅"
    : dead.slice(0, 10).map((f) => `- \`${f.path}\` (layer: ${f.layer})`).join("\n")}

## Security Issues

${graph.stats.securityIssues === 0
    ? "No security issues detected. ✅"
    : graph.files
        .flatMap((f) => f.securityIssues.map((i) => `- \`${f.path}\` line ${i.line}: **${i.kind}** (${i.severity})`))
        .slice(0, 10)
        .join("\n")}

## Agent Navigation Hints

- To understand the overall structure → start at the entry points listed above
- To find what breaks when changing a file → run \`agent-memory graph blast-radius --file <path>\`
- To understand a file's role → run \`agent-memory graph query --file <path>\`
- To see all files in a layer → run \`agent-memory graph query --layer <layer>\`
- Full graph data → \`memory/repository-graph.json\`
`;

  return artifact("architecture-flow.md", content);
}

// ---------------------------------------------------------------------------
// breaking-changes.json
// ---------------------------------------------------------------------------

export function buildBreakingChangesArtifact(changeSet: ChangeSet): MemoryArtifact {
  return artifact("breaking-changes.json", JSON.stringify(changeSet, null, 2));
}

// ---------------------------------------------------------------------------
// dependency-impact.md
// ---------------------------------------------------------------------------

export function buildDependencyImpactArtifact(changeSet: ChangeSet): MemoryArtifact {
  const breaking = changeSet.breakingChanges;
  const modified = changeSet.modifiedFiles;

  const breakingSection = breaking.length === 0
    ? "No breaking changes detected. ✅"
    : breaking.map((bc) => {
        const affected = bc.affectedFiles.map((f) => `  - \`${f}\``).join("\n");
        return `### ${bc.type === "removed-export" ? "❌" : "⚠️"} ${bc.type}: \`${bc.symbol ?? ""}\` (${bc.file})\n\n**Severity:** ${bc.severity}\n${affected ? `**Affected files:**\n${affected}` : ""}\n\n**Recommendation:** ${bc.recommendation}`;
      }).join("\n\n---\n\n");

  const modifiedRows = modified
    .map((m) => `| \`${m.file}\` | ${m.blastRadius} | ${m.transitiveDependents.slice(0, 3).map((f) => `\`${f}\``).join(", ")}${m.transitiveDependents.length > 3 ? " ..." : ""} |`)
    .join("\n");

  const content = `# Dependency Impact Report

**Last Updated:** ${new Date().toISOString().slice(0, 10)}
**Base:** \`${changeSet.baseCommit}\` → **Head:** \`${changeSet.headCommit}\`

---

## Breaking Changes

${breakingSection}

---

## Modified Files — Blast Radius

| File Changed | Transitive Dependents | Affected Files (sample) |
|---|---|---|
${modifiedRows || "_No modified files._"}

---

## Added Symbols

${changeSet.addedSymbols.length === 0
    ? "_No new exports._"
    : changeSet.addedSymbols.map((s) => `- \`${s.symbol}\` (${s.kind}) in \`${s.file}\``).join("\n")}
`;

  return artifact("dependency-impact.md", content);
}

// ---------------------------------------------------------------------------
// cross-repo-links.json  (stub)
// ---------------------------------------------------------------------------

export function buildCrossRepoLinksArtifact(repoName: string, repoUrl: string): MemoryArtifact {
  const stub = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    primaryRepo: { name: repoName, url: repoUrl },
    linkedRepos: [],
    sharedDependencies: [],
    crossRepoImports: [],
    _note: "Populate linkedRepos using: agent-memory graph link --repo <url>",
  };
  return artifact("cross-repo-links.json", JSON.stringify(stub, null, 2));
}
