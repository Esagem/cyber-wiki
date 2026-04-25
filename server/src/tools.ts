// src/tools.ts
//
// Tool implementations. Each exported `toolXxx` function corresponds to one
// MCP tool and returns the structured payload the MCP transport layer wraps
// in `{ content: [...] }`. Splitting the implementations out of index.ts
// keeps the JSON-RPC plumbing small and lets the dispatch be table-driven.

import {
  ConcurrentWriteError,
  NotFoundError,
  deletePage,
  listPages,
  readPage,
  readPageFresh,
  writePage,
  type GitHubConfig,
} from "./github";
import {
  bumpUpdatedField,
  decodeInlineList,
  decodeScalar,
  encodeInlineList,
  encodeScalarValue,
  parseFrontMatter,
  reassemble,
  setScalarField,
  todayUtc,
  type FrontMatterField,
  type ParsedFrontMatter,
} from "./frontmatter";
import {
  listTopLevelSections,
  parseSectionSpec,
  sliceSection,
  sliceSections,
  type SectionSpec,
} from "./sections";
import { appendToLog, parseLog, tail } from "./log";
import { searchWiki } from "./search";

// ---------- Common return shape --------------------------------------------

export interface TextResult {
  content: Array<{ type: "text"; text: string }>;
  /** Optional structured payload alongside the text content. MCP clients that
   *  recognize structured outputs can use this; current Claude clients render
   *  only the text block, so we put a useful summary into the text too. */
  structured?: unknown;
}

export function textResult(text: string, structured?: unknown): TextResult {
  const r: TextResult = { content: [{ type: "text", text }] };
  if (structured !== undefined) r.structured = structured;
  return r;
}

// ---------- Validation helpers ---------------------------------------------

const VALID_STATUS = [
  "seed",
  "draft",
  "active",
  "mature",
  "planned",
  "retired",
  "superseded",
] as const;
const VALID_CONFIDENCE = ["low", "medium", "high"] as const;

type StatusValue = (typeof VALID_STATUS)[number];
type ConfidenceValue = (typeof VALID_CONFIDENCE)[number];

function isStatus(v: unknown): v is StatusValue {
  return typeof v === "string" && (VALID_STATUS as readonly string[]).includes(v);
}
function isConfidence(v: unknown): v is ConfidenceValue {
  return typeof v === "string" && (VALID_CONFIDENCE as readonly string[]).includes(v);
}

function assertSafePath(p: unknown): asserts p is string {
  if (typeof p !== "string" || p.length === 0) throw new Error("page_path is required");
  if (!p.endsWith(".md")) throw new Error("page_path must end with .md");
  if (p.startsWith("/") || p.includes("..")) throw new Error("page_path must be a safe relative path");
}

// ---------- Section args parsing -------------------------------------------

function coerceSectionArg(raw: unknown): SectionSpec[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "string") return [parseSectionSpec(raw)];
  if (Array.isArray(raw)) {
    const out: SectionSpec[] = [];
    for (const s of raw) {
      if (typeof s !== "string") throw new Error("section list entries must be strings");
      out.push(parseSectionSpec(s));
    }
    if (out.length === 0) return undefined;
    return out;
  }
  throw new Error("section must be a string or array of strings");
}

/**
 * Apply the section/front-matter filters to an already-loaded page text.
 * Throws on a single-section miss (with a helpful "available sections"
 * hint). For multi-section requests, missing names are appended as a
 * footer note rather than thrown — the caller handles partial-failure.
 */
export function applySectionFilter(
  text: string,
  sections: SectionSpec[] | undefined,
  includeFrontMatter: boolean,
): string {
  const fm = parseFrontMatter(text);
  const fmBlock = fm.hasFrontMatter ? text.slice(fm.fmStartChar, fm.fmEndChar) : "";
  const body = fm.body;

  if (!sections || sections.length === 0) {
    return includeFrontMatter ? text : body.replace(/^\n+/, "");
  }

  if (sections.length === 1) {
    const slice = sliceSection(body, sections[0]);
    if (slice === null) {
      const available = listTopLevelSections(body);
      throw new Error(
        `section '${sections[0].raw}' not found in page; ` +
        `available top-level sections: [${available.join(", ")}]`,
      );
    }
    return prependFm(slice, fmBlock, includeFrontMatter);
  }

  const { combined, missing } = sliceSections(body, sections);
  let out = combined;
  if (missing.length > 0) {
    const names = missing.map((s) => `'${s.raw}'`).join(", ");
    out =
      (out ? out + "\n\n---\n\n" : "") +
      `[Note: requested sections not found: ${names}]`;
  }
  return prependFm(out, fmBlock, includeFrontMatter);
}

