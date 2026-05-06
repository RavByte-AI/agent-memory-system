# Agent Worklog and Handoff

**Last Updated:** 2026-05-06

---

## Purpose

This project supports continuity across agent switches. If work starts in Antigravity and continues in Codex, Claude, Cursor, or another assistant, the next agent should recover context from `memory/agent-handoff.md` and `memory/agent-worklog.jsonl`.

## Files

- `agent-worklog.jsonl`: machine-readable append-only event stream.
- `agent-handoff.md`: short human-readable handoff summary generated from recent events.

## Commands

```bash
agent-memory worklog start --agent codex --task "implement scanner"
agent-memory worklog checkpoint --agent codex --message "added validator tests" --files src/validators/rules.ts,tests/validators.test.ts
agent-memory worklog handoff --agent codex --message "build passes, next publish GitHub Pages" --next "push repository"
agent-memory worklog show
```

## Agent Rules

- Log decisions, commands, files touched, blockers, and next steps.
- Do not log secrets, tokens, credentials, private keys, or sensitive user data.
- Keep messages concise and useful for the next agent.
