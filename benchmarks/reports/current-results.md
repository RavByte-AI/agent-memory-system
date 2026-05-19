# Current Benchmark Results

Run date: 2026-05-07  
Run id: `run-1778180126928-d2d2cb`  
Repository: Agent Memory System self-benchmark  
Tasks: 21  
Mode: baseline vs AMS  
Agent profile: `antigravity`

These are maintainer-run benchmark results from the current harness. They are useful for understanding the shape of AMS benefits, but they are not independent validation and should be reproduced on more repositories before making general claims.

## Aggregate Results

| Metric | Baseline | AMS | Observed change | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Average tokens per task | 34,487 | 42,467 | -23% token reduction | AMS used more tokens in this run because agents read generated memory before targeted files. |
| Average files traversed | 35 | 19 | 45% fewer files | Agents performed less broad repository traversal when memory artifacts were available. |
| Average hallucinated files | 1.0 | 1.0 | 0% change | This run did not measure a reduction in hallucinated file references. |
| Concept accuracy | 66% | 100% | +34 percentage points | AMS mode found more expected project concepts in this self-benchmark. |
| Estimated cost per task | $0.3276 | $0.3716 | -13% cost reduction | Estimated cost increased with the larger AMS context. |
| Overall score | n/a | n/a | 8/100 | Current composite score is low and should be treated as an early baseline. |

## What This Suggests

- AMS can reduce exploratory file traversal by giving agents a project map and context index.
- AMS can improve project-concept recall in tasks where generated memory contains the relevant facts.
- AMS does not automatically reduce token usage. Generated memory has a context cost, and future benchmarks should measure when that upfront cost pays off.
- Handoff and recovery benefits need more live-agent reproduction with raw logs before being used as broad claims.

## Raw Inputs

- Aggregate metrics: `benchmarks/metrics/aggregate-metrics.json`
- Run manifest: `benchmarks/runs/run-1778180126928-d2d2cb.json`
- GitHub-oriented report: `benchmarks/reports/github-benchmark.md`
- Technical report: `benchmarks/reports/technical-report.md`

## Next Reproduction Step

Run the same task categories on at least three fixture repositories and include raw or redacted logs:

```bash
npx tsx benchmarks/scripts/run.ts --repo . --mode both
npx tsx benchmarks/scripts/report.ts
```

