# Memory System README

**Last Updated:** 2026-05-06

---

## Purpose

This directory is a persistent context layer for AI agents and human contributors. It captures verified repository structure, likely workflows, and safety rules so future work starts from shared context.

## File Index

| File                             | Description                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------- |
| 00-project-overview.md           | Project purpose and high-level facts.                                            |
| 01-repository-map.md             | Manifests, source files, routes, APIs, configs, docs, and generated directories. |
| 02-system-architecture.md        | Inferred architecture and deployment hints.                                      |
| 03-development-workflow.md       | Detected build, test, and setup workflow.                                        |
| 04-api-and-interfaces.md         | Detected API, route, and interface contract files.                               |
| 05-data-and-storage.md           | Database, migration, and persistence hints.                                      |
| 06-security-and-config.md        | Environment variable names and secret-handling rules.                            |
| 07-testing-and-quality.md        | Validation commands and quality gates.                                           |
| 08-known-issues-and-tech-debt.md | Scanner-discovered risks and known debt.                                         |
| 09-agent-guidelines.md           | Agent instructions for using this memory layer.                                  |
| context-index.json               | Machine-readable topic index.                                                    |

## Staleness Policy

When a structural change adds or changes packages, endpoints, commands, schemas, storage, build steps, or security boundaries, update the relevant memory file in the same pull request.

## Do Not Edit as Source

Generated and vendor directories such as `node_modules/`, `dist/`, `build/`, `.next/`, `.venv/`, `__pycache__/`, and `target/` should not be treated as source ownership.
