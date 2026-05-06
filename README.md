# @ashios15/react-a11y-audit

> **Live dev overlay + CI baseline-diff ratchet** for React apps. Axe-core under the hood, WCAG 2.2 AA out of the box, and a CLI that fails the build **only on newly-introduced violations** — not your existing backlog.

[![npm](https://img.shields.io/npm/v/@ashios15/react-a11y-audit.svg)](https://www.npmjs.com/package/@ashios15/react-a11y-audit)
[![CI](https://img.shields.io/badge/CI-baseline%20diff-blue)](#ci-the-baseline-ratchet)
[![WCAG](https://img.shields.io/badge/WCAG-2.2_AA-green)](https://www.w3.org/WAI/WCAG22/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

## Why another a11y tool?

Most teams flip on axe-core, see 200 violations, disable the CI check, and promise to "clean it up later." **You never do.**

This library treats accessibility the way good engineering teams treat tech debt:

1. Capture today's violations as a **baseline** (a deterministic snapshot, committed to the repo).
2. On every PR, diff the fresh audit against that baseline.
3. Fail the build only on **new** violations. Old ones stay tracked but don't block.
4. When someone fixes an old violation, `a11y-baseline accept` ratchets the baseline down — the fix is locked in; regressions on it will fail from that point forward.

You go from an all-or-nothing gate to a one-way ratchet. A11y actually gets better.

## Install

```bash
npm install @ashios15/react-a11y-audit
```

## Dev: live overlay

```tsx
import { useA11yAudit, A11yOverlay } from "@ashios15/react-a11y-audit";

function App() {
  const { result, isRunning, rerun } = useA11yAudit({
    level: "AA",
    interval: 5000,
  });

  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === "development" && (
        <A11yOverlay result={result} isRunning={isRunning} onRerun={rerun} />
      )}
    </>
  );
}
```

A floating widget pins to the bottom-right, shows the WCAG score and violation count, and expands to reveal each issue grouped by impact. Updates as the DOM changes.

## CI: the baseline ratchet

The `a11y-baseline` CLI is **input-agnostic** — it reads an `AuditResult` JSON on stdin. Produce it however you like (Playwright + axe-core is the common path). The CLI is just the state machine.

```bash
# 1. Once, per app: capture today's backlog.
node runner.mjs | npx a11y-baseline save

# 2. On every PR:
node runner.mjs | npx a11y-baseline check   # exit 2 if anything new

# 3. When a PR fixes old issues, ratchet the baseline down:
node runner.mjs | npx a11y-baseline accept
git add a11y-baseline.json && git commit -m "chore(a11y): ratchet"
```

Exit codes:

| Code | Meaning |
|---|---|
| `0` | No new violations. CI passes. |
| `2` | New violations introduced. CI fails with a per-violation list. |
| `1` | Usage error (bad stdin, missing baseline, …). |

### Example Playwright runner

```ts
// scripts/a11y-runner.mjs
import { chromium } from "playwright";
import axe from "axe-core";
import fs from "node:fs/promises";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(process.env.URL ?? "http://localhost:3000");
await page.addScriptTag({ content: await fs.readFile(require.resolve("axe-core"), "utf8") });

const raw = await page.evaluate(async () => {
  const results = await (window).axe.run({ runOnly: { type: "tag", values: ["wcag2aa", "wcag22aa"] } });
  return {
    violations: results.violations.map((v) => ({
      id: v.id, impact: v.impact, description: v.description,
      help: v.help, helpUrl: v.helpUrl,
      wcagTags: v.tags.filter((t) => t.startsWith("wcag")),
      nodes: v.nodes.map((n) => ({ html: n.html, target: n.target.map(String), failureSummary: n.failureSummary ?? "" })),
    })),
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    timestamp: new Date().toISOString(),
    url: location.href,
    score: 0,
  };
});
await browser.close();
process.stdout.write(JSON.stringify(raw));
```

Then wire it into GitHub Actions:

```yaml
- run: node scripts/a11y-runner.mjs | npx a11y-baseline check
```

### Programmatic baseline API

For non-CLI workflows (custom runners, dashboards), import the pure functions directly — no React, no DOM:

```ts
import {
  createBaseline,
  diffAgainstBaseline,
  formatDiff,
} from "@ashios15/react-a11y-audit/baseline";

const baseline = createBaseline(previousResult);
const diff = diffAgainstBaseline(baseline, currentResult);
console.log(formatDiff(diff));
if (!diff.passed) process.exit(2);
```

## API

| Export | Description |
|---|---|
| `useA11yAudit(options)` | React hook. Returns `{ result, isRunning, rerun, score, criticalCount, seriousCount }`. SSR-safe. |
| `<A11yOverlay />` | Floating dev widget. |
| `<A11yReport />` | Printable summary with Markdown/JSON export. |
| `runAudit(options)` | Pure function. Runs axe-core against the current document. |
| `generateReport(result)` | Markdown report for humans. |
| `createBaseline(result)` | Snapshot of current violations. |
| `diffAgainstBaseline(baseline, current)` | Returns `{ introduced, fixed, persisted, passed }`. |
| `formatDiff(diff)` | Markdown render of a diff. |
| `parseBaseline(raw)` / `serializeBaseline(b)` | JSON I/O helpers. |

### `AuditOptions`

```ts
interface AuditOptions {
  level?: "A" | "AA" | "AAA";   // default "AA" (WCAG 2.2)
  rules?: string[];              // specific axe rule ids; empty = all
  scope?: string;                // CSS selector to scope the audit
  interval?: number;             // auto re-audit ms (0 = manual only)
}
```

## Fingerprint format

A fingerprint is the minimal identity of a violation that survives cosmetic changes:

```ts
{ id: "color-contrast", target: "#header > button:nth-child(2)", impact: "serious" }
```

Same rule + same selector → same fingerprint → counts as the "same" issue across runs. Change the selector (element moved) or rule → new fingerprint → counts as new.

## Tests

10 unit tests cover the baseline-diff logic — fingerprint stability, introduced/fixed/persisted classification, round-trip serialization, and malformed-input handling. Run with `npm test`.

## License

MIT © [ashios15](https://github.com/ashios15)
# React A11y Audit

Drop-in **React accessibility audit toolkit** powered by [axe-core](https://github.com/dequelabs/axe-core). Provides hooks, a live overlay, and exportable WCAG 2.2 compliance reports.

![React](https://img.shields.io/badge/React-18%2F19-blue?logo=react)
![axe-core](https://img.shields.io/badge/axe--core-4.9-6B21A8)
![WCAG](https://img.shields.io/badge/WCAG-2.2_AA-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)

## Quick Start

```tsx
import { useA11yAudit, A11yOverlay } from "@ashios15/react-a11y-audit";

function App() {
  const { result, isRunning, rerun, score } = useA11yAudit({
    level: "AA",        // WCAG conformance level
    interval: 5000,     // Re-audit every 5 seconds
  });

  return (
    <>
      <YourApp />
      {/* Floating overlay shows violations in dev */}
      <A11yOverlay result={result} isRunning={isRunning} onRerun={rerun} />
    </>
  );
}
```

## Features

| Feature | Description |
|---|---|
| `useA11yAudit()` hook | Runs axe-core, returns violations, score, counts |
| `<A11yOverlay />` | Floating widget showing live violations with impact colors |
| `<A11yReport />` | Summary table with download (Markdown) and copy (JSON) |
| `generateReport()` | Pure function for CI pipelines — outputs Markdown |
| WCAG level support | A, AA, or AAA conformance levels |
| Scoped audits | Limit checks to specific CSS selectors |
| Auto re-audit | Configurable interval for catching dynamic content issues |

## Architecture

```
src/
├── index.ts                    # Public API
├── types.ts                    # Violation, AuditResult, AuditOptions
├── hooks/
│   └── useA11yAudit.ts         # Core hook wrapping axe-core
├── utils/
│   └── auditor.ts              # runAudit() + generateReport()
└── components/
    ├── A11yOverlay.tsx          # Dev overlay with expandable violations
    └── A11yReport.tsx           # Summary table + export buttons
```

## CI Integration

```bash
# In your test suite
import { runAudit, generateReport } from "@ashios15/react-a11y-audit";

test("page meets WCAG AA", async () => {
  const result = await runAudit({ level: "AA" });
  expect(result.violations).toHaveLength(0);
});
```

## License

MIT
