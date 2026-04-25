---
title: "Wiki Acceleration — MCP Tool Additions"
category: synthesis
tags: [mcp, infrastructure, performance, tooling]
status: active
confidence: high
owner: shared
created: 2026-04-24
updated: 2026-04-24
---

# Wiki Acceleration — MCP Tool Additions

> Design spec for five new tools to add to the `cyber-wiki` MCP server, plus the rewritten CYBER.md §9 instructions that teach the LLM when to use each tool. Approved 2026-04-24 by Eli; ready for implementation.

## Why this exists

The current six MCP tools (`wiki_index`, `wiki_list`, `wiki_read`, `wiki_search`, `wiki_write`, `wiki_delete`) make many wiki interactions slower than they need to be. The dominant friction is **`wiki_write` requiring a full-page rewrite for any change**. Editing one paragraph in a 30KB page means:

1. `wiki_read` the full page (one round-trip, full page into context).
2. LLM regenerates the full page with the small change applied (slow — output tokens dominate).
3. `wiki_write` ships the full page back (one round-trip, full page over the wire).

For a lint pass with eight small fixes across eight pages, this is ~16 round-trips and ~8x full-page regenerations when the actual semantic change is a few hundred bytes total.

Five new tools collapse this dramatically:

| Tool | What it does | Saves |
|------|--------------|-------|
| `wiki_edit` | Patch-style edits (`old_str` → `new_str`) without rewriting the whole page | The dominant cost — full-page regeneration for small changes. ~70% latency cut on lint-style work. |
| `wiki_read` with `section` filter | Return just the named section instead of the whole page | Context-window cost on long pages (slice 1 spec is 45KB). |
| `wiki_read_many` | Batched read of N pages in one call | Per-call latency overhead; lets the LLM reason over multiple pages at once. |
| `wiki_status_set` | Surgical front matter mutation with schema validation | Avoids full-page rewrites just to flip `draft` → `active`. Validates against the CYBER.md vocabulary before writing. |
| `wiki_log_tail` | Recent `_log.md` entries as structured data | Avoids reading the entire append-only log; useful for orientation and health checks. |

## Tool specs

### `wiki_edit`

Patch a page by replacing exact strings. Modeled on the local `str_replace` tool but extended to support multi-edit transactions.

**Signature:**

```python
wiki_edit(
    page_path: str,
    edits: list[Edit],          # one or more {old_str, new_str} pairs
    changelog_entry: str = None,  # optional; auto-generated from diff if omitted
) -> WikiEditResult
```

where:

```python
class Edit:
    old_str: str       # must match exactly once in the page (after prior edits in this batch are applied)
    new_str: str       # replacement (empty string for deletions)

class WikiEditResult:
    new_content: str   # the full updated page content (saves a re-read)
    diff_summary: str  # human-readable summary: "3 edits applied"
    edits_applied: int
```

**Semantics:**

- Edits apply **in order**. After edit N applies, edit N+1 must match against the post-N content. This lets the caller make sequential dependent edits.
- Each `old_str` must match **exactly once** in the current content at the point it's applied. Zero matches → error "edit N: string not found in page". Multiple matches → error "edit N: string matches K times, provide more context to disambiguate".
- All edits are **transactional**. If any edit fails its uniqueness check, the entire batch is rolled back and the page is unchanged. This prevents partial-application leaving the page in a half-updated state.
- **Front matter is read-only via this tool.** If any `old_str` overlaps the YAML front matter block (between the leading `---` lines), the call fails with "use wiki_status_set for front matter changes". This is a guardrail against breaking the schema.
- The `updated:` field in the front matter **auto-bumps** to today's date (UTC).
- Concurrent-write detection applies (same as `wiki_write`): if the page was modified between the caller's last read and this call, reject with the existing concurrent-write error.
- Auto-appends to `_log.md`. If `changelog_entry` is omitted, the entry is auto-generated as "edit | <page_path> | <N> edits, +<added> -<removed> chars".

**Error cases (all return informative messages):**

- Page does not exist → "page not found at <path>"
- Edit `old_str` not found → "edit N: 'old_str preview...' not found in page"
- Edit `old_str` ambiguous → "edit N: 'old_str preview...' matches K times; provide more surrounding context"
- Front matter overlap → "edit N overlaps YAML front matter; use wiki_status_set instead"
- Concurrent modification → "page modified since last read; re-read and retry"

**Example call:**

```python
wiki_edit(
    page_path="product/scope.md",
    edits=[
        {
            "old_str": "## Slice 2 — Tool Orchestration (preview)\n\nAdds CSAK's ability to **run tools itself**...",
            "new_str": "## Slice 2 — Tool Orchestration (spec approved)\n\n[[specs/slice-2|Slice 2 Spec]] is the authoritative source. Summary: ..."
        },
        {
            "old_str": "Open questions for slice 2 to settle before it starts:\n\n- Tool selection strategy",
            "new_str": "All slice 2 design questions are closed; see [[specs/slice-2|the spec]]."
        }
    ],
    changelog_entry="scope - slice 2 preview rewritten to match approved spec"
)
```

