# Benchmark Specification

## Goal

Evaluate whether repository-local memory changes AI coding agent workflows compared with cold-start repository exploration.

The benchmark must report specific effects under specific conditions: repository, task, agent/tool, model, prompt budget, allowed tools, run date, and scoring rubric. It should not make universal claims from one repository or one model.

## Modes

| Mode | Description |
| --- | --- |
| `baseline` | Agent starts with repository files only. No generated AMS memory, graph artifacts, worklog, or handoff files are provided as starting context. |
| `ams` | Agent starts with generated `memory/` files, `context-index.json`, graph artifacts when available, worklog, and handoff guidance. |
| `both` | Runs baseline and AMS modes with the same task and repository fixture. |

## Scenario Categories

### Repository Understanding

The agent identifies project purpose, entry points, API routes, test commands, configuration files, and environment variable names.

Primary metrics:

- time to first relevant file
- precision@k and recall@k over gold files
- false path count
- final answer correctness

### Interface Change

The agent changes a shared type, export, or function signature and updates downstream usage.

Primary metrics:

- downstream file recall
- missed importers
- unnecessary edits
- validation command result

### Debugging

The agent diagnoses and fixes a seeded failing test.

Primary metrics:

- time to root-cause file
- commands run
- fix correctness
- unrelated behavior changes

### Recovery

Session A stops after investigation or partial implementation. Session B resumes from the available state.

Primary metrics:

- duplicated file reads
- duplicated search commands
- stale assumptions
- time to useful next action
- completion rate

### Multi-Agent Continuity

Agent A implements, Agent B reviews, and Agent C fixes tests or follow-up issues.

Primary metrics:

- review quality
- duplicate implementation
- conflicting changes
- final test state

### Safety

The benchmark verifies that generated memory records configuration shape without copying secret values.

Primary metrics:

- environment variable name recall
- secret value leakage count
- validation warning correctness

## Repository Fixture Metadata

Each fixture should declare:

```json
{
  "id": "node-api",
  "path": "fixtures/repos/node-api",
  "languages": ["TypeScript"],
  "testCommand": "npm test",
  "buildCommand": "npm run build",
  "sourceFiles": 42,
  "notes": "Express routes plus shared types"
}
```

## Task Dataset Format

```json
{
  "id": "understanding.api-routes.001",
  "category": "understanding",
  "repo": "node-api",
  "prompt": "Identify API routes, route files, and test command.",
  "successCriteria": [
    "Mentions src/routes.ts",
    "Mentions npm test",
    "Does not mention nonexistent route files"
  ],
  "goldFiles": [
    "src/routes.ts",
    "package.json",
    "tests/routes.test.ts"
  ],
  "allowedCommands": ["rg", "git", "npm test", "agent-memory"],
  "validationCommand": "npm test",
  "riskLevel": "low"
}
```

## Run Metadata

Every run should record:

- run id
- run date
- repository fixture id
- repository commit SHA
- AMS package version
- benchmark harness version
- OS and shell
- agent/tool name and version
- model name and date, where applicable
- task id
- mode
- prompt
- allowed commands
- validation command
- raw or redacted logs path
- scoring rubric version

## First Reproducibility Milestone

The first stable benchmark milestone should include:

- 3 fixture repositories
- 12 tasks total
- baseline and AMS modes
- raw JSONL logs
- retrieval scoring against gold files
- continuity scoring for handoff tasks
- markdown report with failures and limitations
