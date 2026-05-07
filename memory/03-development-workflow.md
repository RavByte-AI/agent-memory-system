# Development Workflow

**Last Updated:** 2026-05-07

---

## Build Commands

- `npm run build (examples/monorepo/package.json)`
- `npm run build (examples/monorepo/packages/api/package.json)`
- `npm run build (examples/monorepo/packages/web/package.json)`
- `npm run build (examples/node-app/package.json)`
- `npm run build (package.json)`

## Test Commands

- `npm test (examples/monorepo/package.json)`
- `npm test (examples/monorepo/packages/api/package.json)`
- `npm test (examples/monorepo/packages/web/package.json)`
- `npm test (examples/node-app/package.json)`
- `npm test (package.json)`
- `pytest (examples/python-api/pyproject.toml)`
- `pytest (examples/python-api/requirements.txt)`

## Setup Notes

- Read the repository README files before changing setup scripts.
- Prefer package-manager commands declared in manifests over ad hoc commands.

## README Files

- `README.md`
- `benchmarks/README.md`
- `examples/node-app/README.md`
- `examples/python-api/README.md`
- `memory/README.md`
