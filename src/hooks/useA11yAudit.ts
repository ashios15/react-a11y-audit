import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { runAudit } from "../utils/auditor";
import type { AuditResult, AuditOptions } from "../types";

const EMPTY_RULES: readonly string[] = [];

export function useA11yAudit(options: AuditOptions = {}) {
  const { level = "AA", scope, rules, interval = 0 } = options;

  // Memoize the object passed to runAudit so a new `options` prop on each
  // render doesn't thrash the effect.
  const rulesKey = useMemo(
    () => (rules ?? EMPTY_RULES).join(","),
    [rules]
  );
  const auditOptions = useMemo<AuditOptions>(
    () => ({ level, scope, rules }),
    // `rulesKey` is the stable identity for `rules`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, scope, rulesKey]
  );

  const [result, setResult] = useState<AuditResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const audit = useCallback(async () => {
    setIsRunning(true);
    try {
      const auditResult = await runAudit(auditOptions);
      if (!cancelledRef.current) setResult(auditResult);
    } catch (err) {
      if (!cancelledRef.current) {
        // eslint-disable-next-line no-console
        console.error("[@ashios15/react-a11y-audit] Audit failed:", err);
      }
    } finally {
      if (!cancelledRef.current) setIsRunning(false);
    }
  }, [auditOptions]);

  useEffect(() => {
    cancelledRef.current = false;
    // SSR-safe: only run in browser.
    if (typeof document === "undefined") return;

    void audit();

    if (interval > 0) {
      intervalRef.current = setInterval(() => {
        void audit();
      }, interval);
    }

    return () => {
      cancelledRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [audit, interval]);

  const criticalCount =
    result?.violations.filter((v) => v.impact === "critical").length ?? 0;
  const seriousCount =
    result?.violations.filter((v) => v.impact === "serious").length ?? 0;

  return {
    result,
    isRunning,
    rerun: audit,
    criticalCount,
    seriousCount,
    score: result?.score ?? null,
  };
}
