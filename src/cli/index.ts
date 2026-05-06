#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { classifyMemoryImpact, generateMemory, getChangedFiles, scanRepository, validateMemory, writeMemoryArtifacts } from "../index.js";

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
  const content = `# Agent Instructions\n\nBefore large changes, read \`${outputDir}/README.md\` and \`${outputDir}/context-index.json\`, then open the relevant memory file for the area you are editing.\n`;
  if (!dryRun) {
    await fs.writeFile(target, content, "utf8");
  }
  return "AGENTS.md";
}

function printValidation(result: Awaited<ReturnType<typeof validateMemory>>): void {
  if (result.ok) {
    console.log("Memory validation passed.");
    return;
  }
  console.error("Memory validation failed:");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
}

const program = new Command();

program
  .name("agent-memory")
  .description("Generate an AI-readable project memory layer for any repository.")
  .version("0.1.0");

program
  .command("init")
  .description("Scan the current repository, generate memory files, and validate them.")
  .option("-o, --output <dir>", "output directory", "memory")
  .option("--profile <profile>", "profile to use", "auto")
  .option("--force", "overwrite an existing output directory", false)
  .option("--dry-run", "print planned writes without changing files", false)
  .action(async (options: { output: string; profile: string; force: boolean; dryRun: boolean }) => {
    const rootDir = process.cwd();
    const scan = await scanRepository({ rootDir, profile: options.profile as never });
    const artifacts = await generateMemory(scan, { outputDir: options.output, profile: options.profile as never });

    if (options.dryRun) {
      console.log(`Would write ${artifacts.length} files to ${options.output}/`);
      for (const artifact of artifacts) {
        console.log(`- ${options.output}/${artifact.path}`);
      }
      if (!(await exists(path.join(rootDir, "AGENTS.md")))) {
        console.log("- AGENTS.md");
      }
      return;
    }

    await writeMemoryArtifacts(rootDir, options.output, artifacts, options.force);
    const bootstrap = await addAgentBootstrap(rootDir, options.output, false);
    const result = await validateMemory({ rootDir, memoryDir: options.output });

    console.log(`Generated ${artifacts.length} memory files in ${options.output}/.`);
    if (bootstrap) {
      console.log(`Added ${bootstrap} bootstrap instructions.`);
    }
    printValidation(result);
    console.log("Next: read memory/README.md and memory/context-index.json.");
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
    console.log(`${scan.repoName}: ${scan.profile}`);
    console.log(`Languages: ${scan.languages.join(", ") || "none detected"}`);
    console.log(`Frameworks: ${scan.frameworks.join(", ") || "none detected"}`);
    console.log(`Manifests: ${scan.manifests.length}`);
    console.log(`Source files: ${scan.sourceFiles.length}`);
  });

program
  .command("validate")
  .description("Validate an existing memory directory.")
  .option("-m, --memory-dir <dir>", "memory directory", "memory")
  .option("--strict", "treat warnings as stricter validation context", false)
  .action(async (options: { memoryDir: string; strict: boolean }) => {
    const result = await validateMemory({ rootDir: process.cwd(), memoryDir: options.memoryDir, strict: options.strict });
    printValidation(result);
    if (!result.ok) {
      process.exitCode = 1;
    }
  });

program
  .command("update")
  .description("Regenerate memory files.")
  .option("--since <ref>", "future diff base", "main")
  .option("-o, --output <dir>", "output directory", "memory")
  .option("--force", "overwrite existing generated files", true)
  .action(async (options: { since: string; output: string; force: boolean }) => {
    const scan = await scanRepository({ rootDir: process.cwd() });
    const artifacts = await generateMemory(scan, { outputDir: options.output });
    await writeMemoryArtifacts(process.cwd(), options.output, artifacts, options.force);
    const changedFiles = await getChangedFiles(process.cwd(), options.since);
    const impact = classifyMemoryImpact(changedFiles);
    console.log(`Updated ${options.output}/ using full scan.`);
    if (impact.requiresMemoryUpdate) {
      console.log(`Structural changes detected since ${options.since}: ${impact.structuralFiles.length}`);
      console.log(`Suggested topics: ${impact.suggestedTopics.join(", ") || "general"}`);
    }
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
    const changedFiles = await getChangedFiles(rootDir, options.since);
    const impact = classifyMemoryImpact(changedFiles);

    if (changedFiles.length === 0) {
      console.log("No Git changes detected.");
    } else {
      console.log(`Changed files detected: ${changedFiles.length}`);
    }

    if (impact.requiresMemoryUpdate) {
      console.log(`Memory-impacting structural files: ${impact.structuralFiles.length}`);
      for (const file of impact.structuralFiles.slice(0, 20)) {
        console.log(`- ${file}`);
      }
      console.log(`Suggested topics: ${impact.suggestedTopics.join(", ") || "general"}`);
    } else {
      console.log("No structural changes requiring memory refresh were detected.");
    }

    if (options.check) {
      const validation = await validateMemory({ rootDir, memoryDir: options.output });
      printValidation(validation);
      const hasMemoryChanges = changedFiles.some((file) => file === options.output || file.startsWith(`${options.output}/`));
      if (impact.requiresMemoryUpdate && !hasMemoryChanges) {
        console.error(`Structural changes require refreshed ${options.output}/ files.`);
      }
      if ((impact.requiresMemoryUpdate && !hasMemoryChanges) || !validation.ok) {
        process.exitCode = 1;
      }
      return;
    }

    const scan = await scanRepository({ rootDir });
    const artifacts = await generateMemory(scan, { outputDir: options.output });

    if (options.dryRun) {
      console.log(`Would refresh ${artifacts.length} files in ${options.output}/.`);
      return;
    }

    await writeMemoryArtifacts(rootDir, options.output, artifacts, true);
    const validation = await validateMemory({ rootDir, memoryDir: options.output });
    printValidation(validation);
    console.log("Memory maintenance complete.");
  });

program
  .command("doctor")
  .description("Check local environment and memory readiness.")
  .action(async () => {
    const rootDir = process.cwd();
    console.log(`Working directory: ${rootDir}`);
    console.log(`Memory directory: ${(await exists(path.join(rootDir, "memory"))) ? "present" : "missing"}`);
    console.log(`AGENTS.md: ${(await exists(path.join(rootDir, "AGENTS.md"))) ? "present" : "missing"}`);
    const scan = await scanRepository({ rootDir });
    console.log(`Detected profile: ${scan.profile}`);
    console.log(`Manifests: ${scan.manifests.length}`);
    const impact = classifyMemoryImpact(await getChangedFiles(rootDir, "main"));
    console.log(`Memory-impacting changes: ${impact.structuralFiles.length}`);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