### `wiki_read` with `section` filter

Extend the existing `wiki_read` tool with an optional `section` parameter. Returns just the requested section's content instead of the full page.

**Signature:**

```python
wiki_read(
    page_path: str,
    section: str | list[str] = None,    # NEW: optional section name(s)
    include_front_matter: bool = True,   # NEW: prepend YAML front matter (default True)
) -> str
```

**Semantics:**

- `section=None` (the default) returns the full page exactly as today. **Backwards compatible.**
- `section="Modes"` returns the content under `## Modes` (or `### Modes`, or `# Modes` — any header level), up to but not including the next same-or-higher-level header. Includes all nested subsections (`### Quick`, `### Standard`, etc.).
- `section="## Modes"` is also accepted — explicit level. Use when a name is ambiguous across header levels.
- `section=["Modes", "Tool catalog"]` returns both sections in order, separated by a clear divider (`---`). Useful for fetching multiple related sections in one call.
- `include_front_matter=True` (default) prepends the page's YAML front matter to the returned content. The caller almost always wants to know the page's status/confidence; cheap to include, expensive to require a second read.
- Section name matching is case-insensitive and ignores leading/trailing whitespace.

**Error cases:**

- Page does not exist → "page not found at <path>"
- Section not found → "section 'X' not found in page; available top-level sections: [list]"
- Multiple sections requested, some not found → return the found ones plus an error block listing the missing ones (partial success).

**Example calls:**

```python
# Get just the scoring rules from a long spec
wiki_read("specs/slice-1.md", section="Scoring")

# Get two related sections in one call
wiki_read("specs/slice-2.md", section=["Modes", "Tool catalog"])

# Skip front matter when piping to a renderer
wiki_read("product/vision.md", section="What CSAK is", include_front_matter=False)
```

### `wiki_read_many`

Batched read of multiple pages. Saves per-call latency and lets the LLM reason over the whole batch in one thinking step.

**Signature:**

```python
wiki_read_many(
    page_paths: list[str] = None,        # explicit list of pages
    category: str = None,                # OR: read all pages in a folder
    section: str | list[str] = None,     # optional: same section filter applied to all pages
    include_front_matter: bool = True,
    max_pages: int = 10,                 # safety cap
) -> WikiReadManyResult
```

where:

```python
class WikiReadManyResult:
    pages: dict[str, str]                # page_path → content
    errors: dict[str, str]               # page_path → error message (for any that failed)
    truncated: bool                      # True if max_pages was hit
```

**Semantics:**

- Either `page_paths` or `category` must be provided (not both).
- `category="competitive"` reads every page under `wiki/competitive/`. Equivalent to `wiki_list(category="competitive")` followed by `wiki_read_many(page_paths=[...])`, but in one call.
- `section` filter, if provided, applies to **every** page in the batch. Useful for "show me the Scoring section of every spec" workflows.
- **Partial failure is tolerated.** If page 3 of 5 doesn't exist, return pages 1, 2, 4, 5 in `pages` and put page 3 in `errors`. The caller usually wants the partial results.
- Soft cap of 10 pages. If exceeded, return the first 10 with `truncated=True`. Hard cap of 25 (refuse with an error to prevent context-window blowups).

**Example calls:**

```python
# Read the whole competitive cluster for a lint pass
wiki_read_many(category="competitive")

# Read a specific set
wiki_read_many(page_paths=["product/vision.md", "product/scope.md", "product/slices.md"])

# Get the Scoring section from every slice spec
wiki_read_many(
    page_paths=["specs/slice-1.md", "specs/slice-2.md"],
    section="Scoring"
)
```

### `wiki_status_set`

Surgical front matter mutation. Validates against the CYBER.md schema before writing.

**Signature:**

```python
wiki_status_set(
    page_path: str,
    status: str = None,                  # one of: seed | draft | active | mature | planned | retired | superseded
    confidence: str = None,              # one of: low | medium | high
    owner: str = None,                   # free-text
    tags: TagsUpdate = None,             # add/remove/replace
    superseded_by: str = None,           # path to newer page (only valid when status=superseded)
    changelog_entry: str = None,         # optional; auto-generated from diff if omitted
) -> WikiStatusSetResult
```

where:

```python
class TagsUpdate:
    add: list[str] = None        # tags to add (idempotent)
    remove: list[str] = None     # tags to remove (silent if absent)
    replace: list[str] = None    # full replacement (mutually exclusive with add/remove)

class WikiStatusSetResult:
    old_front_matter: dict
    new_front_matter: dict
    changes: list[str]           # ["status: draft → active", "confidence: medium → high", ...]
```

**Semantics:**

