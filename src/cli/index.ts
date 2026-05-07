#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { appendWorklogEvent, classifyMemoryImpact, generateMemory, getChangedFiles, readWorklogEvents, scanRepository, validateMemory, writeMemoryArtifacts } from "../index.js";
import { logError, logInfo, logSuccess, logWarning, maybePrintLatestNotice, printCliBanner, theme } from "./theme.js";
import { analyzeRepository } from "../graph/builder.js";
import { createSnapshot, writeSnapshot, readSnapshot, diffSnapshots } from "../graph/snapshot.js";
import { summarizeGraph } from "../graph/summarizer.js";
import { queryBlastRadius, queryDependents, queryDependencies, queryFileInfo, queryLayer, queryHighRisk } from "../graph/query.js";
import { buildRepositoryGraphArtifact, buildArchitectureFlowArtifact, buildBreakingChangesArtifact, buildDependencyImpactArtifact, buildCrossRepoLinksArtifact } from "../generator/graph-artifacts.js";

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function addAgentBootstrap(rootDir: string, outputDir: string, dryRun: boolean): Promise<string | undefined> {
  const target = path.join(rootDir, "AGENTS.md");
  if (await exists(target)) {
    return undefined;
  }
  const content = `# Agent Instructions\n\nBefore large changes, read \`${outputDir}/README.md\` and \`${outputDir}/context-index.json\`, then open the relevant memory file for the area you are editing.\n\nIf \`${outputDir}/agent-handoff.md\` exists, read it before continuing work from another agent.\n\nDuring long work, record checkpoints with \`agent-memory worklog checkpoint --agent <name> --message \"<state>\"\`.\n\nBefore switching agents or stopping mid-task, record a handoff with \`agent-memory worklog handoff --agent <name> --message \"<state>\" --next \"<next action>\"\`.\n`;
  if (!dryRun) {
    await fs.writeFile(target, content, "utf8");
  }
  return "AGENTS.md";
}

function printValidation(result: Awaited<ReturnType<typeof validateMemory>>): void {
  if (result.ok) {
    logSuccess("Memory validation passed.");
    return;
  }
  logError("Memory validation failed:");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
}

const program = new Command();

program
  .name("agent-memory")
  .description("Generate an AI-readable project memory layer for any repository.")
  .version("0.2.0");

program
  .command("init")
  .description("Scan the current repository, generate memory files, and validate them.")
  .option("-o, --output <dir>", "output directory", "memory")
  .option("--profile <profile>", "profile to use", "auto")
  .option("--force", "overwrite an existing output directory", false)
  .option("--dry-run", "print planned writes without changing files", false)
  .action(async (options: { output: string; profile: string; force: boolean; dryRun: boolean }) => {
    const rootDir = process.cwd();
    printCliBanner();
    const scan = await scanRepository({ rootDir, profile: options.profile as never });
    const artifacts = await generateMemory(scan, { outputDir: options.output, profile: options.profile as never });

    if (options.dryRun) {
      logInfo(`Would write ${theme.bold(String(artifacts.length))} files to ${theme.path(`${options.output}/`)}`);
      for (const artifact of artifacts) {
        console.log(`  ${theme.path(`${options.output}/${artifact.path}`)}`);
      }
      if (!(await exists(path.join(rootDir, "AGENTS.md")))) {
        console.log(`  ${theme.path("AGENTS.md")}`);
      }
      await maybePrintLatestNotice();
      return;
    }

    await writeMemoryArtifacts(rootDir, options.output, artifacts, options.force);
    const bootstrap = await addAgentBootstrap(rootDir, options.output, false);
    const result = await validateMemory({ rootDir, memoryDir: options.output });

    logSuccess(`Generated ${theme.bold(String(artifacts.length))} memory files in ${theme.path(`${options.output}/`)}.`);
    if (bootstrap) {
      logSuccess(`Added ${theme.path(bootstrap)} bootstrap instructions.`);
    }
    printValidation(result);
    logInfo(`Next: read ${theme.path("memory/README.md")} and ${theme.path("memory/context-index.json")}.`);
    await maybePrintLatestNotice();
  });

