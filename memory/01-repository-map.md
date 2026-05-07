# Repository Map

**Last Updated:** 2026-05-07

---

## Manifests

| Path                                          | Type       | Name                         | Dependencies                                                              |
| --------------------------------------------- | ---------- | ---------------------------- | ------------------------------------------------------------------------- |
| `examples/monorepo/package.json`              | node       | example-monorepo             |                                                                           |
| `examples/monorepo/packages/api/package.json` | node       | @example/api                 | express                                                                   |
| `examples/monorepo/packages/web/package.json` | node       | @example/web                 | next, react                                                               |
| `examples/node-app/package.json`              | node       | example-node-app             | next, react, typescript, vitest                                           |
| `examples/python-api/pyproject.toml`          | python     | example-python-api           |                                                                           |
| `examples/python-api/requirements.txt`        | python     |                              | fastapi, pytest                                                           |
| `package.json`                                | node       | @ravbyte/agent-memory-system | commander, fast-glob, zod, @types/node, fast-check, tsup, tsx, typescript |
| `tsconfig.json`                               | typescript |                              |                                                                           |

## Source Files

- `benchmarks/harness/metrics.ts`
- `benchmarks/harness/reporter.ts`
- `benchmarks/harness/runner.ts`
- `benchmarks/harness/tasks.ts`
- `benchmarks/harness/types.ts`
- `benchmarks/scripts/report.ts`
- `benchmarks/scripts/run.ts`
- `examples/monorepo/packages/api/src/routes.ts`
- `examples/node-app/app/api/health/route.ts`
- `examples/node-app/app/page.tsx`
- `examples/python-api/app/main.py`
- `src/agent-log/store.ts`
- `src/analyzers/env.ts`
- `src/analyzers/manifest.ts`
- `src/cli/index.ts`
- `src/cli/theme.ts`
- `src/constants.ts`
- `src/generator/context-index.ts`
- `src/generator/generate.ts`
- `src/generator/graph-artifacts.ts`
- `src/generator/write.ts`
- `src/graph/blast-radius.ts`
- `src/graph/builder.ts`
- `src/graph/health.ts`
- `src/graph/index.ts`
- `src/graph/layers.ts`
- `src/graph/parser.ts`
- `src/graph/patterns.ts`
- `src/graph/query.ts`
- `src/graph/snapshot.ts`
- `src/graph/summarizer.ts`
- `src/graph/types.ts`
- `src/index.ts`
- `src/maintenance/git.ts`
- `src/scanner/path-utils.ts`
- `src/scanner/scan.ts`
- `src/templates/format.ts`
- `src/types.ts`
- `src/validators/rules.ts`
- `src/validators/validate.ts`
- `tests/generator.test.ts`
- `tests/graph.test.ts`
- `tests/integration.test.ts`
- `tests/maintenance.test.ts`
- `tests/scanner.test.ts`
- `tests/validators.test.ts`
- `tests/worklog.test.ts`
- `vitest.config.ts`

## Route Files

- `examples/monorepo/packages/api/package.json`
- `examples/monorepo/packages/api/src/routes.ts`
- `examples/node-app/app/api/health/route.ts`
- `examples/node-app/app/page.tsx`
- `examples/python-api/app/main.py`

## API Files

- `examples/monorepo/packages/api/package.json`
- `examples/monorepo/packages/api/src/routes.ts`
- `examples/node-app/app/api/health/route.ts`

## Config Files

- `benchmarks/config/agents.json`
- `benchmarks/config/repositories.json`
- `examples/node-app/.env.example`
- `examples/python-api/pyproject.toml`
- `src/analyzers/env.ts`
- `tsconfig.json`

## Documentation and Agent Files

- `README.md`
- `benchmarks/README.md`
- `examples/node-app/README.md`
- `examples/python-api/README.md`
- `memory/README.md`
- `AGENTS.md`

## Generated or Vendor Directories

Do not edit generated or vendor output as source:

- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- `.next/`
- `.venv/`
- `venv/`
- `__pycache__/`
- `target/`
- `.turbo/`
- `.cache/`
- `coverage/`
- `.pytest_cache/`