function prependFm(content: string, fmBlock: string, include: boolean): string {
  if (!include || fmBlock === "") return content;
  return fmBlock + "\n" + content;
}

// ---------- wiki_index ------------------------------------------------------

export async function toolIndex(cfg: GitHubConfig): Promise<TextResult> {
  try {
    const { text } = await readPage(cfg, "_index.md");
    return textResult(text);
  } catch (e) {
    if (e instanceof NotFoundError) {
      return textResult("_index.md not found. Has the wiki been initialized?");
    }
    throw e;
  }
}

// ---------- wiki_list -------------------------------------------------------

export async function toolList(
  cfg: GitHubConfig,
  args: Record<string, unknown>,
): Promise<TextResult> {
  const category = typeof args.category === "string" ? args.category : undefined;
  const paths = await listPages(cfg, category);
  if (paths.length === 0) {
    return textResult(`No pages found${category ? ` under category "${category}"` : ""}.`);
  }
  const body = paths.map((p) => `- ${p}`).join("\n");
  return textResult(
    `Found ${paths.length} page${paths.length === 1 ? "" : "s"}` +
    `${category ? ` under ${category}` : ""}:\n\n${body}`,
  );
}

// ---------- wiki_read (extended) -------------------------------------------

export async function toolRead(
  cfg: GitHubConfig,
  args: Record<string, unknown>,
): Promise<TextResult> {
  assertSafePath(args.page_path);
  const sections = coerceSectionArg(args.section);
  const includeFm = args.include_front_matter !== false; // default true

  let pageText: string;
  try {
    pageText = (await readPage(cfg, args.page_path)).text;
  } catch (e) {
    if (e instanceof NotFoundError) {
      return textResult(`page not found at ${args.page_path}`);
    }
    throw e;
  }

  // Default behavior (no section filter, FM included) is bit-identical to the
  // pre-extension tool — return raw text, no further processing.
  if (!sections && includeFm) {
    return textResult(pageText);
  }

  try {
    const out = applySectionFilter(pageText, sections, includeFm);
    return textResult(out);
  } catch (e) {
    return textResult((e as Error).message);
  }
}

// ---------- wiki_search -----------------------------------------------------

export async function toolSearch(
  cfg: GitHubConfig,
  args: Record<string, unknown>,
): Promise<TextResult> {
  const query = args.query;
  if (typeof query !== "string" || query.length === 0) throw new Error("query is required");
  const maxRaw = args.max_results;
  const max = typeof maxRaw === "number" && maxRaw > 0 ? Math.min(maxRaw, 50) : 10;
  const hits = await searchWiki(cfg, query, max);
  if (hits.length === 0) return textResult(`No matches for "${query}".`);
  const out = hits
    .map((h, i) => `${i + 1}. **${h.title}** — \`${h.path}\` (score ${h.score.toFixed(2)})\n   ${h.snippet}`)
    .join("\n\n");
  return textResult(`Top ${hits.length} match${hits.length === 1 ? "" : "es"} for "${query}":\n\n${out}`);
}

// ---------- wiki_read_many --------------------------------------------------

const READ_MANY_DEFAULT = 10;
const READ_MANY_HARD_CAP = 25;
const READ_MANY_CONCURRENCY = 5;

