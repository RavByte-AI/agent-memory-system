/**
 * src/graph/parser.ts
 *
 * Regex-based static analysis parser for Node.js.
 * Extracts import edges, exported symbols, function definitions,
 * complexity estimates, and security heuristics.
 *
 * Implements the "heuristic-regex" tier from Codeflow's browser app,
 * adapted for synchronous Node.js operation.
 */

import type { ExportedSymbol, FunctionNode, SecurityIssue } from "./types.js";

// ---------------------------------------------------------------------------
// File type helpers
// ---------------------------------------------------------------------------

const CODE_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".pyw", ".go", ".rs", ".java", ".rb", ".php",
  ".cs", ".swift", ".kt", ".kts", ".scala",
  ".c", ".cpp", ".cc", ".h", ".hpp",
  ".ex", ".exs", ".lua", ".sh", ".bash", ".vue", ".svelte",
]);

const TEXT_EXTS = new Set([
  ".md", ".markdown", ".txt", ".json", ".yaml", ".yml",
  ".toml", ".xml", ".graphql", ".sql", ".proto",
  ".env", ".gitignore", ".editorconfig", ".ini", ".cfg",
]);

const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp",
  ".woff", ".woff2", ".ttf", ".eot", ".pdf",
  ".zip", ".tar", ".gz", ".exe", ".dll", ".so",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
]);

export function isCode(filename: string): boolean {
  return [...CODE_EXTS].some((e) => filename.toLowerCase().endsWith(e));
}
export function isText(filename: string): boolean {
  return [...TEXT_EXTS].some((e) => filename.toLowerCase().endsWith(e));
}
export function isBinary(filename: string): boolean {
  return [...BINARY_EXTS].some((e) => filename.toLowerCase().endsWith(e));
}
export function isIncluded(filename: string): boolean {
  return !isBinary(filename) && (isCode(filename) || isText(filename));
}
export function isMarkdown(filename: string): boolean {
  const l = filename.toLowerCase();
  return l.endsWith(".md") || l.endsWith(".markdown");
}

// ---------------------------------------------------------------------------
// Import / dependency extraction
// ---------------------------------------------------------------------------

/**
 * Resolve a raw import specifier relative to the source file path.
 * Returns the matching path from allPaths, or null if not resolvable.
 */
