# Agent Memory System — Benchmark Suite

## Purpose

A scientific, reproducible benchmark evaluating how Agent Memory System (AMS) improves
AI coding agent workflows compared to raw workflows without persistent memory infrastructure.

## Structure

```
benchmarks/
├── spec/
│   └── benchmark-spec.md          # Full methodology, task definitions, metrics
├── harness/
│   ├── types.ts                   # Shared types for all benchmark data
│   ├── tasks.ts                   # 42 canonical benchmark tasks across 7 categories
│   ├── metrics.ts                 # Metric collection and scoring engine
│   ├── runner.ts                  # Experiment runner (baseline vs. AMS mode)
│   └── reporter.ts                # Markdown + JSON report generator
├── config/
│   ├── repositories.json          # 5 target repositories with metadata
│   └── agents.json                # Agent compatibility matrix
├── scripts/
│   ├── run.ts                     # CLI: npx tsx benchmarks/scripts/run.ts
│   └── report.ts                  # CLI: npx tsx benchmarks/scripts/report.ts
├── results/                       # Per-run JSON results (git-ignored raw)
├── runs/                          # Machine-readable run manifests
├── metrics/                       # Aggregated metric CSVs
├── raw-logs/                      # Prompt logs, token estimates, traversal logs
└── reports/
    ├── technical-report.md        # Full research-grade report
    ├── executive-summary.md       # 1-page business summary
    ├── developer-summary.md       # Developer-facing comparison
    └── github-benchmark.md        # GitHub-ready table report
```

## Quick Start

```bash
# Run the full automated benchmark on this repository
npx tsx benchmarks/scripts/run.ts --repo . --mode both

# Generate reports from collected results
npx tsx benchmarks/scripts/report.ts

# Run a single task category
npx tsx benchmarks/scripts/run.ts --repo . --category understanding --mode both
```

## Benchmark Modes

| Mode | Description |
|---|---|
| `baseline` | Simulates agent workflow WITHOUT AMS (cold-start, full directory traversal) |
| `ams` | Simulates agent workflow WITH AMS (memory files, graph, handoffs) |
| `both` | Runs both and generates comparative report |

## Metric Categories

1. Context Usage Reduction (tokens)
2. Task Completion Speed (iterations / files)
3. Repository Understanding Accuracy
4. Hallucination Reduction
5. Cross-Session Recovery Quality
6. Multi-Agent Continuity Score
7. Token Cost Savings ($)
8. Code Quality Proxy
9. Onboarding Speed
10. Developer Experience Score

## Research Question

> "Does persistent repository memory significantly improve autonomous software
> engineering workflows for AI coding agents?"

See `benchmarks/reports/technical-report.md` for the full analysis.
