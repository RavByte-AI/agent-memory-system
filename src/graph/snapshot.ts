/**
 * src/graph/snapshot.ts — Graph persistence and snapshot diffing.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { BreakingChange, ChangeSet, GraphData, GraphSnapshot } from "./types.js";
import { buildReverseIndex, computeBlastRadius } from "./blast-radius.js";

// ---------------------------------------------------------------------------
// Snapshot creation & persistence
// ---------------------------------------------------------------------------

export function createSnapshot(graph: GraphData, commitSha: string): GraphSnapshot {
  return {
    ...graph,
    version: "1.0",
    generatedAt: new Date().toISOString(),
    commitSha,
  };
}

export async function writeSnapshot(snapshot: GraphSnapshot, filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");
}

export async function readSnapshot(filePath: string): Promise<GraphSnapshot | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as GraphSnapshot;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Snapshot diffing
// ---------------------------------------------------------------------------

/** Compare two snapshots and return a ChangeSet describing breaking changes. */
export function diffSnapshots(before: GraphSnapshot, after: GraphSnapshot): ChangeSet {
  const generatedAt = new Date().toISOString();

  // Build export maps: file:symbol → kind
  const beforeExports = new Map<string, string>();
  const afterExports = new Map<string, string>();
  for (const f of before.files) {
    for (const sym of f.exportedSymbols) beforeExports.set(`${f.path}:${sym.name}`, sym.kind);
  }
  for (const f of after.files) {
    for (const sym of f.exportedSymbols) afterExports.set(`${f.path}:${sym.name}`, sym.kind);
  }

  // File sets
  const beforePaths = new Set(before.files.map((f) => f.path));
  const afterPaths = new Set(after.files.map((f) => f.path));
  const addedFiles = [...afterPaths].filter((p) => !beforePaths.has(p));
  const deletedFiles = [...beforePaths].filter((p) => !afterPaths.has(p));
  const modifiedFilePaths = after.files
    .filter((f) => beforePaths.has(f.path))
    .filter((f) => {
      const before_f = before.files.find((b) => b.path === f.path);
      return before_f && (before_f.lines !== f.lines || before_f.functions.length !== f.functions.length);
    })
    .map((f) => f.path);

  // Removed exports → breaking changes
  const breakingChanges: BreakingChange[] = [];
  const addedSymbols: ChangeSet["addedSymbols"] = [];

  for (const [key, kind] of beforeExports) {
    if (!afterExports.has(key)) {
      const [file, symbol] = key.split(":");
      // Find who used this symbol
      const affectedFiles = after.edges
        .filter((e) => e.target === file && e.symbols.includes(symbol ?? ""))
        .map((e) => e.source);
      breakingChanges.push({
        type: "removed-export",
        file: file ?? "",
        symbol,
        severity: "breaking",
        affectedFiles,
        recommendation: `Update all callers of "${symbol}" in ${affectedFiles.length} file(s) before removing.`,
      });
    }
  }

  for (const [key, kind] of afterExports) {
    if (!beforeExports.has(key)) {
      const [file, symbol] = key.split(":");
      addedSymbols.push({ file: file ?? "", symbol: symbol ?? "", kind });
    }
  }

  // Blast radius for each deleted/modified file
  const reverseIdx = buildReverseIndex(after.edges);
  const blastRadiusMap: Record<string, string[]> = {};

  for (const file of [...deletedFiles, ...modifiedFilePaths]) {
    blastRadiusMap[file] = computeBlastRadius(file, reverseIdx);
  }

  const modifiedFiles = modifiedFilePaths.map((file) => ({
    file,
    changeType: "modified",
    blastRadius: (blastRadiusMap[file] ?? []).length,
    transitiveDependents: blastRadiusMap[file] ?? [],
  }));

  const blastTotal = Object.values(blastRadiusMap).reduce((s, arr) => s + arr.length, 0);

  return {
    baseCommit: before.commitSha,
    headCommit: after.commitSha,
    generatedAt,
    summary: {
      addedExports: addedSymbols.length,
      removedExports: breakingChanges.filter((c) => c.type === "removed-export").length,
      newFiles: addedFiles.length,
      deletedFiles: deletedFiles.length,
      blastRadiusTotal: blastTotal,
    },
    breakingChanges,
    addedSymbols,
    modifiedFiles,
    blastRadiusMap,
  };
}
