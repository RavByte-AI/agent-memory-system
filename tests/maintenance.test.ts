import { describe, expect, it } from "vitest";
import { classifyMemoryImpact } from "../src/maintenance/git.js";

describe("classifyMemoryImpact", () => {
  it("flags structural changes and suggests memory topics", () => {
    const impact = classifyMemoryImpact([
      "package.json",
      "src/api/routes.ts",
      "src/models/user.ts",
      "src/config/auth.ts",
      "README.md"
    ]);

    expect(impact.requiresMemoryUpdate).toBe(true);
    expect(impact.structuralFiles).toEqual(["package.json", "src/api/routes.ts", "src/models/user.ts", "src/config/auth.ts"]);
    expect(impact.suggestedTopics).toEqual(expect.arrayContaining(["development-workflow", "api-interfaces", "data-storage", "security-config"]));
  });

  it("ignores memory-only and non-structural changes", () => {
    const impact = classifyMemoryImpact(["memory/README.md", "docs/notes.md"]);

    expect(impact.requiresMemoryUpdate).toBe(false);
    expect(impact.structuralFiles).toEqual([]);
  });
});
