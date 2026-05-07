/**
 * src/graph/blast-radius.ts
 * Blast radius BFS, circular dependency detection, and layer violation detection.
 */
import type { FileNode, GraphEdge, LayerViolation } from "./types.js";

/** Build reverse index: target → set of sources that import it. */
export function buildReverseIndex(edges: GraphEdge[]): Map<string, Set<string>> {
  const rev = new Map<string, Set<string>>();
  for (const edge of edges) {
    (rev.get(edge.target) ?? (rev.set(edge.target, new Set()), rev.get(edge.target)!)).add(edge.source);
  }
  return rev;
}

/** BFS transitive dependents of rootFile. */
export function computeBlastRadius(
  rootFile: string,
  reverseIndex: Map<string, Set<string>>,
  maxDepth = 10
): string[] {
  const visited = new Set<string>();
  const queue: { file: string; depth: number }[] = [{ file: rootFile, depth: 0 }];
  while (queue.length) {
    const { file, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;
    for (const dep of reverseIndex.get(file) ?? []) {
      if (!visited.has(dep) && dep !== rootFile) {
        visited.add(dep);
        queue.push({ file: dep, depth: depth + 1 });
      }
    }
  }
  return [...visited];
}

/** DFS cycle detection — returns arrays of file paths forming cycles. */
export function detectCircularDependencies(files: FileNode[], edges: GraphEdge[]): string[][] {
  const adj = new Map<string, string[]>();
  for (const f of files) adj.set(f.path, []);
  for (const e of edges) {
    if (e.kind === "import" || e.kind === "call") adj.get(e.source)?.push(e.target);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const onStack = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): void {
    visited.add(node); onStack.add(node); stack.push(node);
    for (const nb of adj.get(node) ?? []) {
      if (!visited.has(nb)) dfs(nb);
      else if (onStack.has(nb)) {
        const idx = stack.indexOf(nb);
        if (idx >= 0) {
          const cycle = stack.slice(idx);
          const key = [...cycle].sort().join("|");
          if (!cycles.some((c) => [...c].sort().join("|") === key)) cycles.push([...cycle]);
        }
      }
    }
    stack.pop(); onStack.delete(node);
  }

  for (const f of files) if (!visited.has(f.path)) dfs(f.path);
  return cycles;
}

const LAYER_ORDER: Record<string, number> = {
  ui: 0, components: 0, services: 2, utils: 4, data: 3, config: 5, test: 6, modules: 5, unknown: 3,
};

/** Detect architectural layer violations. */
export function detectLayerViolations(files: FileNode[], edges: GraphEdge[]): LayerViolation[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const violations: LayerViolation[] = [];
  for (const e of edges) {
    if (e.kind !== "import") continue;
    const src = byPath.get(e.source);
    const tgt = byPath.get(e.target);
    if (!src || !tgt) continue;
    if ((LAYER_ORDER[src.layer] ?? 3) > (LAYER_ORDER[tgt.layer] ?? 3) + 1) {
      violations.push({ source: e.source, target: e.target, sourceLayer: src.layer, targetLayer: tgt.layer });
    }
  }
  return violations;
}
