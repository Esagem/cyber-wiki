// src/log.ts
//
// Auto-changelog helpers shared by every mutating tool. The format and the
// concurrent-write-retry behavior are the same across wiki_write, wiki_edit,
// wiki_status_set, and wiki_delete — extracted here so they can't drift.

import {
  ConcurrentWriteError,
  NotFoundError,
  readPage,
  writePage,
  type GitHubConfig,
} from "./github";
import { todayUtc } from "./frontmatter";

const LOG_PATH = "_log.md";
const LOG_HEADER = "# Wiki Log\n\nAppend-only chronological record. Most recent at the bottom.\n";

export type LogOp =
  | "write"
  | "edit"
  | "status"
  | "delete"
  | "ingest"
  | "session"
  | "spec"
  | "lint"
  | "schema";

/**
 * Append a log entry. Returns a short status string for the caller to surface
 * to the LLM. Best-effort: a failed log append does NOT fail the primary
 * operation. We retry once on a concurrent-write conflict because every LLM
 * mutation touches _log.md and contention is the common case.
 */
export async function appendToLog(
  cfg: GitHubConfig,
  op: LogOp,
  context: string,
  description: string,
): Promise<string> {
  const sanitizedDescription = sanitizeDescription(description);
  const date = todayUtc();
  const line = `\n## [${date}] ${op} | ${context} | ${sanitizedDescription}\n`;

  const doAppend = async (): Promise<void> => {
    let existing: string;
    try {
      existing = (await readPage(cfg, LOG_PATH)).text;
    } catch (e) {
      if (e instanceof NotFoundError) {
        existing = LOG_HEADER;
      } else {
        throw e;
      }
    }
    const newLog = existing.endsWith("\n") ? existing + line : existing + "\n" + line;
    await writePage(cfg, LOG_PATH, newLog, `log: ${date} ${op} ${context}`);
  };

  try {
    await doAppend();
    return "log updated";
  } catch (e) {
    if (e instanceof ConcurrentWriteError) {
      try {
        await doAppend();
        return "log updated (retried)";
      } catch (e2) {
        return `log append failed after retry: ${(e2 as Error).message}`;
      }
    }
    return `log append failed: ${(e as Error).message}`;
  }
}

/**
 * Strip pipe characters from the description so they don't break the
 * `## [date] op | ctx | desc` parse contract. Replace with a dash.
 */
function sanitizeDescription(description: string): string {
  if (!description) return "(no description)";
  return description.replace(/\|/g, "-").replace(/\r?\n/g, " ").trim();
}

// ---------- Tail / parse ----------------------------------------------------

export interface LogEntry {
  date: string;
  op: string;
  context: string;
  description: string;
}

const ENTRY_RE = /^##\s+\[(\d{4}-\d{2}-\d{2})\]\s+(\S+)\s+\|\s+(.+?)\s+\|\s+(.*?)\s*$/gm;

/**
 * Parse all entries in _log.md as structured records. Order is the file's
 * order (oldest first); the tail/filter step reverses as needed.
 */
export function parseLog(text: string): LogEntry[] {
  const out: LogEntry[] = [];
  ENTRY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ENTRY_RE.exec(text)) !== null) {
    out.push({
      date: m[1],
      op: m[2],
      context: m[3].trim(),
      description: m[4].trim(),
    });
  }
  return out;
}

export interface TailFilter {
  ops?: Set<string>;
  sinceDate?: string;
}

/**
 * Walk the log from newest entry backward, applying filters, accumulating up
 * to `n` matching entries. Returns them newest-first.
 */
export function tail(entries: LogEntry[], n: number, filter: TailFilter): LogEntry[] {
  const out: LogEntry[] = [];
  for (let i = entries.length - 1; i >= 0 && out.length < n; i--) {
    const e = entries[i];
    if (filter.ops && !filter.ops.has(e.op)) continue;
    if (filter.sinceDate && e.date < filter.sinceDate) continue;
    out.push(e);
  }
  return out;
}
