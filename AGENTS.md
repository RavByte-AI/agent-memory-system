# Agent Instructions

Before large changes, read `memory/README.md` and `memory/context-index.json`, then open the relevant memory file for the area you are editing.

If `memory/agent-handoff.md` exists, read it before continuing work from another agent.

After structural changes, run:

```bash
agent-memory maintain --since main
```

Structural changes include package manifests, routes, API files, schemas, models, migrations, config, CI workflows, command definitions, and agent instruction files.

During long work, record checkpoints:

```bash
agent-memory worklog checkpoint --agent codex --message "short state update" --files path/to/file.ts --commands "npm test"
```

Before switching agents or stopping mid-task, record a handoff:

```bash
agent-memory worklog handoff --agent codex --message "current state" --next "next action"
```