program
  .command("scan")
  .description("Scan the current repository and print detected project facts.")
  .option("--json", "print full JSON scan result", false)
  .action(async (options: { json: boolean }) => {
    const scan = await scanRepository({ rootDir: process.cwd() });
    if (options.json) {
      console.log(JSON.stringify(scan, null, 2));
      return;
    }
    printCliBanner();
    console.log(`${theme.bold(scan.repoName)}: ${theme.accent(scan.profile)}`);
    console.log(`Languages: ${scan.languages.join(", ") || theme.muted("none detected")}`);
    console.log(`Frameworks: ${scan.frameworks.join(", ") || theme.muted("none detected")}`);
    console.log(`Manifests: ${theme.bold(String(scan.manifests.length))}`);
    console.log(`Source files: ${theme.bold(String(scan.sourceFiles.length))}`);
    await maybePrintLatestNotice();
  });

program
  .command("validate")
  .description("Validate an existing memory directory.")
  .option("-m, --memory-dir <dir>", "memory directory", "memory")
  .option("--strict", "treat warnings as stricter validation context", false)
  .action(async (options: { memoryDir: string; strict: boolean }) => {
    const result = await validateMemory({ rootDir: process.cwd(), memoryDir: options.memoryDir, strict: options.strict });
    printCliBanner();
    printValidation(result);
    if (!result.ok) {
      process.exitCode = 1;
    }
    await maybePrintLatestNotice();
  });

program
  .command("update")
  .description("Regenerate memory files.")
  .option("--since <ref>", "future diff base", "main")
  .option("-o, --output <dir>", "output directory", "memory")
  .option("--force", "overwrite existing generated files", true)
  .action(async (options: { since: string; output: string; force: boolean }) => {
    const scan = await scanRepository({ rootDir: process.cwd() });
    printCliBanner();
    const artifacts = await generateMemory(scan, { outputDir: options.output });
    await writeMemoryArtifacts(process.cwd(), options.output, artifacts, options.force);
    const changedFiles = await getChangedFiles(process.cwd(), options.since);
    const impact = classifyMemoryImpact(changedFiles);
    logSuccess(`Updated ${theme.path(`${options.output}/`)} using full scan.`);
    if (impact.requiresMemoryUpdate) {
      logInfo(`Structural changes detected since ${theme.bold(options.since)}: ${theme.bold(String(impact.structuralFiles.length))}`);
      logInfo(`Suggested topics: ${impact.suggestedTopics.join(", ") || "general"}`);
    }
    await maybePrintLatestNotice();
  });

program
  .command("maintain")
  .description("Refresh memory after repository changes and report Git impact.")
  .option("--since <ref>", "Git ref used for change detection", "main")
  .option("-o, --output <dir>", "output directory", "memory")
  .option("--check", "check whether structural changes require memory updates without writing", false)
  .option("--dry-run", "show planned memory writes without changing files", false)
  .action(async (options: { since: string; output: string; check: boolean; dryRun: boolean }) => {
    const rootDir = process.cwd();
    printCliBanner();
    const changedFiles = await getChangedFiles(rootDir, options.since);
    const impact = classifyMemoryImpact(changedFiles);

    if (changedFiles.length === 0) {
      logInfo("No Git changes detected.");
    } else {
      logInfo(`Changed files detected: ${theme.bold(String(changedFiles.length))}`);
    }

    if (impact.requiresMemoryUpdate) {
      logWarning(`Memory-impacting structural files: ${theme.bold(String(impact.structuralFiles.length))}`);
      for (const file of impact.structuralFiles.slice(0, 20)) {
        console.log(`  - ${theme.path(file)}`);
      }
      logInfo(`Suggested topics: ${impact.suggestedTopics.join(", ") || "general"}`);
    } else {
      logSuccess("No structural changes requiring memory refresh were detected.");
    }

    if (options.check) {
      const validation = await validateMemory({ rootDir, memoryDir: options.output });
      printValidation(validation);
      const hasMemoryChanges = changedFiles.some((file) => file === options.output || file.startsWith(`${options.output}/`));
      let staleArtifacts: string[] = [];
      if (impact.requiresMemoryUpdate && !hasMemoryChanges) {
        const scan = await scanRepository({ rootDir });
        const artifacts = await generateMemory(scan, { outputDir: options.output });
        for (const artifact of artifacts) {
          const currentPath = path.join(rootDir, options.output, artifact.path);
          let current = "";
          try {
            current = await fs.readFile(currentPath, "utf8");
          } catch {
            staleArtifacts.push(artifact.path);
            continue;
          }
          if (current !== artifact.content) {
            staleArtifacts.push(artifact.path);
          }
        }
      }
      if (staleArtifacts.length > 0) {
        logError(`Structural changes require refreshed ${theme.path(`${options.output}/`)} files: ${staleArtifacts.join(", ")}`);
      }
      await maybePrintLatestNotice();
      if (staleArtifacts.length > 0 || !validation.ok) {
        process.exitCode = 1;
      }
      return;
    }

    const scan = await scanRepository({ rootDir });
    const artifacts = await generateMemory(scan, { outputDir: options.output });

    if (options.dryRun) {
      logInfo(`Would refresh ${theme.bold(String(artifacts.length))} files in ${theme.path(`${options.output}/`)}.`);
      await maybePrintLatestNotice();
      return;
    }

    await writeMemoryArtifacts(rootDir, options.output, artifacts, true);
    const validation = await validateMemory({ rootDir, memoryDir: options.output });
    printValidation(validation);
    logSuccess("Memory maintenance complete.");
    await maybePrintLatestNotice();
  });

