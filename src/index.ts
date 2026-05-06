export { useA11yAudit } from "./hooks/useA11yAudit";
export { A11yOverlay } from "./components/A11yOverlay";
export { A11yReport } from "./components/A11yReport";
export { runAudit, generateReport } from "./utils/auditor";
export type { AuditResult, Violation, ViolationNode, AuditOptions } from "./types";

// Baseline API is also available via the top-level entry for convenience,
// but CI consumers should prefer `import … from "@ashios15/react-a11y-audit/baseline"`
// which doesn't pull in React.
export {
  createBaseline,
  diffAgainstBaseline,
  formatDiff,
  fingerprints,
  parseBaseline,
  serializeBaseline,
  BASELINE_VERSION,
} from "./baseline";
export type { Baseline, BaselineFingerprint, DiffResult } from "./baseline";