export async function toolReadMany(
  cfg: GitHubConfig,
  args: Record<string, unknown>,
): Promise<TextResult> {
  const hasPaths = Array.isArray(args.page_paths) && (args.page_paths as unknown[]).length > 0;
  const hasCategory = typeof args.category === "string" && args.category.length > 0;
  if (hasPaths && hasCategory) {
    throw new Error("specify either page_paths or category, not both");
  }
  if (!hasPaths && !hasCategory) {
    throw new Error("specify page_paths or category");
  }

  const maxRaw = args.max_pages;
  let maxPages = READ_MANY_DEFAULT;
  if (typeof maxRaw === "number" && Number.isFinite(maxRaw)) {
    if (maxRaw > READ_MANY_HARD_CAP) {
      throw new Error(`max_pages cannot exceed ${READ_MANY_HARD_CAP}`);
    }
    if (maxRaw > 0) maxPages = Math.floor(maxRaw);
  }

  let pagePaths: string[];
  if (hasPaths) {
    pagePaths = [];
    for (const p of args.page_paths as unknown[]) {
      if (typeof p !== "string" || !p.endsWith(".md")) {
        throw new Error("each page_paths entry must be a .md path string");
      }
      if (p.startsWith("/") || p.includes("..")) {
        throw new Error(`unsafe page_path: ${p}`);
      }
      pagePaths.push(p);
    }
  } else {
    pagePaths = await listPages(cfg, args.category as string);
  }

  const truncated = pagePaths.length > maxPages;
  const limited = truncated ? pagePaths.slice(0, maxPages) : pagePaths;

  const sections = coerceSectionArg(args.section);
  const includeFm = args.include_front_matter !== false;

  const pages: Record<string, string> = {};
  const errors: Record<string, string> = {};

  // Concurrency-capped parallel reads.
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < limited.length) {
      const idx = cursor++;
      const p = limited[idx];
      try {
        const { text } = await readPage(cfg, p);
        try {
          pages[p] = applySectionFilter(text, sections, includeFm);
        } catch (e) {
          errors[p] = (e as Error).message;
        }
      } catch (e) {
        if (e instanceof NotFoundError) {
          errors[p] = `page not found at ${p}`;
        } else {
          errors[p] = (e as Error).message;
        }
      }
    }
  }
  const workerCount = Math.max(1, Math.min(READ_MANY_CONCURRENCY, limited.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  // Render a human-readable text bundle alongside the structured map. The
  // structured map is what an LLM-aware client would consume; the text form
  // is what current MCP clients (which only render text) display.
  const blocks: string[] = [];
  for (const p of limited) {
    if (p in pages) blocks.push(`### ${p}\n\n${pages[p]}`);
  }
  if (Object.keys(errors).length > 0) {
    const errLines = Object.entries(errors).map(([p, m]) => `- ${p}: ${m}`).join("\n");
    blocks.push(`### errors\n\n${errLines}`);
  }
  if (truncated) {
    blocks.push(
      `### note\n\nTruncated to first ${maxPages} of ${pagePaths.length} pages. ` +
      `Increase max_pages (up to ${READ_MANY_HARD_CAP}) or narrow the request.`,
    );
  }
  const text = blocks.join("\n\n---\n\n");
  return textResult(text || "(no pages returned)", { pages, errors, truncated });
}

// ---------- wiki_write ------------------------------------------------------

export async function toolWrite(
  cfg: GitHubConfig,
  args: Record<string, unknown>,
): Promise<TextResult> {
  assertSafePath(args.page_path);
  const pagePath = args.page_path;
  const content = args.content;
  const changelog = typeof args.changelog_entry === "string" ? args.changelog_entry : "";
  if (typeof content !== "string" || content.length === 0) throw new Error("content is required");
  if (!/^---\s*\n[\s\S]*?\n---/.test(content)) {
    throw new Error("content must begin with YAML front matter (---...---). See CYBER.md §3.");
  }

  const commitMsg = changelog ? `wiki: ${pagePath} — ${changelog}` : `wiki: update ${pagePath}`;

  let writeResult;
  try {
    writeResult = await writePage(cfg, pagePath, content, commitMsg);
  } catch (e) {
    if (e instanceof ConcurrentWriteError) {
      return textResult(
        `Write blocked: the page was modified concurrently (likely by a human ` +
        `editor in Obsidian pushing through Obsidian Git). Re-read '${pagePath}' ` +
        `with wiki_read, integrate the changes into your new content, and call ` +
        `wiki_write again.\n\nDetails: ${e.message}`,
      );
    }
    throw e;
  }

  const logStatus = await appendToLog(
    cfg,
    "write",
    pagePath,
    changelog || "(no changelog entry supplied)",
  );

  return textResult(
    `Wrote ${pagePath} (blob sha ${writeResult.sha.slice(0, 7)}, commit ${writeResult.commitSha.slice(0, 7)}). ${logStatus}.`,
  );
}

// ---------- wiki_edit -------------------------------------------------------

export interface EditSpec {
  old_str: string;
  new_str: string;
}

export async function toolEdit(
  cfg: GitHubConfig,
  args: Record<string, unknown>,
): Promise<TextResult> {
  assertSafePath(args.page_path);
  const pagePath = args.page_path;
  const editsRaw = args.edits;
  const changelog = typeof args.changelog_entry === "string" ? args.changelog_entry : "";

  if (!Array.isArray(editsRaw)) throw new Error("edits must be an array");
  if (editsRaw.length === 0) throw new Error("edits array is empty");

  const edits: EditSpec[] = [];
  for (let i = 0; i < editsRaw.length; i++) {
    const e = editsRaw[i] as Record<string, unknown>;
    if (!e || typeof e !== "object") throw new Error(`edit ${i + 1}: must be an object`);
    if (typeof e.old_str !== "string" || e.old_str.length === 0) {
      throw new Error(`edit ${i + 1}: old_str is required and must be non-empty`);
    }
    if (typeof e.new_str !== "string") {
      throw new Error(`edit ${i + 1}: new_str is required (use empty string to delete)`);
    }
    edits.push({ old_str: e.old_str, new_str: e.new_str });
  }

  // Read fresh — write paths must use the true current sha.
  let original: string;
  try {
    original = (await readPageFresh(cfg, pagePath)).text;
  } catch (e) {
    if (e instanceof NotFoundError) {
      return textResult(`page not found at ${pagePath}`);
    }
    throw e;
  }

  // Apply edits in order, validating uniqueness and FM-overlap on each.
  // Positions shift between edits (earlier edits change the working text), so
  // we recompute the FM boundary against the current working text each time.
  let working = original;
  let beforeChars = 0;
  let afterChars = 0;

  for (let i = 0; i < edits.length; i++) {
    const { old_str, new_str } = edits[i];
    const fm = parseFrontMatter(working);
    const fmEnd = fm.hasFrontMatter ? fm.fmEndChar : 0;

    const positions = findAll(working, old_str);
    if (positions.length === 0) {
      return textResult(`edit ${i + 1}: '${preview(old_str)}' not found in page`);
    }
    if (positions.length > 1) {
      return textResult(
        `edit ${i + 1}: '${preview(old_str)}' matches ${positions.length} times; ` +
        `provide more surrounding context`,
      );
    }
    const pos = positions[0];

    if (pos < fmEnd) {
      const lineRange = locateLines(working, pos, pos + old_str.length, fmEnd);
      return textResult(
        `edit ${i + 1} overlaps YAML front matter at lines ${lineRange}; ` +
        `use wiki_status_set instead`,
      );
    }

    beforeChars += old_str.length;
    afterChars += new_str.length;
    working = working.slice(0, pos) + new_str + working.slice(pos + old_str.length);
  }

  // Auto-bump the `updated:` field. No-op if the page has no `updated:` line.
  working = bumpUpdatedField(working);

  if (working === original) {
    return textResult(
      `Edit applied 0 net changes — content identical to current state. No commit made.`,
    );
  }

  const commitMsg = changelog
    ? `wiki: ${pagePath} — ${changelog}`
    : `wiki: edit ${pagePath} — ${edits.length} edit${edits.length === 1 ? "" : "s"}`;

  let writeResult;
  try {
    writeResult = await writePage(cfg, pagePath, working, commitMsg);
  } catch (e) {
    if (e instanceof ConcurrentWriteError) {
      return textResult(
        `page modified since last read; re-read and retry\n\nDetails: ${e.message}`,
      );
    }
    throw e;
  }

  const autoChangelog = changelog || `${edits.length} edits applied`;
  const logStatus = await appendToLog(cfg, "edit", pagePath, autoChangelog);

  const delta = afterChars - beforeChars;
  const sign = delta >= 0 ? "+" : "";
  const diffSummary =
    `${edits.length} edit${edits.length === 1 ? "" : "s"} applied, ` +
    `${sign}${delta} chars net (${beforeChars} replaced, ${afterChars} written)`;

  const text =
    `Edited ${pagePath} (commit ${writeResult.commitSha.slice(0, 7)}). ` +
    `${diffSummary}. ${logStatus}.\n\n` +
    `--- updated content ---\n${working}`;

  return textResult(text, {
    new_content: working,
    edits_applied: edits.length,
    diff_summary: diffSummary,
  });
}

function findAll(haystack: string, needle: string): number[] {
  if (needle.length === 0) return [];
  const out: number[] = [];
  let from = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    out.push(idx);
    from = idx + needle.length;
  }
  return out;
}