program
  .command("doctor")
  .description("Check local environment and memory readiness.")
  .action(async () => {
    const rootDir = process.cwd();
    printCliBanner();
    console.log(`Working directory: ${theme.path(rootDir)}`);
    console.log(`Memory directory: ${(await exists(path.join(rootDir, "memory"))) ? theme.accent("present") : theme.warn("missing")}`);
    console.log(`AGENTS.md: ${(await exists(path.join(rootDir, "AGENTS.md"))) ? theme.accent("present") : theme.warn("missing")}`);
    const scan = await scanRepository({ rootDir });
    console.log(`Detected profile: ${theme.accent(scan.profile)}`);
    console.log(`Manifests: ${theme.bold(String(scan.manifests.length))}`);
    const impact = classifyMemoryImpact(await getChangedFiles(rootDir, "main"));
    console.log(`Memory-impacting changes: ${theme.bold(String(impact.structuralFiles.length))}`);
    await maybePrintLatestNotice();
  });

const worklog = program
  .command("worklog")
  .description("Record and inspect agent execution state for cross-agent handoff.");

function addWorklogOptions(command: Command): Command {
  return command
    .requiredOption("--agent <name>", "agent name, such as codex, claude, antigravity, cursor")
    .option("--task <task>", "task name or goal")
    .requiredOption("--message <message>", "short worklog message")
    .option("--files <paths>", "comma-separated files touched or relevant")
    .option("--commands <commands>", "comma-separated commands run")
    .option("--next <steps>", "comma-separated next steps")
    .option("-m, --memory-dir <dir>", "memory directory", "memory");
}

for (const type of ["start", "log", "checkpoint", "handoff", "finish"] as const) {
  addWorklogOptions(worklog.command(type).description(`Record a ${type} worklog event.`))
    .action(async (options: { agent: string; task?: string; message: string; files?: string; commands?: string; next?: string; memoryDir: string }) => {
      printCliBanner();
      const event = await appendWorklogEvent({
        rootDir: process.cwd(),
        memoryDir: options.memoryDir,
        type,
        agent: options.agent,
        task: options.task,
        message: options.message,
        files: options.files ? [options.files] : [],
        commands: options.commands ? [options.commands] : [],
        nextSteps: options.next ? [options.next] : []
      });
      logSuccess(`Recorded ${theme.accent(event.type)} event ${theme.muted(event.id)}.`);
      if (type === "handoff") {
        logSuccess(`${theme.path(`${options.memoryDir}/agent-handoff.md`)} is ready for the next agent.`);
      }
      await maybePrintLatestNotice();
    });
}

worklog
  .command("show")
  .description("Show recent agent worklog events.")
  .option("-m, --memory-dir <dir>", "memory directory", "memory")
  .option("--json", "print JSON", false)
  .action(async (options: { memoryDir: string; json: boolean }) => {
    const events = await readWorklogEvents(path.resolve(process.cwd(), options.memoryDir));
    const recent = events.slice(-12);
    if (options.json) {
      console.log(JSON.stringify(recent, null, 2));
      return;
    }
    printCliBanner();
    if (recent.length === 0) {
      logInfo("No agent worklog events recorded yet.");
      await maybePrintLatestNotice();
      return;
    }
    for (const event of recent) {
      console.log(`${theme.muted(event.timestamp)} | ${theme.cyan(event.agent)} | ${theme.accent(event.type)}: ${event.message}`);
    }
    await maybePrintLatestNotice();
  });