export function resolveImport(
  specifier: string,
  fromFile: string,
  allPaths: string[]
): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) return null;

  // Normalise Windows paths to forward slashes
  const normFrom = fromFile.replace(/\\/g, "/");
  const normSpec = specifier.replace(/\\/g, "/");

  const fromDir = normFrom.includes("/")
    ? normFrom.split("/").slice(0, -1).join("/")
    : "";
  const parts = (fromDir ? fromDir.split("/") : []).concat(normSpec.split("/"));
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") { out.pop(); continue; }
    out.push(p);
  }
  const base = out.join("/");

  // TypeScript ESM projects use .js extensions that map to .ts source files
  const baseNoJs = base.endsWith(".js") ? base.slice(0, -3) : base;
  const baseNoTs = base.endsWith(".ts") ? base.slice(0, -3) : base;

  const candidates = [
    base,
    `${baseNoJs}.ts`, `${baseNoJs}.tsx`,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`,
    `${baseNoJs}/index.ts`, `${baseNoJs}/index.tsx`,
    `${base}/index.ts`, `${base}/index.tsx`,
    `${base}/index.js`, `${base}/index.jsx`,
    `${base}.py`, `${base}/__init__.py`,
    `${base}.go`, `${base}.rs`,
  ];

  const lower = allPaths.map((p) => p.replace(/\\/g, "/").toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx >= 0) return allPaths[idx];
  }
  return null;
}

/** Extract raw import specifiers from source content. */
export function extractRawImports(content: string, filename: string): string[] {
  const lower = filename.toLowerCase();
  const specs: string[] = [];

  // ES modules / CommonJS (TS/JS)
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].some((e) => lower.endsWith(e))) {
    const patterns = [
      /\bfrom\s+['"]([^'"]+)['"]/g,
      /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) specs.push(m[1]);
    }
  }

  // Python
  if (lower.endsWith(".py") || lower.endsWith(".pyw")) {
    const pyFrom = /^from\s+(\.+[\w.]*|[\w.]+)\s+import/gm;
    const pyImport = /^import\s+([\w.,\s]+)/gm;
    let m: RegExpExecArray | null;
    while ((m = pyFrom.exec(content)) !== null) {
      const s = m[1].trim();
      specs.push(s.startsWith(".") ? s.replace(/\./g, "/") : `./${s.replace(/\./g, "/")}`);
    }
    while ((m = pyImport.exec(content)) !== null) {
      for (const mod of m[1].split(",")) {
        const t = mod.trim().split(" ")[0];
        if (t) specs.push(`./${t.replace(/\./g, "/")}`);
      }
    }
  }

  // Go
  if (lower.endsWith(".go")) {
    const goImport = /import\s+(?:"([^"]+)"|`([^`]+)`|\(\s*([\s\S]*?)\s*\))/g;
    let m: RegExpExecArray | null;
    while ((m = goImport.exec(content)) !== null) {
      if (m[1]) specs.push(`./${m[1]}`);
      else if (m[2]) specs.push(`./${m[2]}`);
      else if (m[3]) {
        for (const line of m[3].split("\n")) {
          const q = line.match(/["` ]([^"` ]+)["` ]/);
          if (q) specs.push(`./${q[1]}`);
        }
      }
    }
  }

  // Markdown (wiki-links and relative links)
  if (isMarkdown(filename)) {
    const wiki = /\[\[([^\]|#]+?)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g;
    const mdlink = /(?:^|[^!])\[[^\]]*\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = wiki.exec(content)) !== null) specs.push(m[1].trim());
    while ((m = mdlink.exec(content)) !== null) {
      const url = m[1].split("#")[0].split("?")[0].trim();
      if (url && !/^https?:|^mailto:/.test(url)) specs.push(url);
    }
  }

  return specs;
}

// ---------------------------------------------------------------------------
// Function extraction
// ---------------------------------------------------------------------------

function estimateComplexity(snippet: string): number {
  return 1 + (snippet.match(/\b(if|else|for|while|switch|catch|case|\?\?|&&|\|\|)\b/g) ?? []).length;
}

export function extractFunctions(content: string, filename: string): FunctionNode[] {
  const lower = filename.toLowerCase();
  const fns: FunctionNode[] = [];

  // TypeScript / JavaScript
  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].some((e) => lower.endsWith(e))) {
    const lines = content.split("\n");
    const patterns: [RegExp, boolean][] = [
      [/^(export\s+(?:default\s+)?)?(?:async\s+)?function\s+(\w+)\s*\(/gm, false],
      [/^(export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(.*?\)\s*=>/gm, false],
    ];
    for (const [re, isMethod] of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const lineNo = content.slice(0, m.index).split("\n").length;
        const exported = Boolean(m[1]?.includes("export"));
        const name = m[2];
        if (!name) continue;
        fns.push({
          name,
          line: lineNo,
          exported,
          isClassMethod: isMethod,
          complexity: estimateComplexity(lines.slice(lineNo - 1, lineNo + 30).join("\n")),
          calledBy: [],
        });
      }
    }
    // Class methods
    const classMethod = /^\s{2,}(?:(?:public|private|protected|static|async|override)\s+)*(\w+)\s*\(/gm;
    let m: RegExpExecArray | null;
    while ((m = classMethod.exec(content)) !== null) {
      if (["if", "for", "while", "switch", "catch", "constructor"].includes(m[1])) continue;
      const lineNo = content.slice(0, m.index).split("\n").length;
      fns.push({ name: m[1], line: lineNo, exported: false, isClassMethod: true, complexity: 1, calledBy: [] });
    }
  }

  // Python
  if (lower.endsWith(".py") || lower.endsWith(".pyw")) {
    const pyDef = /^(    )?def\s+(\w+)\s*\(/gm;
    let m: RegExpExecArray | null;
    while ((m = pyDef.exec(content)) !== null) {
      const lineNo = content.slice(0, m.index).split("\n").length;
      fns.push({ name: m[2], line: lineNo, exported: !m[2].startsWith("_"), isClassMethod: Boolean(m[1]), complexity: 1, calledBy: [] });
    }
  }

  // Go
  if (lower.endsWith(".go")) {
    const goFunc = /^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/gm;
    let m: RegExpExecArray | null;
    while ((m = goFunc.exec(content)) !== null) {
      const lineNo = content.slice(0, m.index).split("\n").length;
      fns.push({ name: m[1], line: lineNo, exported: /^[A-Z]/.test(m[1]), isClassMethod: false, complexity: 1, calledBy: [] });
    }
  }

  return fns;
}

// ---------------------------------------------------------------------------
// Exported symbol extraction
// ---------------------------------------------------------------------------

export function extractExports(content: string, filename: string): ExportedSymbol[] {
  const lower = filename.toLowerCase();
  if (![".ts", ".tsx", ".js", ".jsx", ".mjs"].some((e) => lower.endsWith(e))) return [];

  const symbols: ExportedSymbol[] = [];
  const patterns: [RegExp, ExportedSymbol["kind"]][] = [
    [/^export\s+(?:async\s+)?function\s+(\w+)/gm, "function"],
    [/^export\s+class\s+(\w+)/gm, "class"],
    [/^export\s+(?:const|let|var)\s+(\w+)/gm, "const"],
    [/^export\s+(?:interface|type)\s+(\w+)/gm, "type"],
    [/^export\s+default\s+/gm, "default"],
  ];

  for (const [re, kind] of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const lineNo = content.slice(0, m.index).split("\n").length;
      if (kind === "default") { symbols.push({ name: "default", kind, line: lineNo }); continue; }
      if (m[1]) symbols.push({ name: m[1], kind, line: lineNo });
    }
  }

  // export { a, b }
  const namedExport = /^export\s+\{([^}]+)\}/gm;
  let m: RegExpExecArray | null;
  while ((m = namedExport.exec(content)) !== null) {
    const lineNo = content.slice(0, m.index).split("\n").length;
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) symbols.push({ name, kind: "const", line: lineNo });
    }
  }

  return symbols;
}

