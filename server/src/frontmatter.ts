// src/frontmatter.ts
//
// Targeted YAML front matter parser/serializer.
//
// We don't pull in a full YAML library. The CYBER.md §4 schema has a small,
// stable set of fields and pages are LLM-authored against that schema, so a
// line-based parser is enough — and it preserves the original line order and
// formatting verbatim for any field we don't touch, which Obsidian users
// notice. Multi-line block lists (e.g. `sources:\n  - foo`) are parsed as
// opaque blocks: we identify their boundaries so we don't accidentally edit
// inside them, but we don't decode the contents.
//
// Fields the schema actually mutates via wiki_status_set are scalars or the
// `tags` inline array. For tags we support both the canonical inline form
// (`tags: [a, b, c]`) and refuse multi-line block form with a clear error.
//
// All character offsets are into the original full page text.

export interface FrontMatterField {
  key: string;
  /** Index in innerLines where this field starts. */
  lineIdx: number;
  /** For multi-line block fields (block scalars or block lists), the index of
   *  the last line inclusive. For single-line fields this equals lineIdx. */
  endLineIdx: number;
  /** The raw line(s), joined with \n (no trailing newline). */
  rawBlock: string;
  /** For single-line fields: text after the first `:`. Trimmed. Empty otherwise. */
  rawInlineValue: string;
}

export interface ParsedFrontMatter {
  hasFrontMatter: boolean;
  /** Always 0 if hasFrontMatter, else -1. */
  fmStartChar: number;
  /** Character index immediately after the closing `---\n` line.
   *  Body content begins at fmEndChar. -1 if no front matter. */
  fmEndChar: number;
  /** Lines between the opening and closing `---` markers, no `---` themselves. */
  innerLines: string[];
  /** Map keyed by field name (lower-case, original casing preserved in rawBlock). */
  fields: Map<string, FrontMatterField>;
  /** The body text after the front matter (everything from fmEndChar onward). */
  body: string;
}

/**
 * Locate the YAML front matter block at the start of a page and parse the
 * recognized scalar/list fields. The parser is lenient — fields it doesn't
 * recognize (or block forms it can't handle) are still preserved in
 * innerLines, just not in the fields map.
 */
export function parseFrontMatter(text: string): ParsedFrontMatter {
  // The opening fence must be the very first line. We tolerate a leading BOM.
  const stripped = text.startsWith("﻿") ? text.slice(1) : text;
  const bomOffset = text.length - stripped.length;

  if (!stripped.startsWith("---\n") && !stripped.startsWith("---\r\n")) {
    return {
      hasFrontMatter: false,
      fmStartChar: -1,
      fmEndChar: -1,
      innerLines: [],
      fields: new Map(),
      body: text,
    };
  }

  // Find the closing fence — a line that is exactly `---` (with optional
  // trailing horizontal whitespace, then a newline or EOF). Importantly, we
  // do NOT consume the newline-of-the-blank-line-after-the-fence: that needs
  // to land in the body, not in the front matter region.
  const openFenceLen = stripped.startsWith("---\r\n") ? 5 : 4;
  const afterOpen = stripped.slice(openFenceLen);
  const closingMatch = afterOpen.match(/^---[ \t]*(\r?\n|$)/m);
  if (!closingMatch || closingMatch.index === undefined) {
    return {
      hasFrontMatter: false,
      fmStartChar: -1,
      fmEndChar: -1,
      innerLines: [],
      fields: new Map(),
      body: text,
    };
  }

  const innerEnd = closingMatch.index; // offset within afterOpen
  const innerText = afterOpen.slice(0, innerEnd);
  // Trim a single trailing newline before the --- so the inner text doesn't
  // carry a phantom empty line.
  const cleanInner = innerText.replace(/\r?\n$/, "");
  const innerLines = cleanInner.length === 0 ? [] : cleanInner.split(/\r?\n/);

  // fmEndChar = position right after the closing fence's newline (or EOF).
  const closingFenceLen = closingMatch[0].length;
  const fmEndChar = bomOffset + openFenceLen + innerEnd + closingFenceLen;

  const fields = parseFields(innerLines);

  return {
    hasFrontMatter: true,
    fmStartChar: bomOffset,
    fmEndChar,
    innerLines,
    fields,
    body: text.slice(fmEndChar),
  };
}

