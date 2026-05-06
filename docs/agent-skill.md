# Agent Skill Wrapper

This repository includes a portable skill file at `src/agent-skill/SKILL.md`.

Agents can use it to standardize project onboarding:

1. Run `agent-memory init` before large repo work when no memory directory exists.
2. Read `memory/README.md`.
3. Read `memory/context-index.json`.
4. Open the memory file for the domain being changed.
5. Update relevant memory files when structural changes are made.

## Automatic Maintenance

After changing structural files, agents should run:

```bash
agent-memory maintain --since main
```

For review-only contexts, use:

```bash
agent-memory maintain --since main --check
```

The command detects Git changes, identifies memory-impacting files, refreshes `memory/`, and validates the result.

The skill intentionally delegates scanning and generation to the CLI so the same behavior works across Codex, Kiro, Claude, Cursor, humans, and CI.
