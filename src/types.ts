export type RepoProfile =
  | "auto"
  | "monorepo"
  | "frontend"
  | "backend"
  | "cli-package"
  | "docs-heavy"
  | "mixed";

export interface ScanOptions {
  rootDir?: string;
  profile?: RepoProfile;
  maxFileBytes?: number;
}

export interface GenerateOptions {
  outputDir?: string;
  profile?: RepoProfile;
  includeAgentBootstrap?: boolean;
}

export interface ValidateOptions {
  rootDir?: string;
  memoryDir?: string;
  strict?: boolean;
}

export interface MemoryImpact {
  changedFiles: string[];
  structuralFiles: string[];
  suggestedTopics: string[];
  requiresMemoryUpdate: boolean;
}

export type AgentWorklogEventType = "start" | "log" | "checkpoint" | "handoff" | "finish";

export interface AgentWorklogEvent {
  id: string;
  timestamp: string;
  type: AgentWorklogEventType;
  agent: string;
  task?: string;
  message: string;
  files?: string[];
  commands?: string[];
  nextSteps?: string[];
}

export interface ManifestInfo {
  path: string;
  type: "node" | "python" | "rust" | "go" | "java" | "docker" | "typescript" | "other";
  name?: string;
  author?: string;
  homepage?: string;
  owner?: {
    founder?: string;
    company?: string;
    website?: string;
    x?: string;
    linkedin?: string;
  };
  scripts?: Record<string, string>;
  dependencies?: string[];
}

export interface ProjectScan {
  rootDir: string;
  repoName: string;
  profile: RepoProfile;
  detectedProfiles: RepoProfile[];
  languages: string[];
  frameworks: string[];
  manifests: ManifestInfo[];
  readmes: string[];
  agentFiles: string[];
  sourceFiles: string[];
  routeFiles: string[];
  apiFiles: string[];
  configFiles: string[];
  envVars: string[];
  testCommands: string[];
  buildCommands: string[];
  databaseHints: string[];
  deploymentHints: string[];
  riskNotes: string[];
  unreadableFiles: Array<{ path: string; reason: string }>;
}

export interface MemoryArtifact {
  path: string;
  content: string;
}

export interface ContextIndexEntry {
  file: string;
  description: string;
}

export type ContextIndex = Record<string, ContextIndexEntry>;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  secretFindings: string[];
  staleFileFindings: string[];
  missingRequiredFiles: string[];
}
