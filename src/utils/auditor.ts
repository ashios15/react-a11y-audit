import axe, { type AxeResults, type RunOptions } from "axe-core";
import type { AuditResult, AuditOptions, Violation } from "../types";

function mapWcagLevel(level: "A" | "AA" | "AAA"): string[] {
  const tags = ["wcag2a", "best-practice"];
  if (level === "AA" || level === "AAA") tags.push("wcag2aa", "wcag21aa");
  if (level === "AAA") tags.push("wcag2aaa", "wcag21aaa");
  return tags;
}

export async function runAudit(options: AuditOptions = {}): Promise<AuditResult> {
  const { level = "AA", rules, scope } = options;

  const runOptions: RunOptions = {
    runOnly: {
      type: "tag",
      values: mapWcagLevel(level),
    },
    rules: rules
      ? Object.fromEntries(rules.map((r) => [r, { enabled: true }]))
      : undefined,
  };

  const context = scope ? { include: [scope] } : document;
  const results: AxeResults = await axe.run(context as any, runOptions);

  const violations: Violation[] = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact as Violation["impact"],
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    wcagTags: v.tags.filter((t) => t.startsWith("wcag")),
    nodes: v.nodes.map((n) => ({
      html: n.html,
      target: n.target.map(String),
      failureSummary: n.failureSummary ?? "",
    })),
  }));

  const total = results.passes.length + violations.length + results.incomplete.length;
  const score = total > 0 ? Math.round((results.passes.length / total) * 100) : 100;

  return {
    violations,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    score,
  };
}

export function generateReport(result: AuditResult): string {
  const lines: string[] = [
    `# Accessibility Audit Report`,
    ``,
    `- **URL:** ${result.url}`,
    `- **Date:** ${result.timestamp}`,
    `- **Score:** ${result.score}/100`,
    `- **Violations:** ${result.violations.length}`,
    `- **Passes:** ${result.passes}`,
    ``,
  ];

  if (result.violations.length === 0) {
    lines.push("No violations found.");
  }

  for (const v of result.violations) {
    lines.push(`## [${v.impact.toUpperCase()}] ${v.help}`);
    lines.push(`> ${v.description}`);
    lines.push(`> WCAG: ${v.wcagTags.join(", ")} | [Learn more](${v.helpUrl})`);
    lines.push("");
    for (const node of v.nodes) {
      lines.push(`- \`${node.target.join(", ")}\``);
      lines.push(`  ${node.failureSummary}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
