import { describe, it, expect } from "vitest";
import {
  createBaseline,
  diffAgainstBaseline,
  fingerprints,
  formatDiff,
  parseBaseline,
  serializeBaseline,
  type Baseline,
} from "../src/baseline";
import type { AuditResult, Violation } from "../src/types";

function makeViolation(
  id: string,
  target: string,
  impact: Violation["impact"] = "serious"
): Violation {
  return {
    id,
    impact,
    description: `desc for ${id}`,
    help: `help for ${id}`,
    helpUrl: `https://example.com/${id}`,
    wcagTags: ["wcag2aa"],
    nodes: [
      { html: `<div>${id}</div>`, target: [target], failureSummary: "fail" },
    ],
  };
}

function makeAudit(violations: Violation[]): AuditResult {
  return {
    violations,
    passes: 10,
    incomplete: 0,
    timestamp: "2026-04-21T00:00:00.000Z",
    url: "http://localhost/",
    score: 95,
  };
}

describe("fingerprints", () => {
  it("returns one entry per offending node, sorted", () => {
    const audit = makeAudit([
      makeViolation("color-contrast", "#b"),
      makeViolation("aria-label", "#a"),
    ]);
    const fps = fingerprints(audit);
    expect(fps.map((f) => f.id)).toEqual(["aria-label", "color-contrast"]);
  });

  it("is stable across runs (same input -> same output)", () => {
    const audit = makeAudit([
      makeViolation("x", "#one"),
      makeViolation("x", "#two"),
    ]);
    expect(fingerprints(audit)).toEqual(fingerprints(audit));
  });

  it("falls back to empty target if none provided", () => {
    const audit = makeAudit([
      {
        ...makeViolation("foo", ""),
        nodes: [{ html: "", target: [], failureSummary: "" }],
      },
    ]);
    expect(fingerprints(audit)[0]?.target).toBe("");
  });
});

describe("diffAgainstBaseline", () => {
  it("classifies introduced, fixed, and persisted", () => {
    const baseline: Baseline = createBaseline(
      makeAudit([makeViolation("old-issue", "#a"), makeViolation("persistent", "#b")])
    );
    const current = makeAudit([
      makeViolation("persistent", "#b"),
      makeViolation("brand-new", "#c"),
    ]);
    const diff = diffAgainstBaseline(baseline, current);
    expect(diff.introduced.map((f) => f.id)).toEqual(["brand-new"]);
    expect(diff.fixed.map((f) => f.id)).toEqual(["old-issue"]);
    expect(diff.persisted.map((f) => f.id)).toEqual(["persistent"]);
    expect(diff.passed).toBe(false);
  });

  it("passes when no new violations are introduced", () => {
    const baseline = createBaseline(
      makeAudit([makeViolation("x", "#a"), makeViolation("y", "#b")])
    );
    const current = makeAudit([makeViolation("x", "#a")]);
    const diff = diffAgainstBaseline(baseline, current);
    expect(diff.introduced).toEqual([]);
    expect(diff.passed).toBe(true);
  });

  it("treats target changes as a new fingerprint", () => {
    const baseline = createBaseline(makeAudit([makeViolation("x", "#old")]));
    const current = makeAudit([makeViolation("x", "#new")]);
    const diff = diffAgainstBaseline(baseline, current);
    expect(diff.introduced).toHaveLength(1);
    expect(diff.fixed).toHaveLength(1);
  });
});

describe("formatDiff", () => {
  it("notes success when no new violations", () => {
    const baseline = createBaseline(makeAudit([]));
    const diff = diffAgainstBaseline(baseline, makeAudit([]));
    const out = formatDiff(diff);
    expect(out).toContain("No new violations.");
  });

  it("lists introduced and fixed sections when relevant", () => {
    const baseline = createBaseline(makeAudit([makeViolation("gone", "#a")]));
    const current = makeAudit([makeViolation("added", "#b", "critical")]);
    const out = formatDiff(diffAgainstBaseline(baseline, current));
    expect(out).toContain("New violations");
    expect(out).toContain("added");
    expect(out).toContain("critical");
    expect(out).toContain("Fixed since baseline");
    expect(out).toContain("gone");
  });
});

describe("serialize / parse", () => {
  it("round-trips a baseline", () => {
    const original = createBaseline(makeAudit([makeViolation("a", "#x")]));
    const parsed = parseBaseline(serializeBaseline(original));
    expect(parsed).toEqual(original);
  });

  it("returns null for malformed input", () => {
    expect(parseBaseline("not json")).toBeNull();
    expect(parseBaseline("{}")).toBeNull();
    expect(
      parseBaseline(
        JSON.stringify({ version: 1, createdAt: "x", fingerprints: [{ bad: true }] })
      )
    ).toBeNull();
  });
});
