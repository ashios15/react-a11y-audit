/**
 * Pure, environment-agnostic baseline-diff logic.
 *
 * A "baseline" is a snapshot of known a11y violations. The diff against a
 * fresh audit splits issues into three buckets:
 *
 *   - `introduced` — violations in the new audit that are NOT in the baseline
 *   - `fixed`      — violations in the baseline that are NOT in the new audit
 *   - `persisted`  — violations present in both
 *
 * CI fails on `introduced`. `fixed` ratchets the baseline down. This lets
 * teams ship incremental accessibility improvements without needing to
 * eliminate the entire backlog before any gate can be enabled.
 */

import type { AuditResult, Violation } from "./types";

export const BASELINE_VERSION = 1;

export interface BaselineFingerprint {
  /** Rule id (e.g. "color-contrast"). */
  id: string;
  /** First CSS selector target of the violating node. */
  target: string;
  /** Impact at the time the baseline was captured. */
  impact: Violation["impact"];
}

export interface Baseline {
  version: number;
  createdAt: string;
  /**
   * Stable identifiers for every known violation node. The format is
   * intentionally a JSON-stable array of plain objects so that snapshots
   * diff cleanly in PRs.
   */
  fingerprints: BaselineFingerprint[];
}

export interface DiffResult {
  introduced: BaselineFingerprint[];
  fixed: BaselineFingerprint[];
  persisted: BaselineFingerprint[];
  /** True iff `introduced.length === 0`. */
  passed: boolean;
}

/**
 * Convert an {@link AuditResult} into a sorted list of fingerprints — one per
 * offending node, not per violation. Sorting guarantees stable diffs.
 */
export function fingerprints(result: AuditResult): BaselineFingerprint[] {
  const list: BaselineFingerprint[] = [];
  for (const v of result.violations) {
    for (const node of v.nodes) {
      list.push({
        id: v.id,
        target: node.target[0] ?? "",
        impact: v.impact,
      });
    }
  }
  return list.sort(compareFingerprint);
}

export function createBaseline(result: AuditResult): Baseline {
  return {
    version: BASELINE_VERSION,
    createdAt: new Date().toISOString(),
    fingerprints: fingerprints(result),
  };
}

/**
 * Diff a fresh audit against a baseline. Pure and deterministic.
 */
export function diffAgainstBaseline(
  baseline: Baseline,
  current: AuditResult
): DiffResult {
  const currentList = fingerprints(current);
  const baselineKeys = new Set(baseline.fingerprints.map(keyFor));
  const currentKeys = new Set(currentList.map(keyFor));

  const introduced = currentList.filter((f) => !baselineKeys.has(keyFor(f)));
  const fixed = baseline.fingerprints.filter((f) => !currentKeys.has(keyFor(f)));
  const persisted = currentList.filter((f) => baselineKeys.has(keyFor(f)));

  return {
    introduced,
    fixed,
    persisted,
    passed: introduced.length === 0,
  };
}

/**
 * Render a human-readable diff report suitable for CI logs or PR comments.
 */
export function formatDiff(diff: DiffResult): string {
  const lines: string[] = [];
  lines.push(`# Accessibility Baseline Diff`);
  lines.push("");
  lines.push(`- Introduced: **${diff.introduced.length}**`);
  lines.push(`- Fixed: **${diff.fixed.length}**`);
  lines.push(`- Persisted: **${diff.persisted.length}**`);
  lines.push("");

  if (diff.introduced.length > 0) {
    lines.push(`## New violations (${diff.introduced.length})`);
    for (const f of diff.introduced) {
      lines.push(`- \`${f.id}\` [${f.impact}] — \`${f.target}\``);
    }
    lines.push("");
  }

  if (diff.fixed.length > 0) {
    lines.push(`## Fixed since baseline (${diff.fixed.length})`);
    for (const f of diff.fixed) {
      lines.push(`- \`${f.id}\` [${f.impact}] — \`${f.target}\``);
    }
    lines.push("");
  }

  if (diff.introduced.length === 0) {
    lines.push(`No new violations.`);
  }

  return lines.join("\n");
}

/**
 * Parse a baseline JSON payload, validating shape. Returns null on invalid
 * input so the caller can distinguish "missing" from "corrupt".
 */
export function parseBaseline(raw: string): Baseline | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.version !== "number") return null;
  if (typeof obj.createdAt !== "string") return null;
  if (!Array.isArray(obj.fingerprints)) return null;
  for (const f of obj.fingerprints) {
    if (!f || typeof f !== "object") return null;
    const fp = f as Record<string, unknown>;
    if (typeof fp.id !== "string") return null;
    if (typeof fp.target !== "string") return null;
    if (typeof fp.impact !== "string") return null;
  }
  return obj as unknown as Baseline;
}

export function serializeBaseline(b: Baseline): string {
  return JSON.stringify(b, null, 2) + "\n";
}

// ---- internals --------------------------------------------------------------

function keyFor(f: BaselineFingerprint): string {
  return `${f.id}::${f.target}`;
}

function compareFingerprint(a: BaselineFingerprint, b: BaselineFingerprint): number {
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  if (a.target !== b.target) return a.target < b.target ? -1 : 1;
  return 0;
}
