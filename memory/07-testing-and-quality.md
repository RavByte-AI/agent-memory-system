# Testing and Quality

**Last Updated:** 2026-05-06

---

## Validation Commands

- `npm test (examples/monorepo/package.json)`
- `npm test (examples/monorepo/packages/api/package.json)`
- `npm test (examples/monorepo/packages/web/package.json)`
- `npm test (examples/node-app/package.json)`
- `npm test (package.json)`
- `pytest (examples/python-api/pyproject.toml)`
- `pytest (examples/python-api/requirements.txt)`

## Build Commands

- `npm run build (examples/monorepo/package.json)`
- `npm run build (examples/monorepo/packages/api/package.json)`
- `npm run build (examples/monorepo/packages/web/package.json)`
- `npm run build (examples/node-app/package.json)`
- `npm run build (package.json)`

## Quality Gates

- Run the relevant tests before changing behavior.
- Update memory files in the same change as structural code changes.
- Do not validate generated directories as source ownership.
