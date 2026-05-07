/**
 * benchmarks/harness/types.ts
 *
 * Shared type definitions for all benchmark data structures.
 */

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export type AgentId =
  | "antigravity"
  | "codex"
  | "vscode-copilot"
  | "claude-code"
  | "cursor"
  | "gemini-cli"
  | "simulated-baseline";

export interface AgentProfile {
  id: AgentId;
  name: string;
  vendor: string;
  contextWindowTokens: number;
  supportsAMS: boolean;
  available: boolean;
  limitationsNote?: string;
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export type RepoSize = "small" | "medium" | "large" | "monorepo" | "ai-focused";

export interface RepoConfig {
  id: string;
  name: string;
  size: RepoSize;
  url?: string;
  localPath?: string;
  stack: string[];
  approximateFiles: number;
  approximateLines: number;
  hasTests: boolean;
  hasCI: boolean;
  hasAuth: boolean;
  hasDatabase: boolean;
  hasAPI: boolean;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type TaskCategory =
  | "understanding"
  | "feature"
  | "refactoring"
  | "debugging"
  | "recovery"
  | "multi-agent"
  | "breaking-change";

export type TaskDifficulty = "easy" | "medium" | "hard";

export interface BenchmarkTask {
  id: string;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  name: string;
  prompt: string;
  /** Expected outputs / success criteria */
  successCriteria: string[];
  /** Files an agent must touch to complete this task */
  expectedFilesTouched: string[];
  /** Key concepts the agent must demonstrate */
  expectedConcepts: string[];
  /** Hallucination traps: things the agent should NOT claim */
  hallucinationTraps: string[];
  /** Max files a well-oriented agent should traverse */
  maxFilesBaseline: number;
  maxFilesWithAMS: number;
  /** Estimated token budget for baseline vs AMS */
  estimatedTokensBaseline: number;
  estimatedTokensWithAMS: number;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface ContextMetrics {
  /** Tokens used to orient the agent before the task */
  orientationTokens: number;
  /** Tokens in the actual task prompt + context */
  totalPromptTokens: number;
  /** Tokens in the response */
  responseTokens: number;
  /** Number of distinct files traversed */
  filesTraversed: number;
  /** Number of directories explored */
  dirsExplored: number;
  /** Context window utilisation (0–1) */
  contextWindowUtilisation: number;
}

export interface AccuracyMetrics {
  /** Did the agent correctly identify the architecture? */
  architectureCorrect: boolean;
  /** Did the agent correctly identify all required files? */
  requiredFilesFound: number;
  requiredFilesTotal: number;
  /** Number of hallucinated (nonexistent) files referenced */
  hallucinatedFiles: number;
  /** Number of incorrect API claims */
  incorrectAPIClaims: number;
  /** Number of correct concepts demonstrated */
  correctConceptsFound: number;
  correctConceptsTotal: number;
}

export interface SpeedMetrics {
  /** Wall-clock task duration in milliseconds */
  durationMs: number;
  /** Number of LLM call iterations */
  iterations: number;
  /** Number of retries / corrections needed */
  retries: number;
  /** Number of messages exchanged */
  messagesExchanged: number;
}

export interface RecoveryMetrics {
  /** Did the agent successfully resume a mid-session interruption? */
  resumedSuccessfully: boolean;
  /** Number of previously covered steps re-done after resume */
  duplicateSteps: number;
  /** Time from cold start to productive state (ms) */
  coldStartMs: number;
  /** Time from AMS-warm start to productive state (ms) */
  warmStartMs: number;
}

export interface HandoffMetrics {
  /** Was the handoff readable by the receiving agent? */
  handoffReadable: boolean;
  /** Fraction of prior context retained after handoff (0–1) */
  contextRetentionRate: number;
  /** Number of clarifying questions the receiving agent had to ask */
  clarifyingQuestionsNeeded: number;
  /** Duplicate work performed after handoff */
  duplicateWorkFraction: number;
}

export interface CostMetrics {
  /** Estimated GPT-4o equivalent cost (USD) */
  estimatedCostUSD: number;
  /** Tokens saved vs baseline */
  tokensSaved: number;
  /** Cost saved vs baseline (USD) */
  costSavedUSD: number;
  /** Percentage reduction */
  reductionPercent: number;
}

export interface TaskResult {
  runId: string;
  taskId: string;
  agentId: AgentId;
  repoId: string;
  mode: "baseline" | "ams";
  timestamp: string;
  success: boolean;
  context: ContextMetrics;
  accuracy: AccuracyMetrics;
  speed: SpeedMetrics;
  recovery?: RecoveryMetrics;
  handoff?: HandoffMetrics;
  cost: CostMetrics;
  /** Agent's raw response summary (first 500 chars) */
  responseSummary: string;
  /** Was AMS memory actively used? */
  memoryUsed: boolean;
  /** Which memory files were read */
  memoryFilesRead: string[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Run manifest
// ---------------------------------------------------------------------------

export interface BenchmarkRun {
  runId: string;
  startedAt: string;
  completedAt?: string;
  agentId: AgentId;
  repoId: string;
  mode: "baseline" | "ams" | "both";
  tasks: string[];
  results: TaskResult[];
  summary?: RunSummary;
}

export interface RunSummary {
  totalTasks: number;
  successRate: number;
  avgTokensBaseline: number;
  avgTokensAMS: number;
  tokenReductionPercent: number;
  avgFilesBaseline: number;
  avgFilesAMS: number;
  fileReductionPercent: number;
  avgHallucinationsBaseline: number;
  avgHallucinationsAMS: number;
  hallucinationReductionPercent: number;
  avgRecoverySpeedupMs: number;
  totalCostSavedUSD: number;
  overallImprovementScore: number; // 0–100
}

// ---------------------------------------------------------------------------
// Comparative report
// ---------------------------------------------------------------------------

export interface ComparativeReport {
  generatedAt: string;
  repos: string[];
  agents: AgentId[];
  baselineResults: TaskResult[];
  amsResults: TaskResult[];
  deltas: MetricDelta[];
  conclusions: Conclusion[];
}

export interface MetricDelta {
  metric: string;
  baselineAvg: number;
  amsAvg: number;
  improvement: number;
  improvementPercent: number;
  direction: "higher-better" | "lower-better";
  pValue?: number; // p-value from t-test if sample size allows
  significant: boolean;
}

export interface Conclusion {
  area: string;
  finding: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
  recommendation: string;
}
