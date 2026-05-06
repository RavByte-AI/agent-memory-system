# AI Agent Guidelines

**Last Updated:** 2026-05-06

---

## Before Starting

1. Read `memory/README.md`.
2. Read `memory/context-index.json`.
3. Open the memory file for the domain you are about to modify.
4. Read `memory/agent-handoff.md` if it exists to recover the previous agent's state.

## Editing Rules

- Prefer repository conventions found in manifests and existing source files.
- Update relevant memory files when adding endpoints, packages, commands, schemas, storage, build steps, or major architecture.
- Record meaningful work with `agent-memory worklog checkpoint --agent <name> --message "<what changed>"`.
- Before switching agents or stopping mid-task, run `agent-memory worklog handoff --agent <name> --message "<current state>" --next "<next action>"`.
- Never edit generated/vendor directories as source: `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `.venv/`, `venv/`, `__pycache__/`, `target/`, `.turbo/`, `.cache/`, `coverage/`, `.pytest_cache/`.
- Never store secret values in code comments, memory files, logs, or examples.

## Current Project

- Repository: `AgentMemorySystem`
- Profile: `mixed`
- Relevant agent files already present: `AGENTS.md`
