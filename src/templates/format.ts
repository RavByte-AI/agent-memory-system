import type { ProjectScan } from "../types.js";

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function header(title: string): string {
  return `# ${title}\n\n**Last Updated:** ${todayIso()}\n\n---\n`;
}

export function list(items: string[], empty = "[INFERRED] No matching files were detected."): string {
  if (items.length === 0) {
    return `- ${empty}`;
  }
  return items.map((item) => `- \`${item}\``).join("\n");
}

export function table(rows: string[][], headers: string[]): string {
  const all = [headers, ...rows];
  const widths = headers.map((_, index) => Math.max(...all.map((row) => row[index]?.length ?? 0)));
  const render = (row: string[]) => `| ${row.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`;
  return [render(headers), render(widths.map((width) => "-".repeat(width))), ...rows.map(render)].join("\n");
}

export function projectFacts(scan: ProjectScan): string {
  return table(
    [
      ["Repository", scan.repoName],
      ["Detected profile", scan.profile],
      ["Languages", scan.languages.join(", ") || "[INFERRED] No dominant language detected"],
      ["Frameworks", scan.frameworks.join(", ") || "[INFERRED] No framework detected"],
      ["Manifests", String(scan.manifests.length)],
      ["Source files", String(scan.sourceFiles.length)]
    ],
    ["Fact", "Value"]
  );
}
