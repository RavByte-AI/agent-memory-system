import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { REQUIRED_CONTEXT_TOPICS, REQUIRED_MEMORY_FILES } from "../src/constants.js";
import { findSecretPatterns, hasLastUpdatedNearTop, isRepositoryRelativePath, missingRequiredFiles, validateContextIndex } from "../src/validators/rules.js";

describe("validator rules", () => {
  it("validates required memory file completeness", () => {
    expect(missingRequiredFiles(REQUIRED_MEMORY_FILES)).toEqual([]);
    expect(missingRequiredFiles(REQUIRED_MEMORY_FILES.filter((file) => file !== "README.md"))).toContain("README.md");
  });

  it("validates context-index shape", () => {
    const valid = Object.fromEntries(REQUIRED_CONTEXT_TOPICS.map((topic) => [topic, { file: "README.md", description: "desc" }]));
    expect(validateContextIndex(valid)).toBe(true);
    expect(validateContextIndex({ ...valid, "project-overview": { file: "README.md" } })).toBe(false);
    expect(() => JSON.parse("{")).toThrow();
  });

  it("detects Last Updated boundaries", () => {
    expect(hasLastUpdatedNearTop("Last Updated: 2026-01-01")).toBe(true);
    expect(hasLastUpdatedNearTop(`${"\n".repeat(14)}Last Updated: 2026-01-01`)).toBe(true);
    expect(hasLastUpdatedNearTop(`${"\n".repeat(15)}Last Updated: 2026-01-01`)).toBe(false);
    expect(hasLastUpdatedNearTop("nothing")).toBe(false);
  });

  it("detects obvious secret patterns but allows env var names", () => {
    expect(findSecretPatterns("token aaaabbbbccccddddeeee.ffffgggghhhhiiiijjjj.kkkkllllmmmmnnnnoooo")).toContain("JWT-like token");
    expect(findSecretPatterns("secret=0123456789abcdef0123456789abcdef")).toEqual(expect.arrayContaining(["Long hex secret", "secret assignment"]));
    expect(findSecretPatterns("DATABASE_URL and FIREBASE_API_KEY")).toEqual([]);
  });

  it("validates repository-relative paths", () => {
    expect(isRepositoryRelativePath("ravenance-server/app/db/models.py")).toBe(true);
    expect(isRepositoryRelativePath("./models.py")).toBe(false);
    expect(isRepositoryRelativePath("/app/db/models.py")).toBe(false);
    expect(isRepositoryRelativePath("C:\\repo\\file.ts")).toBe(false);
  });
});

describe("validator properties", () => {
  it("complete file sets satisfy required-file validation", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (extra) => {
        expect(missingRequiredFiles([...REQUIRED_MEMORY_FILES, ...extra])).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  it("valid context indexes always include required topics and fields", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (description) => {
        const index = Object.fromEntries(REQUIRED_CONTEXT_TOPICS.map((topic) => [topic, { file: "README.md", description }]));
        expect(validateContextIndex(index)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("Last Updated validator only accepts content with the marker near the top", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 14 }), (line) => {
        expect(hasLastUpdatedNearTop(`${"\n".repeat(line)}Last Updated: 2026-01-01`)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("secret detector catches generated secret-like assignments", () => {
    fc.assert(
      fc.property(fc.hexaString({ minLength: 32 }), (secret) => {
        expect(findSecretPatterns(`password=${secret}`).length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it("repository-relative path validator rejects absolute and local shorthand paths", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (suffix) => {
        expect(isRepositoryRelativePath(`./${suffix}`)).toBe(false);
        expect(isRepositoryRelativePath(`/root/${suffix}`)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
