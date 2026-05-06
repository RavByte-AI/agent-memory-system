const ENV_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;
const ENV_ACCESS = /(?:process\.env\.|os\.getenv\(["']|env\(["']|getenv\(["'])([A-Za-z_][A-Za-z0-9_]*)/g;

export function extractEnvNames(path: string, content: string): string[] {
  const names = new Set<string>();

  if (/(^|\/)\.env(?:\.|$)/.test(path)) {
    for (const line of content.split(/\r?\n/)) {
      const match = ENV_LINE.exec(line);
      if (match) {
        names.add(match[1]);
      }
    }
  }

  for (const match of content.matchAll(ENV_ACCESS)) {
    names.add(match[1]);
  }

  return [...names].sort();
}