function preview(s: string, n = 50): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length <= n ? flat : flat.slice(0, n - 3) + "...";
}

function locateLines(text: string, startOff: number, endOff: number, fmEnd: number): string {
  const clampedEnd = Math.min(endOff, fmEnd);
  const startLine = countLines(text, 0, startOff);
  const endLine = countLines(text, 0, clampedEnd);
  return startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`;
}
function countLines(s: string, from: number, to: number): number {
  let n = 1;
  for (let i = from; i < to; i++) if (s.charCodeAt(i) === 10) n++;
  return n;
}

// ---------- wiki_status_set -------------------------------------------------

export async function toolStatusSet(
  cfg: GitHubConfig,
  args: Record<string, unknown>,
): Promise<TextResult> {
  assertSafePath(args.page_path);
  const pagePath = args.page_path;
  const changelog = typeof args.changelog_entry === "string" ? args.changelog_entry : "";

  // Validate the input vocabulary before doing any IO.
  const wantStatus = args.status;
  const wantConfidence = args.confidence;
  const wantOwner = args.owner;
  const wantSupersededBy = args.superseded_by;
  const tagsArg = args.tags as
    | { add?: unknown; remove?: unknown; replace?: unknown }
    | undefined;

  if (wantStatus !== undefined && !isStatus(wantStatus)) {
    throw new Error(
      `invalid status '${String(wantStatus)}'; must be one of: ${VALID_STATUS.join(", ")}`,
    );
  }
  if (wantConfidence !== undefined && !isConfidence(wantConfidence)) {
    throw new Error(
      `invalid confidence '${String(wantConfidence)}'; must be one of: ${VALID_CONFIDENCE.join(", ")}`,
    );
  }
  if (wantOwner !== undefined && typeof wantOwner !== "string") {
    throw new Error("owner must be a string");
  }
  if (wantSupersededBy !== undefined && typeof wantSupersededBy !== "string") {
    throw new Error("superseded_by must be a string");
  }

  let tagsAdd: string[] | undefined;
  let tagsRemove: string[] | undefined;
  let tagsReplace: string[] | undefined;
  if (tagsArg !== undefined) {
    if (typeof tagsArg !== "object" || tagsArg === null) {
      throw new Error("tags must be an object with add/remove/replace fields");
    }
    tagsAdd = coerceStringList(tagsArg.add, "tags.add");
    tagsRemove = coerceStringList(tagsArg.remove, "tags.remove");
    tagsReplace = coerceStringList(tagsArg.replace, "tags.replace");
    if (tagsReplace !== undefined && (tagsAdd !== undefined || tagsRemove !== undefined)) {
      throw new Error("tags.replace is mutually exclusive with tags.add and tags.remove");
    }
  }

  const anyMutation =
    wantStatus !== undefined ||
    wantConfidence !== undefined ||
    wantOwner !== undefined ||
    wantSupersededBy !== undefined ||
    tagsAdd !== undefined ||
    tagsRemove !== undefined ||
    tagsReplace !== undefined;
  if (!anyMutation) {
    throw new Error(
      "no mutations specified — provide at least one of status, confidence, owner, superseded_by, tags",
    );
  }

  // Read fresh.
  let original: string;
  try {
    original = (await readPageFresh(cfg, pagePath)).text;
  } catch (e) {
    if (e instanceof NotFoundError) {
      return textResult(`page not found at ${pagePath}`);
    }
    throw e;
  }

  const fm = parseFrontMatter(original);
  if (!fm.hasFrontMatter) {
    return textResult(`page ${pagePath} has no YAML front matter`);
  }

  const oldStatus = scalarFieldValue(fm, "status");
  const oldConfidence = scalarFieldValue(fm, "confidence");
  const oldOwner = scalarFieldValue(fm, "owner");
  const oldSupersededBy = scalarFieldValue(fm, "superseded_by");

  // tags handling — refuse multi-line block form when mutating.
  const tagsField = fm.fields.get("tags");
  let oldTags: string[];
  if (tagsField && tagsField.lineIdx !== tagsField.endLineIdx) {
    if (tagsAdd !== undefined || tagsRemove !== undefined || tagsReplace !== undefined) {
      return textResult(
        `tags field on ${pagePath} uses multi-line YAML form which this tool ` +
        `cannot mutate; convert it to inline form (e.g. \`tags: [a, b]\`) and retry`,
      );
    }
    oldTags = []; // unused; we won't write tags anyway
  } else if (tagsField) {
    const decoded = decodeInlineList(tagsField.rawInlineValue);
    oldTags = decoded ?? [];
  } else {
    oldTags = [];
  }

  // superseded_by gating: the resulting status must be "superseded".
  if (wantSupersededBy !== undefined && wantSupersededBy.length > 0) {
    const resultingStatus = wantStatus ?? oldStatus;
    if (resultingStatus !== "superseded") {
      return textResult("superseded_by requires status=superseded");
    }
  }

  // Apply mutations to working lines + a working copy of the fields map.
  let workingLines = fm.innerLines.slice();
  const workingFields = new Map(fm.fields);
  const changes: string[] = [];

  if (wantStatus !== undefined && wantStatus !== oldStatus) {
    workingLines = setScalarField(workingLines, workingFields, "status", wantStatus);
    refreshFieldEntry(workingFields, "status", workingLines);
    changes.push(`status: ${oldStatus ?? "(unset)"} → ${wantStatus}`);
  }
  if (wantConfidence !== undefined && wantConfidence !== oldConfidence) {
    workingLines = setScalarField(workingLines, workingFields, "confidence", wantConfidence);
    refreshFieldEntry(workingFields, "confidence", workingLines);
    changes.push(`confidence: ${oldConfidence ?? "(unset)"} → ${wantConfidence}`);
  }
  if (wantOwner !== undefined && wantOwner !== oldOwner) {
    workingLines = setScalarField(workingLines, workingFields, "owner", encodeScalarValue(wantOwner));
    refreshFieldEntry(workingFields, "owner", workingLines);
    changes.push(`owner: ${oldOwner ?? "(unset)"} → ${wantOwner}`);
  }
  if (wantSupersededBy !== undefined && wantSupersededBy !== oldSupersededBy) {
    workingLines = setScalarField(
      workingLines,
      workingFields,
      "superseded_by",
      encodeScalarValue(wantSupersededBy),
    );
    refreshFieldEntry(workingFields, "superseded_by", workingLines);
    changes.push(`superseded_by: ${oldSupersededBy ?? "(unset)"} → ${wantSupersededBy}`);
  }

  // tags
  if (tagsReplace !== undefined) {
    const newTags = dedupePreserveOrder(tagsReplace);
    if (!arraysEqual(oldTags, newTags)) {
      workingLines = setScalarField(workingLines, workingFields, "tags", encodeInlineList(newTags));
      refreshFieldEntry(workingFields, "tags", workingLines);
      changes.push(`tags: [${oldTags.join(", ")}] → [${newTags.join(", ")}]`);
    }
  } else if (tagsAdd !== undefined || tagsRemove !== undefined) {
    let next = oldTags.slice();
    if (tagsAdd) for (const t of tagsAdd) if (!next.includes(t)) next.push(t);
    if (tagsRemove) {
      const removeSet = new Set(tagsRemove);
      next = next.filter((t) => !removeSet.has(t));
    }
    if (!arraysEqual(oldTags, next)) {
      workingLines = setScalarField(workingLines, workingFields, "tags", encodeInlineList(next));
      refreshFieldEntry(workingFields, "tags", workingLines);
      changes.push(`tags: [${oldTags.join(", ")}] → [${next.join(", ")}]`);
    }
  }

  // Auto-bump updated:
  const todayStr = todayUtc();
  const updatedField = workingFields.get("updated");
  const oldUpdated = updatedField ? decodeScalar(updatedField.rawInlineValue) : undefined;
  if (
    updatedField &&
    updatedField.lineIdx === updatedField.endLineIdx &&
    oldUpdated !== todayStr
  ) {
    workingLines = setScalarField(workingLines, workingFields, "updated", todayStr);
  }

  if (changes.length === 0) {
    const fmAfter = workingLines.join("\n");
    const fmBefore = fm.innerLines.join("\n");
    if (fmAfter === fmBefore) {
      return textResult(
        `No changes — every requested value is already what it would be set to. No commit made.`,
      );
    }
  }

  const newText = reassemble(workingLines, fm.body);
  const newFm = parseFrontMatter(newText);

  const commitMsg = changelog
    ? `wiki: ${pagePath} — ${changelog}`
    : `wiki: ${pagePath} — ${changes.length === 0 ? "updated bumped" : changes.join("; ")}`;

  let writeResult;
  try {
    writeResult = await writePage(cfg, pagePath, newText, commitMsg);
  } catch (e) {
    if (e instanceof ConcurrentWriteError) {
      return textResult(
        `page modified since last read; re-read and retry\n\nDetails: ${e.message}`,
      );
    }
    throw e;
  }

  const autoChangelog =
    changelog || (changes.length > 0 ? changes.join(", ") : "front matter touched");
  const logStatus = await appendToLog(cfg, "status", pagePath, autoChangelog);

  const summary =
    changes.length === 0
      ? `Status set on ${pagePath}: only \`updated:\` bumped.`
      : `Status set on ${pagePath}: ${changes.join("; ")}.`;

  return textResult(
    `${summary} (commit ${writeResult.commitSha.slice(0, 7)}). ${logStatus}.`,
    {
      old_front_matter: snapshotFm(fm),
      new_front_matter: snapshotFm(newFm),
      changes,
    },
  );
}