// ── graph command group ────────────────────────────────────────────────────
const graphCmd = program
  .command("graph")
  .description("Repository relationship graph commands (powered by Codeflow intelligence).");

graphCmd
  .command("build")
  .description("Analyse the repository and write graph memory files.")
  .option("-o, --output <dir>", "memory output directory", "memory")
  .option("--depth <depth>", "analysis depth: shallow | full", "full")
  .option("--max-files <n>", "maximum files to analyse", "1000")
  .option("--no-tests", "exclude test files", false)
  .option("--dry-run", "print planned writes without changing files", false)
  .action(async (options: { output: string; depth: string; maxFiles: string; tests: boolean; dryRun: boolean }) => {
    printCliBanner();
    const rootDir = process.cwd();
    const memDir = path.resolve(rootDir, options.output);

    logInfo(`Analysing repository with depth=${options.depth} …`);

    const graph = await analyzeRepository({
      rootDir,
      depth: options.depth as "shallow" | "full",
      maxFiles: Number(options.maxFiles),
      includeTests: options.tests !== false,
    });

    logInfo(`Analysed ${graph.stats.totalFiles} files, ${graph.stats.totalEdges} edges.`);

    // Determine commit SHA (best-effort)
    let commitSha = "unknown";
    try {
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const exec = promisify(execFile);
      const { stdout } = await exec("git", ["rev-parse", "--short", "HEAD"], { cwd: rootDir });
      commitSha = stdout.trim();
    } catch { /* git not available */ }

    const artifacts = [
      buildRepositoryGraphArtifact(graph, commitSha),
      buildArchitectureFlowArtifact(graph, commitSha),
      buildCrossRepoLinksArtifact(
        graph.repoName,
        `https://github.com/${graph.repoName}`
      ),
    ];

    if (options.dryRun) {
      logInfo("Would write:");
      for (const a of artifacts) console.log(`  ${theme.path(path.join(options.output, a.path))}`);
      return;
    }

    await fs.mkdir(memDir, { recursive: true });
    for (const a of artifacts) {
      await fs.writeFile(path.join(memDir, a.path), a.content, "utf8");
    }

    logSuccess(`Graph written: ${theme.bold(String(artifacts.length))} files in ${theme.path(options.output + "/")}`);
    logSuccess(`Health: ${theme.accent(graph.grade)} (${graph.healthScore}/100) | ${graph.stats.totalFiles} files | ${graph.stats.totalEdges} edges | ${graph.circularDependencies.length} cycles`);
    await maybePrintLatestNotice();
  });

graphCmd
  .command("query")
  .description("Query the graph for a file's dependencies, dependents, and profile.")
  .option("-f, --file <path>", "file path to query")
  .option("-l, --layer <layer>", "list all files in a layer")
  .option("--high-risk", "show the highest-risk files by dependent count", false)
  .option("-o, --output <dir>", "memory output directory", "memory")
  .action(async (options: { file?: string; layer?: string; highRisk: boolean; output: string }) => {
    printCliBanner();
    const rootDir = process.cwd();
    const graphPath = path.join(rootDir, options.output, "repository-graph.json");
    const snapshot = await readSnapshot(graphPath);
    if (!snapshot) {
      logError(`No graph found at ${graphPath}. Run: agent-memory graph build`);
      process.exitCode = 1; return;
    }

    if (options.highRisk) {
      const r = queryHighRisk(snapshot);
      logInfo(r.explanation);
      r.results.forEach((l) => console.log(`  ${l}`));
      return;
    }
    if (options.layer) {
      const r = queryLayer(options.layer, snapshot);
      logInfo(r.explanation);
      r.results.forEach((f) => console.log(`  ${theme.path(f)}`));
      return;
    }
    if (options.file) {
      const info = queryFileInfo(options.file, snapshot);
      const deps = queryDependencies(options.file, snapshot);
      const dep_on = queryDependents(options.file, snapshot);
      logInfo(`File: ${theme.path(info.file ?? options.file)}`);
      info.results.forEach((l) => console.log(`  ${l}`));
      console.log(`  imports: ${deps.results.map((f) => theme.path(f)).join(", ") || "none"}`);
      console.log(`  importedBy: ${dep_on.results.map((f) => theme.path(f)).join(", ") || "none"}`);
      return;
    }
    logError("Provide --file, --layer, or --high-risk");
  });