function parseFields(innerLines: string[]): Map<string, FrontMatterField> {
  const fields = new Map<string, FrontMatterField>();
  for (let i = 0; i < innerLines.length; i++) {
    const line = innerLines[i];
    // Skip blanks and comments.
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;
    // Field lines start at column 0 with `key:`.
    const m = line.match(/^([A-Za-z_][\w\-]*)\s*:(.*)$/);
    if (!m) continue;
    const key = m[1];
    const rest = m[2];
    const rawInlineValue = rest.trim();

    // Multi-line block? Detect by looking at subsequent lines indented or
    // beginning with `- `. We consume until we hit a top-level field line, a
    // blank line at the end, or end of front matter.
    let endLineIdx = i;
    if (rawInlineValue === "" || rawInlineValue === "|" || rawInlineValue === ">") {
      // Greedy block: consume any indented or `-`-prefixed lines.
      while (endLineIdx + 1 < innerLines.length) {
        const next = innerLines[endLineIdx + 1];
        if (/^\s+\S/.test(next) || /^-\s/.test(next)) {
          endLineIdx++;
        } else if (/^\s*$/.test(next)) {
          // A blank inside a block — peek further; if the line after is still
          // indented, keep going, else stop here.
          if (
            endLineIdx + 2 < innerLines.length &&
            /^\s+\S/.test(innerLines[endLineIdx + 2])
          ) {
            endLineIdx++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    const rawBlock = innerLines.slice(i, endLineIdx + 1).join("\n");
    fields.set(key, { key, lineIdx: i, endLineIdx, rawBlock, rawInlineValue });
    i = endLineIdx;
  }
  return fields;
}

// ---------- Inline value codecs ---------------------------------------------

/**
 * Decode a YAML inline scalar: handles quoted strings, plain strings, and
 * empty values. Returns the unquoted string. We do not interpret YAML special
 * tokens like `null`/`true`/`false` — wiki fields are all strings or arrays.
 */
export function decodeScalar(raw: string): string {
  const v = raw.trim();
  if (v === "") return "";
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

/**
 * Decode a YAML inline list `[a, b, c]`. Returns null if `raw` doesn't look
 * like an inline list (e.g. it's a multi-line block form, which the caller
 * should detect separately and reject).
 */
export function decodeInlineList(raw: string): string[] | null {
  const v = raw.trim();
  if (!v.startsWith("[") || !v.endsWith("]")) return null;
  const inner = v.slice(1, -1).trim();
  if (inner === "") return [];
  // Naive split on commas. Wiki tags don't contain commas; if they ever do,
  // this needs upgrading.
  return inner.split(",").map((t) => decodeScalar(t));
}

/**
 * Encode a string array as an inline YAML list. Quoting only when needed.
 */
export function encodeInlineList(items: string[]): string {
  if (items.length === 0) return "[]";
  return "[" + items.map(encodeScalarValue).join(", ") + "]";
}

/**
 * Encode a scalar for inline use. Quotes when the value has special chars or
 * is empty, otherwise leaves it bare to match human-edited Obsidian style.
 */
export function encodeScalarValue(s: string): string {
  if (s === "") return '""';
  // Bare-allowed: alphanumerics, dash, underscore, dot, slash, colon-followed-by-non-space.
  // Wiki tag and category values are all bare-safe; quote anything else to be
  // robust against YAML's parsing rules.
  if (/^[A-Za-z0-9_./-][A-Za-z0-9_./\-]*$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  // Use double quotes; escape backslashes and embedded double-quotes.
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

// ---------- Serialization helpers -------------------------------------------

/**
 * Re-serialize a front matter block from its inner lines + the body.
 * The body is appended verbatim — its leading characters (typically a `\n`
 * blank-line separator) are preserved so a parse → mutate → reassemble cycle
 * is bit-identical when nothing changes.
 */
export function reassemble(innerLines: string[], body: string): string {
  const inner = innerLines.length === 0 ? "" : innerLines.join("\n");
  return "---\n" + inner + (inner ? "\n" : "") + "---\n" + body;
}

/**
 * Replace a single-line scalar field's value, preserving the line's "key:"
 * spacing exactly. If the field doesn't exist, append a new line just before
 * the end of innerLines.
 */
export function setScalarField(
  innerLines: string[],
  fields: Map<string, FrontMatterField>,
  key: string,
  rawValue: string,
): string[] {
  const out = innerLines.slice();
  const f = fields.get(key);
  if (f && f.lineIdx === f.endLineIdx) {
    // Preserve the original `key:` prefix (handles `key :`, `key:  `, etc.).
    const original = out[f.lineIdx];
    const m = original.match(/^([A-Za-z_][\w\-]*\s*:\s*)/);
    const prefix = m ? m[1] : `${key}: `;
    out[f.lineIdx] = `${prefix}${rawValue}`;
  } else if (f) {
    // Multi-line block form: refuse to surgically rewrite. Caller should
    // detect this case and return an error.
    throw new Error(
      `field '${key}' uses multi-line YAML form which this tool cannot mutate; ` +
      `switch to inline form (e.g. \`${key}: value\`) and retry`,
    );
  } else {
    // Append before the end. (No closing --- in innerLines, so just push.)
    out.push(`${key}: ${rawValue}`);
  }
  return out;
}

// ---------- updated: auto-bump ----------------------------------------------

/** Today in UTC, YYYY-MM-DD. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Bump the `updated:` field in the front matter to today's UTC date.
 * If the page has no front matter, returns the text unchanged. If the page
 * has front matter but no `updated:` field, returns the text unchanged
 * (synthesizing one would be a schema violation in the other direction).
 */
export function bumpUpdatedField(text: string): string {
  const fm = parseFrontMatter(text);
  if (!fm.hasFrontMatter) return text;
  const f = fm.fields.get("updated");
  if (!f || f.lineIdx !== f.endLineIdx) return text;
  const today = todayUtc();
  const newInner = setScalarField(fm.innerLines, fm.fields, "updated", today);
  // Skip rewrite if the date is already today — saves a needless commit-distinct
  // identical-content GitHub call. (We still rewrite if someone else changed
  // unrelated lines; the caller controls the rest of the working text.)
  if (newInner.join("\n") === fm.innerLines.join("\n")) return text;
  return reassemble(newInner, fm.body);
}
