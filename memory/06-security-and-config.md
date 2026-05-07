# Security and Config

**Last Updated:** 2026-05-07

---

## Environment Variable Names

- `AGENT_MEMORY_SKIP_UPDATE_CHECK`
- `API_KEY`
- `DATABASE_URL`
- `FORCE_COLOR`
- `NEXT_PUBLIC_API_URL`
- `NO_COLOR`
- `RUNTIME_FLAG`

## Config Files

- `benchmarks/config/agents.json`
- `benchmarks/config/repositories.json`
- `examples/node-app/.env.example`
- `examples/python-api/pyproject.toml`
- `src/analyzers/env.ts`
- `tsconfig.json`

## Secret Handling Rules

- Document environment variable names only, never values.
- Do not paste API keys, tokens, passwords, private keys, or signing secrets into memory files.
- If a secret appears in generated memory, delete it and rotate the credential.
