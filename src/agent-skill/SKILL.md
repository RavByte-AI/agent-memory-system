# Agent Memory System

Use this skill when an AI agent needs to understand an unfamiliar repository or refresh a repository's persistent context layer.

## Workflow

1. If `memory/context-index.json` does not exist, run:

   ```bash
   agent-memory init
   ```

2. Read `memory/README.md`.
3. Read `memory/context-index.json`.
4. Open the memory file that matches the task domain.
5. Before editing, verify the memory file against the current source if the area is high risk or recently changed.
6. When making structural changes, update the relevant memory file and `context-index.json` in the same change.

## Safety Rules

- Never store secret values in memory files.
- Treat `[INFERRED]`, `[INCOMPLETE]`, and `[PLANNED]` sections as needing verification.
- Do not edit generated/vendor directories as source.
