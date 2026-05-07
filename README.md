<p align="center">
  <img src="docs/assets/company-logo.png" alt="RAVBYTE Technologies" width="220" />
</p>

<h1 align="center">Agent Memory System</h1>

<p align="center">
  Persistent project memory, agent worklogs, and cross-agent handoffs for AI coding tools.
</p>

<p align="center">
  <a href="https://github.com/RavByte-AI/agent-memory-system"><img alt="GitHub stars" src="https://badgen.net/github/stars/RavByte-AI/agent-memory-system?icon=github"></a>
  <a href="https://github.com/RavByte-AI/agent-memory-system"><img alt="GitHub forks" src="https://badgen.net/github/forks/RavByte-AI/agent-memory-system?icon=github"></a>
  <a href="https://github.com/RavByte-AI/agent-memory-system/issues"><img alt="GitHub issues" src="https://badgen.net/github/open-issues/RavByte-AI/agent-memory-system?icon=github"></a>
  <a href="https://github.com/RavByte-AI/agent-memory-system/blob/main/LICENSE"><img alt="License" src="https://badgen.net/github/license/RavByte-AI/agent-memory-system"></a>
</p>

## What It Does

Agent Memory System gives any repository a durable memory layer that AI agents can read before they work. It scans the codebase, generates structured Markdown memory, creates a machine-readable topic index, tracks structural changes, and records handoffs so context survives when work moves between Antigravity, Codex, Claude, Cursor, or another assistant.

```bash
npx @ravbyte/agent-memory-system@latest init
```

The project is owned and maintained by **RAVBYTE TECHNOLOGIES PRIVATE LIMITED**, but it is completely open source under the MIT License and open for public contribution.

## Ownership

- Founder: Gaurav Singh
- Company: RAVBYTE TECHNOLOGIES PRIVATE LIMITED
- Website: https://www.ravbyte.com
- Founder X: https://x.com/gauravchadhry
- Founder LinkedIn: https://www.linkedin.com/in/gauravchadhry/
- Repository: https://github.com/RavByte-AI/agent-memory-system

## Why It Exists

AI coding agents are powerful, but they forget the project between sessions and tools. A task can start in Antigravity, continue in Codex, get reviewed in Claude, and lose the working state at every switch.

Agent Memory System fixes that by keeping:

- Repository structure and architecture notes
- API, storage, security, testing, and workflow context
- Agent execution checkpoints
- Commands run and files touched
- Human-readable handoff summaries
- CI-enforced memory freshness checks

## Generated Memory

```text
memory/
  00-project-overview.md
  01-repository-map.md
  02-system-architecture.md
  03-development-workflow.md
  04-api-and-interfaces.md
  05-data-and-storage.md
  06-security-and-config.md
  07-testing-and-quality.md
  08-known-issues-and-tech-debt.md
  09-agent-guidelines.md
  10-agent-worklog.md
  agent-handoff.md
  agent-worklog.jsonl
  context-index.json
  README.md
```

## Install And Use

Run once in a repository:

```bash
npx @ravbyte/agent-memory-system@latest init
```

Install globally if you prefer a persistent CLI:

```bash
npm install -g @ravbyte/agent-memory-system@latest
agent-memory init
```

Refresh memory after structural changes:

```bash
agent-memory maintain --since main
```

Check memory freshness in CI:

```bash
agent-memory maintain --since main --check
```

Record agent progress:

```bash
agent-memory worklog checkpoint \
  --agent codex \
  --message "implemented scanner validation" \
  --files src/scanner/scan.ts,tests/scanner.test.ts \
  --commands "npm test"
```

Create a handoff before switching agents:

```bash
agent-memory worklog handoff \
  --agent codex \
  --message "tests pass; README needs review" \
  --next "review docs and publish GitHub Pages"
```

## Security Features

- Documents environment variable names, never values.
- Validates generated memory for obvious secret patterns.
- Ignores generated and vendor paths such as `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `.venv/`, `__pycache__/`, and `target/`.
- Labels uncertain sections as `[INFERRED]`, `[INCOMPLETE]`, or `[PLANNED]`.
- Supports CI checks so stale memory cannot silently pass review.
- Encourages branch protection so all changes go through pull requests and CI.

## Open Source Contribution

Public contributions are welcome. Good first contributions include:

- New ecosystem detectors
- Better framework and route inference
- More validators for memory quality
- Improved examples and fixtures
- Agent skill integrations
- Documentation and website improvements

Before opening a pull request:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run memory:check
```

Changes to `main` should go through pull requests with the `Required CI` status check passing.

## GitHub Pages

The static website lives in `docs/` and deploys through GitHub Actions.

## Repository

https://github.com/RavByte-AI/agent-memory-system

## License

MIT
