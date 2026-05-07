/**
 * benchmarks/scripts/run.ts
 *
 * CLI entry point for running the AMS Benchmark Suite.
 * Usage: npx tsx benchmarks/scripts/run.ts [options]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { runBenchmark, captureGraphSnapshot, type RunOptions } from "../harness/runner.js";
import type { AgentId, TaskCategory } from "../harness/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARK_ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUTPUT_DIR = path.join(BENCHMARK_ROOT, "runs");
const CONFIG_AGENTS = path.join(BENCHMARK_ROOT, "config", "agents.json");

async function main() {
  const { values } = parseArgs({
    options: {
      repo: { type: "string", default: "." },
      agent: { type: "string", default: "antigravity" },
      mode: { type: "string", default: "both" }, // baseline | ams | both
      category: { type: "string" },
      output: { type: "string", default: DEFAULT_OUTPUT_DIR },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(`
Agent Memory System — Benchmark Runner
Usage: npx tsx benchmarks/scripts/run.ts [options]

Options:
  --repo <path>       Path to the repository to benchmark (default: current dir)
  --agent <id>        Agent ID to benchmark (default: antigravity)
  --mode <mode>       Run mode: baseline, ams, or both (default: both)
  --category <cat>    Run only a specific task category (e.g. understanding, debugging)
  --output <dir>      Output directory for run manifests (default: benchmarks/runs)
  --help              Show this help message
    `);
    process.exit(0);
  }

  const repoPath = path.resolve(values.repo as string);
  const agentId = values.agent as AgentId;
  const mode = values.mode as "baseline" | "ams" | "both";
  const category = values.category as TaskCategory | undefined;
  const outputDir = path.resolve(values.output as string);

  // Validate agent
  try {
    const rawAgents = await fs.readFile(CONFIG_AGENTS, "utf8");
    const agents = JSON.parse(rawAgents) as { id: string; available: boolean }[];
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      console.error(`Error: Unknown agent ID '${agentId}'. Valid agents: ${agents.map(a => a.id).join(", ")}`);
      process.exit(1);
    }
    if (!agent.available) {
      console.warn(`Warning: Agent '${agentId}' is marked as unavailable in config. Proceeding with simulation.`);
    }
  } catch (err) {
    console.error("Error reading agents config:", err);
    process.exit(1);
  }

  // Determine repoId from path
  let repoId = path.basename(repoPath);
  if (repoId === ".") repoId = path.basename(process.cwd());

  console.log(`
===================================================
  AGENT MEMORY SYSTEM BENCHMARK
===================================================
  Repo:   ${repoPath} (${repoId})
  Agent:  ${agentId}
  Mode:   ${mode}
  Output: ${outputDir}
===================================================
`);

  // Ensure output dir exists
  await fs.mkdir(outputDir, { recursive: true });

  // Optional: Capture graph snapshot if running in ams or both mode
  if (mode === "ams" || mode === "both") {
    try {
      const snap = await captureGraphSnapshot(repoPath);
      await fs.writeFile(
        path.join(outputDir, `graph-snapshot-${repoId}.json`),
        JSON.stringify(snap, null, 2),
        "utf8"
      );
    } catch (err) {
      console.error("Warning: Failed to capture graph snapshot. Are you sure this is a valid repository?", err);
    }
  }

  const opts: RunOptions = {
    repoPath,
    repoId,
    agentId,
    mode,
    outputDir,
    ...(category && { categories: [category] }),
  };

  try {
    await runBenchmark(opts);
    console.log("Benchmark run complete.");
    console.log(`Run 'npx tsx benchmarks/scripts/report.ts --runs ${outputDir}' to generate reports.`);
  } catch (err) {
    console.error("Benchmark failed:", err);
    process.exit(1);
  }
}

main().catch(console.error);
