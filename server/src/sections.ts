// src/sections.ts
//
// Markdown section parser and slicer. Used by wiki_read (section= param) and
// wiki_read_many to return just the requested section(s) of a page rather
// than the whole thing.
//
// Conventions:
// - Headers are ATX-style (`#`, `##`, ...). Setext headers are not supported
//   — the wiki uses ATX exclusively.
// - A section runs from its header line through (but not including) the next
//   header at the same or higher level. Subsections are included.
// - Header text matching is case-insensitive and whitespace-trimmed.
// - A `section` argument like `"## Modes"` pins the level: only level-2
//   headers named "Modes" match. Without leading hashes, any level matches.

export interface MarkdownHeader {
  level: number;
  text: string;
  /** Character offset in the body string where this header line starts. */
  offset: number;
  /** Character offset where the next line after this header starts. */
  contentStart: number;
}

const HEADER_RE = /^(#{1,6})\s+(.+?)\s*$/gm;

export function parseHeaders(body: string): MarkdownHeader[] {
  const headers: MarkdownHeader[] = [];
  HEADER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HEADER_RE.exec(body)) !== null) {
    const offset = m.index;
    const contentStart = offset + m[0].length + 1; // +1 for the trailing \n (or EOF approx)
    headers.push({
      level: m[1].length,
      text: m[2].trim(),
      offset,
      contentStart,
    });
  }
  return headers;
}

export interface SectionSpec {
  /** Required header level (1-6), or undefined to match any level. */
  level?: number;
  /** Header text to match (case-insensitive, trimmed). */
  text: string;
  /** Original spec string, for error messages. */
  raw: string;
}

export function parseSectionSpec(raw: string): SectionSpec {
  const m = raw.match(/^(#+)?\s*(.+?)\s*$/);
  if (!m) return { text: raw.trim(), raw };
  const level = m[1] ? m[1].length : undefined;
  return { level, text: m[2].trim(), raw };
}

/**
 * Slice the body into the section(s) matching `spec`. Returns null if no
 * header matches. The returned slice spans from the matched header line
 * through (but excluding) the next same-or-higher-level header (or EOF).
 *
 * For a multi-section caller, use sliceSections().
 */
export function sliceSection(body: string, spec: SectionSpec): string | null {
  const headers = parseHeaders(body);
  const idx = findHeaderIndex(headers, spec);
  if (idx === -1) return null;
  return extentFor(headers, idx, body);
}

/**
 * Slice multiple sections. Returns the slices in document order with a
 * `\n\n---\n\n` divider between them. Sections that don't match are reported
 * via the missing[] array.
 */
export function sliceSections(
  body: string,
  specs: SectionSpec[],
): { combined: string; missing: SectionSpec[] } {
  const headers = parseHeaders(body);
  const found: { offset: number; slice: string }[] = [];
  const missing: SectionSpec[] = [];
  for (const s of specs) {
    const idx = findHeaderIndex(headers, s);
    if (idx === -1) {
      missing.push(s);
      continue;
    }
    found.push({ offset: headers[idx].offset, slice: extentFor(headers, idx, body) });
  }
  found.sort((a, b) => a.offset - b.offset);
  const combined = found.map((f) => f.slice.replace(/\s+$/, "")).join("\n\n---\n\n");
  return { combined, missing };
}

function findHeaderIndex(headers: MarkdownHeader[], spec: SectionSpec): number {
  const wanted = spec.text.toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    if (spec.level !== undefined && headers[i].level !== spec.level) continue;
    if (headers[i].text.toLowerCase() === wanted) return i;
  }
  return -1;
}

function extentFor(headers: MarkdownHeader[], idx: number, body: string): string {
  const h = headers[idx];
  let endOffset = body.length;
  for (let j = idx + 1; j < headers.length; j++) {
    if (headers[j].level <= h.level) {
      endOffset = headers[j].offset;
      break;
    }
  }
  return body.slice(h.offset, endOffset);
}

/** Top-level (`##`) headers, for the helpful "available sections" hint. */
export function listTopLevelSections(body: string): string[] {
  return parseHeaders(body)
    .filter((h) => h.level === 2)
    .map((h) => h.text);
}
