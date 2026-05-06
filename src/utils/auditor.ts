import axe, { type AxeResults, type ElementContext, type RunOptions } from "axe-core";
import type { AuditResult, AuditOptions, Violation } from "../types";

function mapWcagLevel(level: "A" | "AA" | "AAA"): string[] {
  const tags = ["wcag2a", "wcag21a", "best-practice"];
  if (level === "AA" || level === "AAA") {
    tags.push("wcag2aa", "wcag21aa", "wcag22aa");
  }
  if (level === "AAA") {
    tags.push("wcag2aaa", "wcag21aaa");
  }
  return tags;
}

const VALID_IMPACTS = new Set<Violation["impact"]>([
  "critical",
  "serious",
  "moderate",
  "minor",
]);

function coerceImpact(impact: string | null | undefined): Violation["impact"] {
  if (impact && VALID_IMPACTS.has(impact as Violation["impact"])) {
    return impact as Violation["impact"];
  }
  return "minor";
}

export async function runAudit(options: AuditOptions = {}): Promise<AuditResult> {
  if (typeof document === "undefined") {
    throw new Error(
      "[@ashios15/react-a11y-audit] runAudit() requires a DOM. For CI, use the a11y-baseline CLI with a browser runner."
    );
  }

  const { level = "AA", rules, scope } = options;

  const runOptions: RunOptions = {
    runOnly: { type: "tag", values: mapWcagLevel(level) },
    ...(rules && rules.length > 0
      ? {
          rules: Object.fromEntries(rules.map((r) => [r, { enabled: true }])),
        }
      : {}),
  };

  const context: ElementContext = scope
    ? { include: [[scope]] }
    : document;

  const results: AxeResults = await axe.run(context, runOptions);

  const violations: Violation[] = results.violations.map((v) => ({
    id: v.id,
    impact: coerceImpact(v.impact),
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
    url: typeof window !== "undefined" ? window.location.href : "about:blank",
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
    return lines.join("\n");
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