function scalarFieldValue(fm: ParsedFrontMatter, key: string): string | undefined {
  const f = fm.fields.get(key);
  if (!f || f.lineIdx !== f.endLineIdx) return undefined;
  return f.rawInlineValue ? decodeScalar(f.rawInlineValue) : undefined;
}

function coerceStringList(v: unknown, what: string): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) throw new Error(`${what} must be an array of strings`);
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string" || x.length === 0) {
      throw new Error(`${what} entries must be non-empty strings`);
    }
    out.push(x);
  }
  return out;
}

function dedupePreserveOrder(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) if (!seen.has(x)) { seen.add(x); out.push(x); }
  return out;
}
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * After setScalarField appends a brand-new field line (for a key that wasn't
 * in the front matter before), this re-syncs the workingFields map so a
 * later setScalarField call on the same key updates the just-appended line
 * instead of appending a second one.
 */
function refreshFieldEntry(
  fields: Map<string, FrontMatterField>,
  key: string,
  innerLines: string[],
): void {
  // Find the LAST line for this key — setScalarField appends to the end when
  // the field was missing, so the most-recently-appended line is correct.
  let idx = -1;
  for (let i = innerLines.length - 1; i >= 0; i--) {
    const m = innerLines[i].match(/^([A-Za-z_][\w\-]*)\s*:/);
    if (m && m[1] === key) { idx = i; break; }
  }
  if (idx === -1) {
    fields.delete(key);
    return;
  }
  const line = innerLines[idx];
  const m = line.match(/^[A-Za-z_][\w\-]*\s*:(.*)$/);
  fields.set(key, {
    key,
    lineIdx: idx,
    endLineIdx: idx,
    rawBlock: line,
    rawInlineValue: m ? m[1].trim() : "",
  });
}

