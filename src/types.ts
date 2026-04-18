export interface Violation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  help: string;
  helpUrl: string;
  wcagTags: string[];
  nodes: ViolationNode[];
}

export interface ViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
}

export interface AuditResult {
  violations: Violation[];
  passes: number;
  incomplete: number;
  timestamp: string;
  url: string;
  score: number; // 0-100
}

export interface AuditOptions {
  /** WCAG level to check: "A", "AA", or "AAA" */
  level?: "A" | "AA" | "AAA";
  /** Specific rules to run (empty = all) */
  rules?: string[];
  /** CSS selector to scope the audit */
  scope?: string;
  /** Auto-run interval in ms (0 = manual only) */
  interval?: number;
}