// ---------------------------------------------------------------------------
// Security heuristics
// ---------------------------------------------------------------------------

const SEC_RULES: { re: RegExp; kind: SecurityIssue["kind"]; sev: SecurityIssue["severity"] }[] = [
  { re: /(?:api[_-]?key|secret|password|token|private[_-]?key)\s*[:=]\s*['"`][^'"`\s]{8,}/gi, kind: "hardcoded-secret", sev: "high" },
  { re: /['"`][A-Za-z0-9+/]{40,}={0,2}['"`]/g, kind: "hardcoded-secret", sev: "medium" },
  { re: /\beval\s*\(/g, kind: "eval-usage", sev: "high" },
  { re: /console\.(log|debug)\s*\(/g, kind: "debug-statement", sev: "low" },
  { re: /(?:execute|query)\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*['"\s]*\+\s*\w)/g, kind: "sql-injection", sev: "high" },
];

export function detectSecurityIssues(content: string, _filename: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const lines = content.split("\n");
  for (const { re, kind, sev } of SEC_RULES) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const lineNo = content.slice(0, m.index).split("\n").length;
      issues.push({ kind, severity: sev, line: lineNo, snippet: lines[lineNo - 1]?.trim().slice(0, 80) });
    }
  }
  return issues;
}

/** Count non-blank, non-comment lines. */
export function countLines(content: string): number {
  return content.split("\n").filter((l) => {
    const t = l.trim();
    return t && !t.startsWith("//") && !t.startsWith("#") && !t.startsWith("*");
  }).length;
}
