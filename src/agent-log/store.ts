import fs from "node:fs/promises";
import path from "node:path";
import type { AgentWorklogEvent, AgentWorklogEventType } from "../types.js";

export interface AppendWorklogInput {
  rootDir: string;
  memoryDir?: string;
  type: AgentWorklogEventType;
  agent: string;
  task?: string;
  message: string;
  files?: string[];
  commands?: string[];
  nextSteps?: string[];
}

function splitList(value?: string[]): string[] {
  return (value ?? [])
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function eventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function line(event: AgentWorklogEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export async function appendWorklogEvent(input: AppendWorklogInput): Promise<AgentWorklogEvent> {
  const memoryDir = path.resolve(input.rootDir, input.memoryDir ?? "memory");
  await fs.mkdir(memoryDir, { recursive: true });

  const event: AgentWorklogEvent = {
    id: eventId(),
    timestamp: new Date().toISOString(),
    type: input.type,
    agent: input.agent,
    task: input.task,
    message: input.message,
    files: splitList(input.files),
    commands: splitList(input.commands),
    nextSteps: splitList(input.nextSteps)
  };

  await fs.appendFile(path.join(memoryDir, "agent-worklog.jsonl"), line(event), "utf8");
  await writeHandoffSummary(memoryDir, await readWorklogEvents(memoryDir));
  return event;
}

export async function readWorklogEvents(memoryDir: string): Promise<AgentWorklogEvent[]> {
  try {
    const content = await fs.readFile(path.join(memoryDir, "agent-worklog.jsonl"), "utf8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((entry) => JSON.parse(entry) as AgentWorklogEvent)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  } catch {
    return [];
  }
}

export async function writeHandoffSummary(memoryDir: string, events: AgentWorklogEvent[]): Promise<void> {
  const recent = events.slice(-12).reverse();
  const latest = recent[0];
  const content = `# Agent Handoff

**Last Updated:** ${new Date().toISOString().slice(0, 10)}

---

## Current State

${latest ? `- Last agent: ${latest.agent}
- Last event: ${latest.type}
- Last message: ${latest.message}` : "- No agent worklog events recorded yet."}

## Recent Events

${recent.length ? recent.map((event) => `- ${event.timestamp} | ${event.agent} | ${event.type}: ${event.message}`).join("\n") : "- No recent events."}

## Next Steps

${recent.flatMap((event) => event.nextSteps ?? []).slice(0, 10).map((step) => `- ${step}`).join("\n") || "- [INCOMPLETE] Add next steps during checkpoints or handoffs."}

## Files Mentioned

${[...new Set(recent.flatMap((event) => event.files ?? []))].slice(0, 20).map((file) => `- \`${file}\``).join("\n") || "- No files mentioned yet."}
`;

  await fs.writeFile(path.join(memoryDir, "agent-handoff.md"), content, "utf8");
}
