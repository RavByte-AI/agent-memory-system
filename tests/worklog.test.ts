import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appendWorklogEvent, readWorklogEvents } from "../src/agent-log/store.js";

describe("agent worklog store", () => {
  it("appends JSONL events and writes a handoff summary", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-memory-worklog-"));

    await appendWorklogEvent({
      rootDir,
      type: "handoff",
      agent: "codex",
      task: "test handoff",
      message: "implemented feature",
      files: ["src/cli/index.ts"],
      commands: ["npm test"],
      nextSteps: ["review docs"]
    });

    const events = await readWorklogEvents(path.join(rootDir, "memory"));
    const handoff = await fs.readFile(path.join(rootDir, "memory", "agent-handoff.md"), "utf8");

    expect(events).toHaveLength(1);
    expect(events[0].agent).toBe("codex");
    expect(handoff).toContain("implemented feature");
    expect(handoff).toContain("review docs");
  });
});