function snapshotFm(fm: ParsedFrontMatter): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, f] of fm.fields) {
    if (f.lineIdx !== f.endLineIdx) {
      out[k] = `(multi-line block, ${f.endLineIdx - f.lineIdx + 1} lines)`;
      continue;
    }
    if (k === "tags") {
      const list = decodeInlineList(f.rawInlineValue);
      out[k] = list ?? f.rawInlineValue;
      continue;
    }
    out[k] = decodeScalar(f.rawInlineValue);
  }
  return out;
}

// ---------- wiki_delete -----------------------------------------------------

const PROTECTED_PATHS = ["CYBER.md", "_index.md", "_log.md"];

export async function toolDelete(
  cfg: GitHubConfig,
  args: Record<string, unknown>,
): Promise<TextResult> {
  assertSafePath(args.page_path);
  const pagePath = args.page_path;
  const reason = args.reason;
  const force = args.force === true;
  if (typeof reason !== "string" || reason.length === 0) throw new Error("reason is required");

  if (PROTECTED_PATHS.includes(pagePath)) {
    throw new Error(
      `Refusing to delete protected file '${pagePath}'. This file is part of the wiki's operating infrastructure.`,
    );
  }

  const basename = pagePath.split("/").pop() ?? "";
  const looksLikeTest =
    basename.startsWith("smoke-test") ||
    basename.startsWith("test-") ||
    pagePath.startsWith("tmp/");
  if (!looksLikeTest && !force) {
    return textResult(
      `Refused to delete '${pagePath}'. The page does not look like a test artifact ` +
      `(filename doesn't start with 'smoke-test' or 'test-', not under 'tmp/'). ` +
      `For stale design material, the correct move is almost always to set ` +
      `\`status: retired\` in the page's front matter and keep the page for history. ` +
      `If you're sure deletion is right, call wiki_delete again with force=true.`,
    );
  }

  const commitMsg = `wiki: delete ${pagePath} — ${reason}`;
  let deleteResult;
  try {
    deleteResult = await deletePage(cfg, pagePath, commitMsg);
  } catch (e) {
    if (e instanceof NotFoundError) {
      return textResult(`Page '${pagePath}' does not exist. Nothing to delete.`);
    }
    if (e instanceof ConcurrentWriteError) {
      return textResult(
        `Delete blocked: the page was modified concurrently. Re-read it, ` +
        `decide whether deletion is still correct, and try again.\n\nDetails: ${e.message}`,
      );
    }
    throw e;
  }

  const logStatus = await appendToLog(cfg, "delete", pagePath, reason);

  return textResult(
    `Deleted '${pagePath}' (commit ${deleteResult.commitSha.slice(0, 7)}). ${logStatus}.`,
  );
}

