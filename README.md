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
