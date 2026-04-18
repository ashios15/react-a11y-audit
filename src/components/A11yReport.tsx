import React from "react";
import type { AuditResult } from "../types";
import { generateReport } from "../utils/auditor";

interface A11yReportProps {
  result: AuditResult;
}

export function A11yReport({ result }: A11yReportProps) {
  const handleDownload = () => {
    const markdown = generateReport(result);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `a11y-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = async () => {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>Audit Summary</h3>
      <table
        role="table"
        style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "1px solid #ddd",
              }}
            >
              Metric
            </th>
            <th
              style={{
                textAlign: "right",
                padding: 8,
                borderBottom: "1px solid #ddd",
              }}
            >
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: 8 }}>Score</td>
            <td style={{ padding: 8, textAlign: "right", fontWeight: 700 }}>
              {result.score}/100
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8 }}>Violations</td>
            <td
              style={{
                padding: 8,
                textAlign: "right",
                color: result.violations.length ? "#dc2626" : "#16a34a",
              }}
            >
              {result.violations.length}
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8 }}>Passes</td>
            <td style={{ padding: 8, textAlign: "right", color: "#16a34a" }}>
              {result.passes}
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8 }}>Incomplete</td>
            <td style={{ padding: 8, textAlign: "right" }}>
              {result.incomplete}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={handleDownload}>Download Markdown Report</button>
        <button onClick={handleCopyJSON}>Copy JSON to Clipboard</button>
      </div>
    </div>
  );
}
