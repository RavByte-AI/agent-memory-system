# Demo Assets Plan

This document tracks demo assets that should be recorded with real commands and reproducible outputs. Demos should be short, terminal-first, and technical.

## Standards

- Use real commands and visible output.
- Keep terminal text readable at 1080p.
- Include command transcripts below GIFs or videos.
- Do not hide failed commands; rerun and explain if needed.
- Prefer asciinema or terminal recordings that can be regenerated.

## Demo 1: First Run In A Fresh Repository

- Goal: show that AMS can be initialized quickly.
- Scenario: run AMS inside a small TypeScript or Node repository.
- Commands:
  - `npx @ravbyte/agent-memory-system@latest init`
  - `tree memory` or `Get-ChildItem memory`
  - open `memory/context-index.json`
- Expected output:
  - generated `memory/` files
  - `AGENTS.md`
  - context index with topic mappings
- Ideal duration: 35-45 seconds.

## Demo 2: Graph Blast-Radius Query

- Goal: show why graph artifacts matter before shared-interface edits.
- Scenario: inspect downstream impact of `src/types.ts`.
- Commands:
  - `agent-memory graph build`
  - `agent-memory graph query --file src/types.ts`
  - optionally `agent-memory graph diff`
- Expected output:
  - affected files
  - dependency direction
  - graph summary
- Ideal duration: 45-60 seconds.

## Demo 3: Worklog Checkpoint

- Goal: show agent progress tracking as plain repo artifacts.
- Scenario: record a checkpoint after a small change.
- Commands:
  - `agent-memory worklog checkpoint --agent codex --message "updated scanner docs" --files README.md --commands "npm test"`
  - `Get-Content memory/agent-worklog.jsonl -Tail 1`
- Expected output:
  - JSONL checkpoint with agent, message, files, and commands.
- Ideal duration: 35-45 seconds.

## Demo 4: Cross-Agent Handoff

- Goal: show how another agent/session resumes from state.
- Scenario: agent A stops after implementation; agent B reads handoff and continues.
- Commands:
  - `agent-memory worklog handoff --agent codex --message "tests pass; docs need review" --next "review README and update examples"`
  - `Get-Content memory/agent-handoff.md`
- Expected output:
  - human-readable current state, recent events, next steps, and files mentioned.
- Ideal duration: 60 seconds.

## Demo 5: Benchmark Run

- Goal: explain benchmark design without overstating results.
- Scenario: run one fixture task in baseline and AMS mode.
- Commands:
  - `npx tsx benchmarks/scripts/run.ts --repo . --category understanding --mode both`
  - `npx tsx benchmarks/scripts/report.ts`
- Expected output:
  - run JSON
  - markdown report
  - metrics table with limitations
- Ideal duration: 75-90 seconds.
