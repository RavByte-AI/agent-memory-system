# Architecture Flow

**Last Updated:** 2026-05-07
**Graph Commit:** 6a1f05a
**Health:** B (88/100)
**Files:** 94 | **Edges:** 78 | **Functions:** 0

---

## Architectural Layers

| Layer | Summary |
|---|---|
| `utils` | 83 files | `.gitignore`, `AGENTS.md` +81 more |
| `config` | 7 files | `package.json`, `tsconfig.json` +5 more |
| `ui` | 1 files | `src/templates/format.ts` |
| `services` | 3 files | `examples/monorepo/packages/api/package.json`, `examples/monorepo/packages/api/src/routes.ts` +1 more |

## Critical Paths

_No multi-hop paths detected._

## High-Coupling Files

Files with the most dependents — changes here have the widest blast radius.

| File | Dependents | Risk |
|---|---|---|
| `src/graph/types.ts` | 13 | High |
| `src/types.ts` | 12 | High |
| `benchmarks/harness/types.ts` | 5 | Medium |
| `src/graph/blast-radius.ts` | 5 | Medium |
| `src/constants.ts` | 4 | Medium |
| `src/graph/summarizer.ts` | 4 | Medium |
| `src/graph/builder.ts` | 3 | Medium |
| `src/graph/snapshot.ts` | 3 | Medium |

## Entry Points

Public surface — files that no other file imports:

- `.gitignore`
- `AGENTS.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `package-lock.json`
- `README.md`
- `SECURITY.md`
- `vitest.config.ts`
- `.github/release.yml`
- `benchmarks/README.md`
- `docs/agent-skill.md`
- `memory/00-project-overview.md`
- `memory/01-repository-map.md`
- `memory/02-system-architecture.md`
- `memory/03-development-workflow.md`
- `memory/04-api-and-interfaces.md`
- `memory/05-data-and-storage.md`
- `memory/06-security-and-config.md`
- `memory/07-testing-and-quality.md`
- `memory/08-known-issues-and-tech-debt.md`
- `memory/09-agent-guidelines.md`
- `memory/10-agent-worklog.md`
- `memory/agent-handoff.md`
- `memory/architecture-flow.md`
- `memory/context-index.json`
- `memory/cross-repo-links.json`
- `memory/README.md`
- `memory/repository-graph.json`
- `.github/rulesets/main-branch-protection.json`
- `.github/workflows/ci.yml`
- `.github/workflows/pages.yml`
- `.github/workflows/publish.yml`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/ISSUE_TEMPLATE/scanner_accuracy.md`
- `benchmarks/metrics/aggregate-metrics.json`
- `benchmarks/reports/executive-summary.md`
- `benchmarks/reports/github-benchmark.md`
- `benchmarks/reports/technical-report.md`
- `benchmarks/scripts/report.ts`
- `benchmarks/scripts/run.ts`
- `benchmarks/runs/graph-snapshot-AgentMemorySystem.json`
- `benchmarks/runs/run-1778180126928-d2d2cb.json`
- `examples/node-app/README.md`
- `examples/python-api/pyproject.toml`
- `examples/python-api/README.md`
- `examples/python-api/requirements.txt`
- `src/agent-skill/SKILL.md`
- `src/cli/index.ts`
- `src/graph/index.ts`
- `examples/node-app/app/page.tsx`
- `examples/python-api/app/main.py`
- `examples/monorepo/packages/api/package.json`
- `examples/monorepo/packages/api/src/routes.ts`
- `examples/node-app/app/api/health/route.ts`

## Circular Dependencies

None detected. ✅

## Layer Violations

- `src/generator/generate.ts` (utils) → `src/templates/format.ts` (ui)

## Potentially Dead Code

- `.gitignore` (layer: utils)
- `AGENTS.md` (layer: utils)
- `CODE_OF_CONDUCT.md` (layer: utils)
- `CONTRIBUTING.md` (layer: utils)
- `package-lock.json` (layer: utils)
- `README.md` (layer: utils)
- `SECURITY.md` (layer: utils)
- `vitest.config.ts` (layer: utils)
- `.github/release.yml` (layer: utils)
- `benchmarks/README.md` (layer: utils)

## Security Issues

No security issues detected. ✅

## Agent Navigation Hints

- To understand the overall structure → start at the entry points listed above
- To find what breaks when changing a file → run `agent-memory graph blast-radius --file <path>`
- To understand a file's role → run `agent-memory graph query --file <path>`
- To see all files in a layer → run `agent-memory graph query --layer <layer>`
- Full graph data → `memory/repository-graph.json`
