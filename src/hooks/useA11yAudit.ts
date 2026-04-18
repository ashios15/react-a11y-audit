import { useState, useEffect, useCallback, useRef } from "react";
import { runAudit } from "../utils/auditor";
import type { AuditResult, AuditOptions } from "../types";

export function useA11yAudit(options: AuditOptions = {}) {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const audit = useCallback(async () => {
    setIsRunning(true);
    try {
      const auditResult = await runAudit(options);
      setResult(auditResult);
    } catch (err) {
      console.error("[a11y-audit] Audit failed:", err);
    } finally {
      setIsRunning(false);
    }
  }, [options.level, options.scope, options.rules?.join(",")]);

  useEffect(() => {
    // Run initial audit
    audit();

    // Set up interval if configured
    if (options.interval && options.interval > 0) {
      intervalRef.current = setInterval(audit, options.interval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [audit, options.interval]);

  const criticalCount = result?.violations.filter((v) => v.impact === "critical").length ?? 0;
  const seriousCount = result?.violations.filter((v) => v.impact === "serious").length ?? 0;

  return {
    result,
    isRunning,
    rerun: audit,
    criticalCount,
    seriousCount,
    score: result?.score ?? null,
  };
}
