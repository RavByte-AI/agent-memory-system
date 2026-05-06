# Agent Instructions

Before large changes, read `memory/README.md` and `memory/context-index.json`, then open the relevant memory file for the area you are editing.

After structural changes, run:

```bash
agent-memory maintain --since main
```

Structural changes include package manifests, routes, API files, schemas, models, migrations, config, CI workflows, command definitions, and agent instruction files.
