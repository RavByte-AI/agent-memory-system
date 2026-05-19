# Benchmark Limitations

## Current Limitations

- Early benchmark results are maintainer-run and have not yet been independently reproduced.
- Some current metrics use approximations, such as token estimates from character counts.
- A self-benchmark can overfit to the repository that created the tool.
- Static graph results are useful context, but they are not a replacement for tests or review.
- Different coding agents expose different logs and tool traces, which can make cross-agent comparisons uneven.
- Agent behavior can vary by model version, prompt wording, tool permissions, and context budget.

## Reporting Boundaries

Benchmark reports should avoid:

- universal claims from one repository
- charts without raw or redacted data
- hiding failed runs
- comparing different models as if only memory mode changed
- treating simulated agent behavior as equivalent to live agent behavior

## Preferred Language

Use:

- "In this fixture..."
- "In this maintainer-run benchmark..."
- "This run measured..."
- "Needs independent reproduction..."
- "Observed under these prompts and tools..."

Avoid:

- certainty claims from early benchmark results
- universal performance claims
- broad superiority claims without comparable methodology
- claims that one tool solves agent memory as a whole

## Reproducibility Checklist

Each report should include:

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
