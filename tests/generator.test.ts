import { describe, expect, it } from "vitest";
import { REQUIRED_CONTEXT_TOPICS, REQUIRED_MEMORY_FILES } from "../src/constants.js";
import { generateMemory } from "../src/generator/generate.js";
import type { ProjectScan } from "../src/types.js";

const scan: ProjectScan = {
  rootDir: "/repo",
  repoName: "repo",
  profile: "mixed",
  detectedProfiles: ["mixed"],
  languages: ["TypeScript"],
  frameworks: ["Next.js"],
  manifests: [],
  readmes: [],
  agentFiles: [],
  sourceFiles: ["src/index.ts"],
  routeFiles: [],
  apiFiles: [],
  configFiles: [],
  envVars: ["DATABASE_URL"],
  testCommands: ["npm test (package.json)"],
  buildCommands: ["npm run build (package.json)"],
  databaseHints: [],
  deploymentHints: [],
  riskNotes: [],
  unreadableFiles: []
};

describe("generateMemory", () => {
  it("creates all required files and context topics", async () => {
    const artifacts = await generateMemory(scan);
    const paths = artifacts.map((artifact) => artifact.path);

    expect(paths).toEqual(REQUIRED_MEMORY_FILES);
    const index = JSON.parse(artifacts.find((artifact) => artifact.path === "context-index.json")!.content);
    for (const topic of REQUIRED_CONTEXT_TOPICS) {
      expect(index[topic]).toHaveProperty("file");
      expect(index[topic]).toHaveProperty("description");
    }
  });
});
