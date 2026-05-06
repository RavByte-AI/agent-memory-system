# Agent Memory System

Use this skill when an AI agent needs to understand an unfamiliar repository or refresh a repository's persistent context layer.

## Workflow

1. If `memory/context-index.json` does not exist, run:

   ```bash
   agent-memory init
   ```

2. Read `memory/README.md`.
3. Read `memory/context-index.json`.
4. Read `memory/agent-handoff.md` if it exists.
5. Open the memory file that matches the task domain.
6. Before editing, verify the memory file against the current source if the area is high risk or recently changed.
7. During long work, record checkpoints:

   ```bash
   agent-memory worklog checkpoint --agent <agent-name> --message "<state update>"
   ```

8. When making structural changes, run:

   ```bash
   agent-memory maintain --since main
   ```

9. Before switching agents or stopping mid-task, run:

   ```bash
   agent-memory worklog handoff --agent <agent-name> --message "<current state>" --next "<next action>"
   ```

10. Commit the refreshed memory files and handoff context with the structural change when appropriate.

## Safety Rules

- Never store secret values in memory files.
- Treat `[INFERRED]`, `[INCOMPLETE]`, and `[PLANNED]` sections as needing verification.
- Do not edit generated/vendor directories as source.
