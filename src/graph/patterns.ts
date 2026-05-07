/**
 * src/graph/patterns.ts — Design pattern and anti-pattern detection.
 */
import type { FileNode, PatternMatch } from "./types.js";

interface RawFile { path: string; content: string; functions: { name: string }[] }

export function detectPatterns(files: RawFile[]): PatternMatch[] {
  const pat: PatternMatch[] = [];

  const match = (pred: (f: RawFile) => boolean) => files.filter(pred).map((f) => f.path);

  const singletons = match((f) => f.content.includes("getInstance") || /let\s+instance\s*=/.test(f.content) || /private\s+static\s+instance/.test(f.content));
  if (singletons.length) pat.push({ name: "Singleton", severity: "info", isAnti: false, files: singletons, description: "Single-instance pattern. Common for config, logging, or connection pools.", metrics: { instances: singletons.length } });

  const factories = match((f) => f.path.toLowerCase().includes("factory") || /create[A-Z]\w*\s*\(/.test(f.content) || f.content.includes("return new"));
  if (factories.length) pat.push({ name: "Factory", severity: "info", isAnti: false, files: factories, description: "Creates objects without specifying exact class. Enables loose coupling.", metrics: { factories: factories.length } });

  const observers = match((f) => f.content.includes("subscribe") || f.content.includes("addEventListener") || f.content.includes(".on(") || f.content.includes("emit("));
  if (observers.length) pat.push({ name: "Observer/Event", severity: "info", isAnti: false, files: observers, description: "Event-driven subscription mechanism. Decouples producers from consumers.", metrics: { emitters: observers.length } });

  const hooks = match((f) => /export\s+(?:const|function)\s+use[A-Z]/.test(f.content));
  if (hooks.length) pat.push({ name: "Custom Hooks", severity: "info", isAnti: false, files: hooks, description: "React custom hooks for reusable stateful logic.", metrics: { hooks: hooks.length } });

  const providers = match((f) => f.content.includes("createContext") || f.content.includes("Provider") || f.content.includes("useContext"));
  if (providers.length) pat.push({ name: "Context Provider", severity: "info", isAnti: false, files: providers, description: "React Context for global state without prop drilling.", metrics: { contexts: providers.length } });

  const pyRoutes = match((f) => f.path.endsWith(".py") && /@(?:app\.route|router\.|blueprint\.|get|post|put|delete|patch)\s*\(/.test(f.content));
  if (pyRoutes.length) pat.push({ name: "Route Decorators", severity: "info", isAnti: false, files: pyRoutes, description: "Flask/FastAPI/Django route decorators.", metrics: { routes: pyRoutes.length } });

  // Anti-patterns
  const godFiles = match((f) => f.functions.length > 15);
  if (godFiles.length) pat.push({ name: "God Object", severity: "warning", isAnti: true, files: godFiles, description: "Files with 15+ functions. Consider splitting into smaller modules.", metrics: { files: godFiles.length } });

  const longFiles = files.filter((f) => (f.content.split("\n").length) > 500).map((f) => f.path);
  if (longFiles.length) pat.push({ name: "Long File", severity: "warning", isAnti: true, files: longFiles, description: "Files over 500 lines are harder to maintain.", metrics: { files: longFiles.length } });

  return pat;
}
