import path from "node:path";
import { REQUIRED_CONTEXT_TOPICS, REQUIRED_MEMORY_FILES } from "../constants.js";
import type { ContextIndex } from "../types.js";

export function missingRequiredFiles(files: string[]): string[] {
  const present = new Set(files);
  return REQUIRED_MEMORY_FILES.filter((file) => !present.has(file));
}

export function hasLastUpdatedNearTop(content: string, maxLine = 15): boolean {
  return content.split(/\r?\n/).slice(0, maxLine).some((line) => /Last Updated/i.test(line));
}

export function findSecretPatterns(content: string): string[] {
  const findings: string[] = [];
  const checks: Array<[string, RegExp]> = [
    ["JWT-like token", /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g],
    ["Long hex secret", /\b[a-fA-F0-9]{32,}\b/g],
    ["password assignment", /\bpassword\s*=\s*(?!<|CHANGE_ME|REDACTED|example|placeholder)[^\s`'"]+/gi],
    ["api_key assignment", /\bapi_?key\s*=\s*(?!<|CHANGE_ME|REDACTED|example|placeholder)[^\s`'"]+/gi],
    ["secret assignment", /\bsecret\s*=\s*(?!<|CHANGE_ME|REDACTED|example|placeholder)[^\s`'"]+/gi]
  ];

  for (const [label, regex] of checks) {
    if (regex.test(content)) {
      findings.push(label);
    }
  }

  return findings;
}

export function isRepositoryRelativePath(value: string): boolean {
  if (!value || value.startsWith("./") || value.startsWith("../") || path.isAbsolute(value)) {
    return false;
  }
  return !/^[A-Za-z]:[\\/]/.test(value);
}

export function validateContextIndex(value: unknown): value is ContextIndex {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const index = value as Record<string, unknown>;
  for (const topic of REQUIRED_CONTEXT_TOPICS) {
    const entry = index[topic];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }
    const typed = entry as Record<string, unknown>;
    if (typeof typed.file !== "string" || typeof typed.description !== "string") {
      return false;
    }
  }
  return true;
}