graphCmd
  .command("blast-radius")
  .description("Show all files that would break if the given file changes.")
  .requiredOption("-f, --file <path>", "file path to analyse")
  .option("-o, --output <dir>", "memory output directory", "memory")
  .action(async (options: { file: string; output: string }) => {
    printCliBanner();
    const rootDir = process.cwd();
    const snapshot = await readSnapshot(path.join(rootDir, options.output, "repository-graph.json"));
    if (!snapshot) { logError("No graph found. Run: agent-memory graph build"); process.exitCode = 1; return; }
    const result = queryBlastRadius(options.file, snapshot);
    logInfo(result.explanation);
    result.results.forEach((f) => console.log(`  ${theme.path(f)}`));
    await maybePrintLatestNotice();
  });

graphCmd
  .command("diff")
  .description("Compare current graph snapshot against a previous one and write breaking-changes.json.")
  .option("-o, --output <dir>", "memory output directory", "memory")
  .option("--base <path>", "path to the previous snapshot JSON to compare against")
  .action(async (options: { output: string; base?: string }) => {
    printCliBanner();
    const rootDir = process.cwd();
    const memDir = path.resolve(rootDir, options.output);
    const currentPath = path.join(memDir, "repository-graph.json");
    const current = await readSnapshot(currentPath);
    if (!current) { logError("No current graph. Run: agent-memory graph build first."); process.exitCode = 1; return; }

    const basePath = options.base ?? path.join(memDir, ".repository-graph.prev.json");
    const prev = await readSnapshot(basePath);
    if (!prev) { logWarning("No previous snapshot found — storing current as baseline."); await writeSnapshot(current, basePath); return; }

    const changeSet = diffSnapshots(prev, current);
    const bcArtifact = buildBreakingChangesArtifact(changeSet);
    await fs.writeFile(path.join(memDir, bcArtifact.path), bcArtifact.content, "utf8");

    if (changeSet.breakingChanges.length > 0) {
      const impactArtifact = buildDependencyImpactArtifact(changeSet);
      await fs.writeFile(path.join(memDir, impactArtifact.path), impactArtifact.content, "utf8");
      logWarning(`${changeSet.breakingChanges.length} breaking change(s) detected — see ${theme.path(options.output + "/breaking-changes.json")}`);
    } else {
      logSuccess("No breaking changes detected. ✅");
    }

    // Store current as new baseline
    await writeSnapshot(current, basePath);
    await maybePrintLatestNotice();
  });

graphCmd
  .command("summary")
  .description("Print a token-efficient agent summary of the repository graph.")
  .option("-o, --output <dir>", "memory output directory", "memory")
  .option("--json", "print raw JSON", false)
  .action(async (options: { output: string; json: boolean }) => {
    printCliBanner();
    const rootDir = process.cwd();
    const snapshot = await readSnapshot(path.join(rootDir, options.output, "repository-graph.json"));
    if (!snapshot) { logError("No graph found. Run: agent-memory graph build"); process.exitCode = 1; return; }
    const summary = summarizeGraph(snapshot);
    if (options.json) { console.log(JSON.stringify(summary, null, 2)); return; }
    logInfo(`${snapshot.repoName} | Grade: ${theme.accent(summary.grade)} (${summary.healthScore}/100) | ~${summary.estimatedTokens} tokens`);
    console.log(`\nEntry points:`);
    summary.entryPoints.forEach((f) => console.log(`  ${theme.path(f)}`));
    console.log(`\nHigh-risk files:`);
    summary.highRiskFiles.forEach((f) => console.log(`  ${theme.path(f.path)} (${f.dependents} dependents)`));
    if (summary.circularDeps.length) {
      logWarning(`Circular dependencies: ${summary.circularDeps.length}`);
    }
    await maybePrintLatestNotice();
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
