import { GENERATED_DIRS } from "../constants.js";
import type { GenerateOptions, MemoryArtifact, ProjectScan } from "../types.js";
import { createContextIndex } from "./context-index.js";
import { header, list, projectFacts, table } from "../templates/format.js";

function manifestRows(scan: ProjectScan): string[][] {
  return scan.manifests.map((manifest) => [
    `\`${manifest.path}\``,
    manifest.type,
    manifest.name ?? "",
    manifest.dependencies?.slice(0, 8).join(", ") ?? ""
  ]);
}

function ownership(scan: ProjectScan): string {
  const rootManifest = scan.manifests.find((manifest) => manifest.path === "package.json") ?? scan.manifests[0];
  const owner = rootManifest?.owner;

  if (owner) {
    return [
      owner.founder ? `- Founder: ${owner.founder}` : undefined,
      owner.company ? `- Company: ${owner.company}` : undefined,
      owner.website ? `- Website: ${owner.website}` : undefined,
      owner.email ? `- Email: ${owner.email}` : undefined,
      owner.x ? `- Founder X: ${owner.x}` : undefined,
      owner.linkedin ? `- Founder LinkedIn: ${owner.linkedin}` : undefined
    ].filter(Boolean).join("\n");
  }

  const lines = [
    rootManifest?.author ? `- Owner: ${rootManifest.author}` : "- Owner: [INCOMPLETE] Add maintainers or team ownership.",
    rootManifest?.homepage ? `- Website: ${rootManifest.homepage}` : undefined,
    "- Memory maintainer: [INCOMPLETE] Add who keeps this directory current."
  ];

  return lines.filter(Boolean).join("\n");
}

function artifact(path: string, content: string): MemoryArtifact {
  return { path, content: `${content.trimEnd()}\n` };
}

function overview(scan: ProjectScan): MemoryArtifact {
  return artifact(
    "00-project-overview.md",
    `${header("Project Overview")}
## Purpose

\`${scan.repoName}\` was scanned by Agent Memory System to create a persistent context layer for AI agents and human contributors.

## Detected Project Shape

${projectFacts(scan)}

## Quick Start

${scan.buildCommands.length > 0 ? list(scan.buildCommands) : "- [INFERRED] No build command was detected."}
${scan.testCommands.length > 0 ? "\n\n## Validation Commands\n\n" + list(scan.testCommands) : ""}

## Ownership

${ownership(scan)}`
  );
}

function repositoryMap(scan: ProjectScan): MemoryArtifact {
  return artifact(
    "01-repository-map.md",
    `${header("Repository Map")}
## Manifests

${manifestRows(scan).length ? table(manifestRows(scan), ["Path", "Type", "Name", "Dependencies"]) : "- [INFERRED] No manifests were detected."}

## Source Files

${list(scan.sourceFiles.slice(0, 80))}

## Route Files

${list(scan.routeFiles.slice(0, 80))}

## API Files

${list(scan.apiFiles.slice(0, 80))}

## Config Files

${list(scan.configFiles.slice(0, 80))}

## Documentation and Agent Files

${list([...scan.readmes, ...scan.agentFiles])}

## Generated or Vendor Directories

Do not edit generated or vendor output as source:

${list(GENERATED_DIRS.map((dir) => `${dir}/`))}`
  );
}

function architecture(scan: ProjectScan): MemoryArtifact {
  return artifact(
    "02-system-architecture.md",
    `${header("System Architecture")}
## Architecture Summary

This is an inferred architecture document. Treat sections marked \`[INFERRED]\`, \`[PLANNED]\`, or \`[INCOMPLETE]\` as prompts for verification before making architectural changes.

## Runtime Shape

- Project profile: \`${scan.profile}\`
- Detected profiles: ${scan.detectedProfiles.map((profile) => `\`${profile}\``).join(", ")}
- Frameworks: ${scan.frameworks.join(", ") || "[INFERRED] No framework detected"}

## Mermaid Sketch

\`\`\`mermaid
flowchart LR
    Contributor["Human or AI contributor"] --> Repo["${scan.repoName}"]
    Repo --> Source["Source files"]
    Repo --> Config["Configuration"]
    Repo --> Tests["Validation commands"]
    Repo --> Memory["/memory context layer"]
\`\`\`

## Deployment Hints

${list(scan.deploymentHints, "[INFERRED] No deployment files were detected.")}

## Open Architecture Questions

- [INCOMPLETE] Confirm service boundaries and runtime communication paths with maintainers.
- [INCOMPLETE] Add diagrams for deployed infrastructure once verified.`
  );
}

