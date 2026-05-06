# Agent Memory System

Generate and maintain an AI-readable project memory layer for any repository with one command.

```bash
npx agent-memory-system init
```

The tool scans a project, infers its shape, writes deterministic Markdown memory files to `memory/`, creates `memory/context-index.json`, adds a lightweight `AGENTS.md` bootstrap when none exists, and preserves agent working state across Antigravity, Codex, Claude, Cursor, and other assistants.

## Ownership

- Main Developer / Founder: Gaurav Singh
- Company: RAVBYTE TECHNOLOGIES PRIVATE LIMITED
- Website: https://www.ravbyte.com
- Email: sync@ravbyte.com
- Founder X: https://x.com/gauravchadhry
- Founder LinkedIn: https://www.linkedin.com/in/gauravchadhry/

## Install

```bash
npm install -g agent-memory-system
agent-memory init
```

or run without installing:

```bash
npx agent-memory-system init
```

## Commands

```bash
agent-memory init --output memory --profile auto --force false --dry-run false
agent-memory scan --json
agent-memory validate --strict
agent-memory update --since main
agent-memory maintain --since main
agent-memory worklog checkpoint --agent codex --message "updated scanner" --files src/scanner/scan.ts
agent-memory worklog handoff --agent codex --message "ready for Claude review" --next "review generated memory"
agent-memory doctor
```

## Generated Output

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
  README.md
  context-index.json
```

## Agent Workflow

Agents should read `memory/README.md` and `memory/context-index.json` before making large changes. They should then open the domain-specific memory file for the area they are modifying.

When taking over from another agent, first read:

```bash
memory/agent-handoff.md
memory/agent-worklog.jsonl
```

During long-running work, agents should record checkpoints:

```bash
agent-memory worklog checkpoint --agent codex --message "implemented CLI maintain command" --files src/cli/index.ts --commands "npm test"
```

Before switching tools or stopping mid-task:

```bash
agent-memory worklog handoff --agent codex --message "tests pass; next publish GitHub Pages" --next "push to GitHub"
```

After structural changes, agents should run:

```bash
agent-memory maintain --since main
```

Structural changes include package manifests, routes, API files, schemas, models, migrations, config, CI workflows, command definitions, and agent instruction files. The command detects Git changes, refreshes `memory/`, and validates the result.

For CI or review checks:

```bash
agent-memory maintain --since main --check
```

## Safety

Agent Memory System records environment variable names, not values. It ignores generated and vendor paths such as `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `.venv/`, `__pycache__/`, and `target/`.

## Examples

Keep `examples/` in the public repository. These fixtures prove the scanner works across a Node app, Python API, and monorepo, and the integration tests depend on them. They are intentionally small so the package stays lightweight.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT
