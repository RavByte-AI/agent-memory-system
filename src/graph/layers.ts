/**
 * src/graph/layers.ts — Architectural layer detection.
 */
import type { ArchLayer } from "./types.js";

const LAYER_RULES: { pattern: RegExp; layer: ArchLayer }[] = [
  { pattern: /\/(tests?|__tests?__|spec|e2e|fixtures?)\//i, layer: "test" },
  { pattern: /\.(spec|test)\.[jt]sx?$/, layer: "test" },
  { pattern: /test_\w+\.py$|_test\.py$|conftest\.py$/, layer: "test" },
  { pattern: /\/(ui|views?|pages?|templates?|static)\//i, layer: "ui" },
  { pattern: /\/(forms?|userforms?)\//i, layer: "ui" },
  { pattern: /\/components?\//i, layer: "components" },
  { pattern: /\/(services?|api|controllers?|endpoints?|router|routes?|handlers?)\//i, layer: "services" },
  { pattern: /\/(middleware|signals?|tasks?|workers?|celery|jobs?)\//i, layer: "services" },
  { pattern: /route\.[jt]sx?$/, layer: "services" },
  { pattern: /\/(models?|schemas?|migrations?|serializers?|repositories?|store)\//i, layer: "data" },
  { pattern: /\/(fixtures?|seeds?|classes?)\//i, layer: "data" },
  { pattern: /\/(utils?|helpers?|lib|common|shared)\//i, layer: "utils" },
  { pattern: /\/modules?\//i, layer: "modules" },
  { pattern: /\/(config|settings?|env)\//i, layer: "config" },
  { pattern: /settings\.py$|tsconfig|package\.json|Dockerfile|docker-compose/, layer: "config" },
];

export function detectLayer(filePath: string): ArchLayer {
  for (const { pattern, layer } of LAYER_RULES) {
    if (pattern.test(filePath)) return layer;
  }
  return "utils";
}

export function groupByLayer(filePaths: string[]): Partial<Record<ArchLayer, string[]>> {
  const groups: Partial<Record<ArchLayer, string[]>> = {};
  for (const p of filePaths) {
    const l = detectLayer(p);
    (groups[l] ??= []).push(p);
  }
  return groups;
}