function workflow(scan: ProjectScan): MemoryArtifact {
  return artifact(
    "03-development-workflow.md",
    `${header("Development Workflow")}
## Build Commands

${scan.buildCommands.length ? list(scan.buildCommands) : "- [INFERRED] No build command was detected."}

## Test Commands

${scan.testCommands.length ? list(scan.testCommands) : "- [INFERRED] No test command was detected."}

## Setup Notes

- Read the repository README files before changing setup scripts.
- Prefer package-manager commands declared in manifests over ad hoc commands.

## README Files

${list(scan.readmes)}`
  );
}

function apiInterfaces(scan: ProjectScan): MemoryArtifact {
  return artifact(
    "04-api-and-interfaces.md",
    `${header("API and Interfaces")}
## API Files

${list(scan.apiFiles)}

## Route Files

${list(scan.routeFiles)}

## Interface Sources

${list(scan.sourceFiles.filter((file) => /(types|schemas|interfaces|contracts|api-client)/i.test(file)).slice(0, 80))}

## Notes

- [INFERRED] Treat detected route and API files as likely contract surfaces.
- [INCOMPLETE] Add endpoint tables after verifying runtime route registration.`
  );
}

function dataStorage(scan: ProjectScan): MemoryArtifact {
  return artifact(
    "05-data-and-storage.md",
    `${header("Data and Storage")}
## Storage Hints

${list(scan.databaseHints, "[INFERRED] No database or migration hints were detected.")}

## Config Files That May Affect Storage

${list(scan.configFiles.filter((file) => /database|db|prisma|typeorm|alembic|sequelize|migration|config|env/i.test(file)))}

## Notes

- [INCOMPLETE] Document tables, collections, migrations, and persistence ownership after verification.
- Never include live database credentials in memory files.`
  );
}

function securityConfig(scan: ProjectScan): MemoryArtifact {
  return artifact(
    "06-security-and-config.md",
    `${header("Security and Config")}
## Environment Variable Names

${scan.envVars.length ? list(scan.envVars.map((name) => `${name}`)) : "- [INFERRED] No environment variable names were detected."}

## Config Files

${list(scan.configFiles)}

## Secret Handling Rules

- Document environment variable names only, never values.
- Do not paste API keys, tokens, passwords, private keys, or signing secrets into memory files.
- If a secret appears in generated memory, delete it and rotate the credential.`
  );
}

function testingQuality(scan: ProjectScan): MemoryArtifact {
  return artifact(
    "07-testing-and-quality.md",
    `${header("Testing and Quality")}
## Validation Commands

${scan.testCommands.length ? list(scan.testCommands) : "- [INFERRED] No test command was detected."}

## Build Commands

${scan.buildCommands.length ? list(scan.buildCommands) : "- [INFERRED] No build command was detected."}

## Quality Gates

- Run the relevant tests before changing behavior.
- Update memory files in the same change as structural code changes.
- Do not validate generated directories as source ownership.`
  );
}

function knownIssues(scan: ProjectScan): MemoryArtifact {
  const unreadable = scan.unreadableFiles.map((file) => [`\`${file.path}\``, file.reason]);
  const risks = scan.riskNotes.map((note) => [note, "[INFERRED] Scanner marker"]);
  return artifact(
    "08-known-issues-and-tech-debt.md",
    `${header("Known Issues and Technical Debt")}
## Scanner-Discovered Risks

${risks.length ? table(risks, ["Finding", "Reason"]) : "- No TODO, FIXME, stub, placeholder, or not-implemented markers were found in scanned text files."}

## Unreadable Files

${unreadable.length ? table(unreadable, ["Path", "Reason"]) : "- No unreadable files were encountered."}

## Maintenance Notes

- [INCOMPLETE] Human maintainers should add known architectural or product debt here.
- [PLANNED] Future versions may compare memory freshness against Git diffs.`
  );
}

