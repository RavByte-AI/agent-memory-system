# Agent Instructions

Before large changes, read `memory/README.md` and `memory/context-index.json`, then open the relevant memory file for the area you are editing.

If `memory/agent-handoff.md` exists, read it before continuing work from another agent.

After structural changes, run:

```bash
agent-memory maintain --since main
```

Structural changes include package manifests, routes, API files, schemas, models, migrations, config, CI workflows, command definitions, and agent instruction files.

## 🧠 Graph Intelligence
Before modifying interfaces, types, or shared utilities, check the blast radius to avoid breaking downstream files:

```bash
agent-memory graph query --file src/path/to/file.ts
```

If you rename an export or change a signature, verify breaking changes:
```bash
agent-memory graph diff
```
During long work, record checkpoints:

```bash
agent-memory worklog checkpoint --agent codex --message "short state update" --files path/to/file.ts --commands "npm test"
```

Before switching agents or stopping mid-task, record a handoff:

```bash
agent-memory worklog handoff --agent codex --message "current state" --next "next action"
```
