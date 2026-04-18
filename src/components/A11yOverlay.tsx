import React, { useState } from "react";
import type { AuditResult } from "../types";

interface A11yOverlayProps {
  result: AuditResult | null;
  isRunning: boolean;
  onRerun: () => void;
}

const impactColors: Record<string, string> = {
  critical: "#dc2626",
  serious: "#ea580c",
  moderate: "#ca8a04",
  minor: "#2563eb",
};

export function A11yOverlay({ result, isRunning, onRerun }: A11yOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!result) return null;

  const violationCount = result.violations.length;
  const badgeColor =
    violationCount === 0
      ? "#16a34a"
      : violationCount > 3
        ? "#dc2626"
        : "#ea580c";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 99999,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 14,
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: badgeColor,
          color: "#fff",
          border: "none",
          borderRadius: 9999,
          padding: "8px 16px",
          cursor: "pointer",
          fontWeight: 600,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
        aria-label={`Accessibility audit: ${violationCount} violations found. Click to ${isOpen ? "close" : "open"} details.`}
      >
        {isRunning ? "Scanning…" : `A11y: ${result.score}/100`}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Accessibility audit results"
          style={{
            position: "absolute",
            bottom: 48,
            right: 0,
            width: 420,
            maxHeight: 500,
            background: "#1a1a2e",
            color: "#e5e5e5",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            overflow: "auto",
          }}
        >
          <div style={{ padding: 16, borderBottom: "1px solid #333" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 16 }}>
                Accessibility Audit ({violationCount} issues)
              </h2>
              <button
                onClick={onRerun}
                disabled={isRunning}
                style={{
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 12px",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  fontSize: 12,
                }}
              >
                {isRunning ? "Running…" : "Re-run"}
              </button>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
              Score: {result.score}/100 • {result.passes} passed •{" "}
              {result.incomplete} incomplete
            </p>
          </div>

          <div style={{ padding: 8 }}>
            {result.violations.length === 0 && (
              <p style={{ padding: 16, textAlign: "center", color: "#16a34a" }}>
                No violations found!
              </p>
            )}
            {result.violations.map((v) => (
              <details
                key={v.id}
                style={{
                  margin: "4px 0",
                  borderRadius: 8,
                  background: "#16213e",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: impactColors[v.impact] ?? "#888",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 500, fontSize: 13 }}>
                    {v.help}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: impactColors[v.impact] ?? "#888",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    {v.impact}
                  </span>
                </summary>
                <div style={{ padding: "4px 12px 12px", fontSize: 12 }}>
                  <p style={{ color: "#aaa" }}>{v.description}</p>
                  <p>
                    <a
                      href={v.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#60a5fa", textDecoration: "underline" }}
                    >
                      Learn more →
                    </a>
                  </p>
                  {v.nodes.map((node, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#0f172a",
                        borderRadius: 6,
                        padding: 8,
                        marginTop: 4,
                      }}
                    >
                      <code
                        style={{
                          fontSize: 11,
                          color: "#f472b6",
                          wordBreak: "break-all",
                        }}
                      >
                        {node.html}
                      </code>
                      <p style={{ marginTop: 4, color: "#94a3b8" }}>
                        {node.failureSummary}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