function agentGuidelines(scan: ProjectScan): MemoryArtifact {
  return artifact(
    "09-agent-guidelines.md",
    `${header("AI Agent Guidelines")}
## Before Starting

1. Read \`memory/README.md\`.
2. Read \`memory/context-index.json\`.
3. Open the memory file for the domain you are about to modify.
4. Read \`memory/agent-handoff.md\` if it exists to recover the previous agent's state.

## Editing Rules

- Prefer repository conventions found in manifests and existing source files.
- Update relevant memory files when adding endpoints, packages, commands, schemas, storage, build steps, or major architecture.
- Record meaningful work with \`agent-memory worklog checkpoint --agent <name> --message "<what changed>"\`.
- Before switching agents or stopping mid-task, run \`agent-memory worklog handoff --agent <name> --message "<current state>" --next "<next action>"\`.
- Never edit generated/vendor directories as source: ${GENERATED_DIRS.map((dir) => `\`${dir}/\``).join(", ")}.
- Never store secret values in code comments, memory files, logs, or examples.

## Current Project

- Repository: \`${scan.repoName}\`
- Profile: \`${scan.profile}\`
- Relevant agent files already present: ${scan.agentFiles.length ? scan.agentFiles.map((file) => `\`${file}\``).join(", ") : "[INFERRED] none detected"}`
  );
}

function agentWorklog(): MemoryArtifact {
  return artifact(
    "10-agent-worklog.md",
    `${header("Agent Worklog and Handoff")}
## Purpose

This project supports continuity across agent switches. If work starts in Antigravity and continues in Codex, Claude, Cursor, or another assistant, the next agent should recover context from \`memory/agent-handoff.md\` and \`memory/agent-worklog.jsonl\`.

## Files

- \`agent-worklog.jsonl\`: machine-readable append-only event stream.
- \`agent-handoff.md\`: short human-readable handoff summary generated from recent events.

## Commands

\`\`\`bash
agent-memory worklog start --agent codex --task "implement scanner"
agent-memory worklog checkpoint --agent codex --message "added validator tests" --files src/validators/rules.ts,tests/validators.test.ts
agent-memory worklog handoff --agent codex --message "build passes, next publish GitHub Pages" --next "push repository"
agent-memory worklog show
\`\`\`

## Agent Rules

- Log decisions, commands, files touched, blockers, and next steps.
- Do not log secrets, tokens, credentials, private keys, or sensitive user data.
- Keep messages concise and useful for the next agent.`
  );
}

function readme(): MemoryArtifact {
  return artifact(
    "README.md",
    `${header("Memory System README")}
## Purpose

This directory is a persistent context layer for AI agents and human contributors. It captures verified repository structure, likely workflows, and safety rules so future work starts from shared context.

## File Index

${table(
  [
    ["00-project-overview.md", "Project purpose and high-level facts."],
    ["01-repository-map.md", "Manifests, source files, routes, APIs, configs, docs, and generated directories."],
    ["02-system-architecture.md", "Inferred architecture and deployment hints."],
    ["03-development-workflow.md", "Detected build, test, and setup workflow."],
    ["04-api-and-interfaces.md", "Detected API, route, and interface contract files."],
    ["05-data-and-storage.md", "Database, migration, and persistence hints."],
    ["06-security-and-config.md", "Environment variable names and secret-handling rules."],
    ["07-testing-and-quality.md", "Validation commands and quality gates."],
    ["08-known-issues-and-tech-debt.md", "Scanner-discovered risks and known debt."],
    ["09-agent-guidelines.md", "Agent instructions for using this memory layer."],
    ["10-agent-worklog.md", "Agent execution log and handoff workflow."],
    ["context-index.json", "Machine-readable topic index."]
  ],
  ["File", "Description"]
)}

## Staleness Policy

When a structural change adds or changes packages, endpoints, commands, schemas, storage, build steps, or security boundaries, run \`agent-memory maintain --since main\` and commit the refreshed memory files.

## Agent Handoff Policy

Agents should record checkpoints during long tasks and create a handoff before switching tools or stopping mid-task. The next agent should read \`agent-handoff.md\` before continuing.

## Do Not Edit as Source

Generated and vendor directories such as \`node_modules/\`, \`dist/\`, \`build/\`, \`.next/\`, \`.venv/\`, \`__pycache__/\`, and \`target/\` should not be treated as source ownership.`
  );
}

export async function generateMemory(scan: ProjectScan, _options: GenerateOptions = {}): Promise<MemoryArtifact[]> {
  const artifacts = [
    overview(scan),
    repositoryMap(scan),
    architecture(scan),
    workflow(scan),
    apiInterfaces(scan),
    dataStorage(scan),
    securityConfig(scan),
    testingQuality(scan),
    knownIssues(scan),
    agentGuidelines(scan),
    agentWorklog(),
    readme()
  ];

  artifacts.push(
    artifact("context-index.json", JSON.stringify(createContextIndex(), null, 2))
  );

  return artifacts;
}
