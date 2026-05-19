# Agent Memory System - Benchmark Suite

## Purpose

This benchmark suite evaluates whether Agent Memory System (AMS) changes AI coding agent workflows compared with cold-start repository exploration.

The benchmark is still early. Current reports should be read as maintainer-run measurements on specific repositories, prompts, and scoring rules, not as independent validation or universal performance claims.

## Structure

| Path | Purpose |
| --- | --- |
| `spec/benchmark-spec.md` | Methodology, scenarios, dataset shape, and run metadata requirements. |
| `spec/scoring-rubric.md` | Retrieval, coding success, continuity, duplicate-work, and safety scoring. |
| `spec/limitations.md` | Known limitations and reporting boundaries. |
| `harness/` | Shared types, task definitions, runner, metrics, and reporter code. |
| `config/` | Repository and agent metadata used by the current harness. |
| `scripts/` | CLI entrypoints for running and reporting benchmark results. |
| `runs/` | Machine-readable run manifests. |
| `metrics/` | Aggregated metrics. |
| `reports/` | Maintainer-run benchmark reports. |

## Quick Start

```bash
# Run the current automated benchmark on this repository
npx tsx benchmarks/scripts/run.ts --repo . --mode both

# Generate reports from collected results
npx tsx benchmarks/scripts/report.ts

# Run a single task category
npx tsx benchmarks/scripts/run.ts --repo . --category understanding --mode both
```

## Benchmark Modes

| Mode | Description |
| --- | --- |
| `baseline` | Simulates an agent workflow without AMS memory artifacts. |
| `ams` | Simulates an agent workflow with generated memory, graph context, and handoff files. |
| `both` | Runs both modes and generates comparative output. |

## Metric Categories

1. Context usage
2. File traversal
3. Repository understanding
4. False path and hallucination checks
5. Cross-session recovery
6. Multi-agent continuity
7. Validation follow-through
8. Code quality proxy
9. Onboarding speed
10. Developer experience

## Research Question

Does persistent repository memory improve measurable coding-agent workflows under the same task, repository, model/tool, and scoring constraints?

## Current Results

The current checked-in run is a self-benchmark of this repository.

| Metric | Baseline | AMS | Observed change |
| --- | ---: | ---: | ---: |
| Average tokens per task | 34,487 | 42,467 | AMS used more tokens in this run |
| Average files traversed | 35 | 19 | 45% fewer files |
| Average hallucinated files | 1.0 | 1.0 | 0% change |
| Concept accuracy | 66% | 100% | +34 percentage points |
| Estimated cost per task | $0.3276 | $0.3716 | estimated cost increased |

Interpretation:

- AMS reduced broad file traversal in this run.
- AMS improved project-concept recall in this self-benchmark.
- AMS did not reduce hallucinated file references in this run.
- AMS increased token and estimated cost usage because generated memory was included as context.

See [current-results.md](./reports/current-results.md) for the balanced summary and links to raw run artifacts.

## Reporting Standards

Every benchmark report should include:

- repository commit SHA
- AMS version
- benchmark harness version
- OS and shell
- agent/tool version
- model name and date, where applicable
- task id and prompt
- baseline and AMS mode definitions
- raw or redacted logs
- scoring rubric version
- known limitations

## Current Next Step

The next benchmark milestone is a v0 reproducibility set:

- 3 fixture repositories
- 12 tasks across understanding, refactoring, debugging, recovery, and continuity
- baseline vs AMS mode
- raw JSONL logs
- retrieval scoring against gold files
- markdown report with limitations

See:

- [Benchmark specification](./spec/benchmark-spec.md)
- [Scoring rubric](./spec/scoring-rubric.md)
- [Limitations](./spec/limitations.md)