- All mutation fields are optional. Only provided fields change. Omitted fields are unchanged.
- `status` must be one of the seven values from CYBER.md §4. Invalid → reject with the valid list.
- `confidence` must be one of three values. Invalid → reject.
- `superseded_by` requires `status=superseded` (either set in this call or already in the front matter). Otherwise reject.
- `tags.replace` is mutually exclusive with `tags.add` / `tags.remove`. Validation error if both are passed.
- `tags.remove` is silent when the tag isn't present (idempotent).
- `updated:` auto-bumps to today's UTC date.
- Auto-appends to `_log.md`. If `changelog_entry` is omitted, auto-generates from the diff: "status | <page_path> | status: draft → active, confidence: medium → high".
- Concurrent-write detection applies (same as `wiki_edit` and `wiki_write`).

**Why this is separate from `wiki_edit`:** front matter has stricter rules than body content. Schema validation belongs in a dedicated tool that knows the schema, not in a generic patch primitive. This also keeps `wiki_edit`'s contract simpler (it can refuse all front matter edits without ambiguity).

**Example calls:**

```python
# Approve a spec
wiki_status_set("specs/slice-2.md", status="active", confidence="high")

# Add a tag without touching anything else
wiki_status_set("competitive/reconftw.md", tags={"add": ["case-study"]})

# Retire a page that was superseded
wiki_status_set(
    "architecture/data-flow.md",
    status="superseded",
    superseded_by="architecture/overview.md"
)
```

### `wiki_log_tail`

Recent `_log.md` entries as structured data, optionally filtered by operation type.

**Signature:**

```python
wiki_log_tail(
    n: int = 20,                          # number of entries to return (max 100)
    op: str | list[str] = None,           # filter by operation type
    since: str = None,                    # ISO date; only entries on/after this date
) -> list[LogEntry]
```

where:

```python
class LogEntry:
    date: str            # YYYY-MM-DD
    op: str              # write | delete | edit | status | ingest | session | spec | lint | schema
    context: str         # the page path or topic
    description: str     # the short description from the log line
```

**Semantics:**

- Default returns the last 20 entries across all operation types.
- `op="write"` filters to write operations only. `op=["write", "edit"]` filters to writes and edits.
- `since="2026-04-24"` returns only entries from that date forward. Combines with `n` and `op`.
- Hard cap of 100 entries per call. Above that, the caller should read `_log.md` directly.
- Returns structured data, not raw markdown. Easier for the LLM to reason over.

**Why this matters:** the existing pattern for "is the log healthy / what happened recently" is to read the whole `_log.md`, which gets larger every day. This tool stays cheap regardless of log size.

**Example calls:**

```python
# Quick orientation: what happened in the last 10 wiki operations?
wiki_log_tail(n=10)

# Spot-check that recent writes are appearing in the log (L3-3 lint health check)
wiki_log_tail(n=20, op="write")

# What happened today?
wiki_log_tail(since="2026-04-24")
```

## Cross-cutting decisions

These apply to all five new tools (and to the existing `wiki_write`):

- **Optimistic concurrency.** Any tool that mutates a page checks whether the page has been modified since the caller's last read of it. If yes, reject with a clear error and require the caller to re-read and retry.
- **`updated:` auto-bump.** Any tool that mutates a page sets the front matter `updated:` field to today's UTC date. Consistent rule, no surprise, no need for a separate "touch the date" call.
- **Auto-changelog with optional override.** Any mutating tool appends to `_log.md`. The caller can pass an explicit `changelog_entry`; if omitted, the server generates a sensible default from the diff.
- **Specific error messages.** "Section not found, available sections at this level: [Goal, Scope, Pipeline, Modes, ...]" is much better than "Section not found." The LLM should be able to retry correctly without a second tool call.
- **Backwards compatibility.** The new section-filter parameters on `wiki_read` are additive (default behavior unchanged). The other four tools are net-new.

## Implementation notes

- `wiki_edit`'s YAML front matter detection: locate the second `---` line; positions before it are front matter. Compare against each `old_str`'s start position to detect overlap.
- `wiki_read`'s section parser: standard markdown header parsing. Track header level (number of `#`); a section ends at the next header with level ≤ the section's level.
- `wiki_status_set`'s schema validation: status and confidence vocabularies are short fixed lists; encode them in code, not in a config file (avoids the schema and validator being out of sync).
- `wiki_log_tail`'s parser: log lines follow the format `## [YYYY-MM-DD] <op> | <context> | <description>` per CYBER.md §6. Regex parser; pipes inside `<description>` are preserved literally per the existing convention.
- All new tools share the existing concurrent-write detection mechanism. No new infrastructure needed.

## Migration

These are net-new tools. Existing callers (and existing CYBER.md instructions) continue to work unchanged. The new tools become available when the server ships them; CYBER.md §9 is rewritten to teach the LLM when to use each one.

## Related

- [[CYBER|CYBER.md §9 — Working with the MCP tools]] (rewritten in the same change as this implementation)
- [[synthesis/lint-report|Lint Report]] (the lint-pass workflow is the canonical motivating use case)