// ---------- wiki_log_tail ---------------------------------------------------

const TAIL_DEFAULT = 20;
const TAIL_HARD_CAP = 100;

export async function toolLogTail(
  cfg: GitHubConfig,
  args: Record<string, unknown>,
): Promise<TextResult> {
  const nRaw = args.n;
  let n = TAIL_DEFAULT;
  if (typeof nRaw === "number" && Number.isFinite(nRaw)) {
    if (nRaw > TAIL_HARD_CAP) throw new Error(`n cannot exceed ${TAIL_HARD_CAP}`);
    if (nRaw > 0) n = Math.floor(nRaw);
  }
  const opRaw = args.op;
  let ops: Set<string> | undefined;
  if (typeof opRaw === "string") {
    ops = new Set([opRaw]);
  } else if (Array.isArray(opRaw)) {
    ops = new Set();
    for (const x of opRaw) {
      if (typeof x !== "string") throw new Error("op must be a string or array of strings");
      ops.add(x);
    }
  } else if (opRaw !== undefined) {
    throw new Error("op must be a string or array of strings");
  }
  const sinceRaw = args.since;
  let sinceDate: string | undefined;
  if (sinceRaw !== undefined) {
    if (typeof sinceRaw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(sinceRaw)) {
      throw new Error("since must be an ISO date in YYYY-MM-DD form");
    }
    sinceDate = sinceRaw;
  }

  let logText: string;
  try {
    logText = (await readPage(cfg, "_log.md")).text;
  } catch (e) {
    if (e instanceof NotFoundError) {
      return textResult("_log.md not found.", []);
    }
    throw e;
  }
  const entries = parseLog(logText);
  const result = tail(entries, n, { ops, sinceDate });

  if (result.length === 0) {
    return textResult("No matching log entries.", []);
  }

  const lines = result
    .map((e) => `- [${e.date}] ${e.op} | ${e.context} | ${e.description}`)
    .join("\n");
  const filterDesc = describeFilter(n, ops, sinceDate, entries.length);
  return textResult(
    `${result.length} entr${result.length === 1 ? "y" : "ies"} (${filterDesc}):\n\n${lines}`,
    result,
  );
}

function describeFilter(
  n: number,
  ops: Set<string> | undefined,
  since: string | undefined,
  total: number,
): string {
  const bits: string[] = [`n=${n}`];
  if (ops) bits.push(`op=${[...ops].join(",")}`);
  if (since) bits.push(`since=${since}`);
  bits.push(`of ${total} total`);
  return bits.join(", ");
}
