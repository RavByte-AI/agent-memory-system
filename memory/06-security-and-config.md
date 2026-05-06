# Security and Config

**Last Updated:** 2026-05-06

---

## Environment Variable Names

- `API_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL`
- `RUNTIME_FLAG`

## Config Files

- `examples/node-app/.env.example`
- `examples/python-api/pyproject.toml`
- `src/analyzers/env.ts`
- `tsconfig.json`

## Secret Handling Rules

- Document environment variable names only, never values.
- Do not paste API keys, tokens, passwords, private keys, or signing secrets into memory files.
- If a secret appears in generated memory, delete it and rotate the credential.
