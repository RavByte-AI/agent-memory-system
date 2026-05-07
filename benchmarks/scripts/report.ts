/**
 * benchmarks/scripts/report.ts
 *
 * CLI entry point for generating benchmark reports.
 * Usage: npx tsx benchmarks/scripts/report.ts [options]
 */
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { loadRuns, writeReports } from "../harness/reporter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARK_ROOT = path.resolve(__dirname, "..");
const DEFAULT_RUNS_DIR = path.join(BENCHMARK_ROOT, "runs");
const DEFAULT_REPORTS_DIR = path.join(BENCHMARK_ROOT, "reports");
const DEFAULT_METRICS_DIR = path.join(BENCHMARK_ROOT, "metrics");

async function main() {
  const { values } = parseArgs({
    options: {
      runs: { type: "string", default: DEFAULT_RUNS_DIR },
      reports: { type: "string", default: DEFAULT_REPORTS_DIR },
      metrics: { type: "string", default: DEFAULT_METRICS_DIR },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(`
Agent Memory System — Benchmark Report Generator
Usage: npx tsx benchmarks/scripts/report.ts [options]

Options:
  --runs <dir>        Directory containing run manifests (.json files) (default: benchmarks/runs)
  --reports <dir>     Output directory for markdown reports (default: benchmarks/reports)
  --metrics <dir>     Output directory for JSON metrics (default: benchmarks/metrics)
  --help              Show this help message
    `);
    process.exit(0);
  }

  const runsDir = path.resolve(values.runs as string);
  const reportsDir = path.resolve(values.reports as string);
  const metricsDir = path.resolve(values.metrics as string);

  console.log(`
===================================================
  AGENT MEMORY SYSTEM REPORT GENERATOR
===================================================
  Runs Dir:    ${runsDir}
  Reports Dir: ${reportsDir}
  Metrics Dir: ${metricsDir}
===================================================
`);

  try {
    const runs = await loadRuns(runsDir);
    if (runs.length === 0) {
      console.error(`Error: No benchmark runs found in ${runsDir}`);
      console.error("Run 'npx tsx benchmarks/scripts/run.ts' first.");
      process.exit(1);
    }
    console.log(`Loaded ${runs.length} benchmark runs.`);

    await writeReports(runs, reportsDir, metricsDir);
    console.log("\nReport generation complete.");
  } catch (err) {
    console.error("Failed to generate reports:", err);
    process.exit(1);
  }
}

main().catch(console.error);
