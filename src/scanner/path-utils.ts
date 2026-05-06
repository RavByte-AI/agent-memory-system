import path from "node:path";
import { GENERATED_DIRS } from "../constants.js";

export function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function relativePath(rootDir: string, filePath: string): string {
  return toPosixPath(path.relative(rootDir, filePath));
}

export function ignoreGlobs(): string[] {
  return GENERATED_DIRS.map((dir) => `**/${dir}/**`);
}

export function isGeneratedPath(filePath: string): boolean {
  const parts = toPosixPath(filePath).split("/");
  return parts.some((part) => GENERATED_DIRS.includes(part));
}
