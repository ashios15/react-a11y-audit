#!/usr/bin/env node
/**
 * a11y-baseline CLI — manage accessibility baselines in CI.
 *
 *   a11y-baseline save   < audit.json          # create/overwrite baseline
 *   a11y-baseline check  < audit.json          # diff vs baseline, non-zero exit on new violations
 *   a11y-baseline accept < audit.json          # ratchet: fold fixed ones out of baseline
 *
 * Input is an {@link AuditResult} on stdin (JSON). Produce it however you
 * like — Playwright + axe-core, Puppeteer, a real browser Snapshot — this
 * tool just cares about the shape.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createBaseline,
  diffAgainstBaseline,
  formatDiff,
  parseBaseline,
  serializeBaseline,
} from "./baseline";
import type { AuditResult } from "./types";

const DEFAULT_PATH = "a11y-baseline.json";

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new Error(
      "Expected an AuditResult JSON on stdin. Example:\n  node runner.mjs | a11y-baseline check"
    );
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseAudit(raw: string): AuditResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON on stdin: ${(err as Error).message}`);
  }
  if (!value || typeof value !== "object") {
    throw new Error("Expected AuditResult object on stdin");
  }
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.violations)) {
    throw new Error("AuditResult.violations is required");
  }
  return value as AuditResult;
}

function parseArgs(argv: string[]): { command: string; path: string } {
  const command = argv[0] ?? "";
  let path = DEFAULT_PATH;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if ((a === "--baseline" || a === "-b") && argv[i + 1]) {
      path = argv[i + 1] as string;
      i++;
    }
  }
  return { command, path: resolve(process.cwd(), path) };
}

function usage(): string {
  return [
    "Usage:",
    "  a11y-baseline save   [--baseline <path>] < audit.json",
    "  a11y-baseline check  [--baseline <path>] < audit.json",
    "  a11y-baseline accept [--baseline <path>] < audit.json",
    "",
    "Exit codes:",
    "  0 — success (no new violations on `check`)",
    "  1 — usage error",
    "  2 — new violations introduced",
  ].join("\n");
}

async function main(): Promise<number> {
  const { command, path } = parseArgs(process.argv.slice(2));

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage() + "\n");
    return command ? 0 : 1;
  }

  if (command === "save") {
    const audit = parseAudit(await readStdin());
    const baseline = createBaseline(audit);
    writeFileSync(path, serializeBaseline(baseline), "utf8");
    process.stdout.write(
      `Baseline saved to ${path} with ${baseline.fingerprints.length} fingerprint(s).\n`
    );
    return 0;
  }

  if (command === "check" || command === "accept") {
    if (!existsSync(path)) {
      process.stderr.write(
        `No baseline found at ${path}. Run \`a11y-baseline save\` first.\n`
      );
      return 1;
    }
    const baseline = parseBaseline(readFileSync(path, "utf8"));
    if (!baseline) {
      process.stderr.write(`Baseline at ${path} is corrupt or invalid.\n`);
      return 1;
    }
    const audit = parseAudit(await readStdin());
    const diff = diffAgainstBaseline(baseline, audit);
    process.stdout.write(formatDiff(diff) + "\n");

    if (command === "accept") {
      const next = createBaseline(audit);
      writeFileSync(path, serializeBaseline(next), "utf8");
      process.stdout.write(`Baseline updated: ${path}\n`);
      return 0;
    }

    return diff.passed ? 0 : 2;
  }

  process.stderr.write(`Unknown command: ${command}\n\n${usage()}\n`);
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[a11y-baseline] ${msg}\n`);
    process.exit(1);
  });
