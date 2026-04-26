---
title: "CYBER.md — Wiki Schema & Operating Guide"
category: synthesis
tags: [schema, operating-guide, meta]
status: active
confidence: high
owner: shared
created: 2026-04-21
updated: 2026-04-26
---

# CYBER.md — Wiki Schema & Operating Guide

> This is the operating manual for the **CSAK design wiki**. Any LLM connecting to the `cyber-wiki` MCP server MUST read this file first and follow its conventions.

---

## 0. What this wiki is

This wiki is the **collaborative design space** for building the **Cybersecurity Swiss Army Knife (CSAK)**. It is *not* the tool itself.

CSAK — the product we're designing — will eventually do three things:

1. **Ingest** — accept data from a wide, customizable range of security tools.
2. **Triage** — extract what matters, score importance, route it.
3. **Report** — emit consistent deliverables including internal reviews and external fix-it tickets.

This wiki is where we figure out the scope, architecture, data models, tool integrations, and open questions behind that product. Pages here describe what CSAK *should* do and how it *should* work. CSAK itself doesn't exist yet.

**Current phase: pre-design.** We're still figuring out scope and shape. Most pages will start as seeds and grow. Some ideas will be abandoned. That's the point of the space.

---

## 1. What this wiki is *not*

A few important non-goals, so the LLM doesn't drift:

- **Not a case-management system.** No real client engagements, no live findings, no triaged alerts. CSAK's `Org` entity (slice 1) is the system of record for engagement-shaped data; this wiki is about designing and exercising the *product*, not about *uses* of the product. The `test-plans/` folder holds the testing-plan side of that posture — prose that describes what testing scenarios exercise and why their fixtures look the way they do, complementary to the code-side `tests/` and `scripts/` directories in the CSAK repo.
- **Not the tool's code.** Code will live in separate repos once we start building. Code-adjacent specs (API shapes, data schemas, protocol designs) live here; the actual implementation does not.
- **Not personal notes.** Keep personal scratch elsewhere. Pages here are for shared team understanding.
- **Not a drafting surface for client deliverables.** If later we decide to use CSAK on real engagements, those deliverables go through CSAK, not through this wiki.

---

## 2. The two layers

- **Raw sources** (`wiki/research/sources/`) — reference material we've pulled in: papers, vendor docs, blog posts, screenshots, transcripts. Treated as immutable. The LLM reads them and writes *about* them elsewhere, never edits them.
- **The wiki** — everything else under `wiki/`. LLM-authored markdown: design docs, specs, research summaries, session notes, synthesis. The LLM owns this layer.

---

## 3. Directory layout

```
wiki/
├── _index.md             # Master index. Rebuild on every meaningful change.
├── _log.md               # Append-only chronological log.
├── CYBER.md              # This file.
├── ONBOARDING.md         # Per-device and per-contributor setup guide.
│
├── product/              # What CSAK is and who it's for
│   ├── vision.md         # One-page statement of what CSAK is
│   ├── scope.md          # In-scope / out-of-scope (living doc)
│   ├── users-and-jobs.md # Who uses CSAK, what jobs they hire it for
│   └── glossary.md       # Shared vocabulary (finding, severity, ingestor, etc.)
│
├── architecture/         # How CSAK is structured
│   ├── overview.md       # High-level architecture diagram + narrative
│   ├── data-flow.md      # How data moves from ingest → triage → report
│   └── *.md              # One page per subsystem as we define them
│
├── specs/                # Detailed specs for the things CSAK does
│   ├── slice-1.md            # The first slice: ingest + report
│   ├── ingestion-model.md    # How ingestors are defined + plugged in
│   ├── triage-model.md       # How findings get scored + routed
│   ├── report-formats.md     # Internal reviews vs fix-it tickets
│   └── *.md                  # More as we go
│
├── research/             # What exists in the world
│   ├── sources/          # Raw reference material (immutable)
│   ├── *.md              # Summaries and notes per topic
│
├── competitive/          # Existing tools we might compete with or borrow from
│   └── <tool-name>.md    # One page per tool: Splunk, Wazuh, Tines, Tenable, etc.
│
├── sessions/             # Notes from collaborative working sessions
│   └── YYYY-MM-DD-<slug>.md
│
├── test-plans/           # Testing plans for CSAK (prose-side complement to code tests/)
│   └── README.md          # Folder index + what counts as a testing plan
│   └── *.md               # One page per testing plan as we write them
│
└── synthesis/            # Cross-cutting views of the wiki
    ├── open-questions.md  # Every known unknown, with owner and status
    ├── lint-report.md     # Wiki health snapshots
    ├── deferred-features.md # Post-slice-3 review backlog
    └── roadmap.md         # Rough sequencing of what we're designing next
```

Folders = categories. Filenames use `kebab-case.md`.

---

## 4. Page conventions

### YAML front matter (required on every page)

```yaml
---
title: "Human-readable title"
category: <product|architecture|specs|research|competitive|sessions|synthesis>
tags: [tag1, tag2]
status: <seed|draft|active|mature|planned|retired|superseded>
confidence: <low|medium|high>
created: YYYY-MM-DD
updated: YYYY-MM-DD
# Optional
owner: <eli|christopher|shared>
superseded_by: <path-to-newer-page.md>
---
```

### Status lifecycle

- **seed** — stub with dependencies and open questions, no real content yet.
- **draft** — partial content, in flight.
- **active** — useful and maintained.
- **mature** — comprehensive, stable. Rare at pre-design; expect most pages to stay `active` for a long time.
- **planned** — referenced by other pages but not yet written.
- **retired** — idea abandoned; kept for history.
- **superseded** — replaced by a newer page; `superseded_by` points to it.

### Confidence

- **low** — rough thinking, could easily change.
- **medium** — we've thought it through but haven't tested against reality.
- **high** — we've converged and are unlikely to revisit without new evidence.

Most pre-design pages will be `low` or `medium` confidence. That's fine — the label lets future-us know which claims to treat skeptically.

### Rationale lives inline

Every significant choice in a design document gets a short justification in the section that makes the choice. No separate decision records. If the rationale is too long to fit in the section, the section is too big and should be split.

The goal is that any page which commits CSAK to something also explains — briefly — why, and what we considered. Someone reading the page should be able to see the choice and the reasoning in the same scroll.

### Link format

Always use explicit-path pipe-syntax wikilinks: `[[specs/triage-model|Triage Model]]`. This prevents phantom pages in Obsidian and keeps references unambiguous for the LLM.

---

## 5. Core operations

### 5.1 Ingest a source (research material)

When a contributor drops a URL, paper, blog post, or doc into the chat:

1. Read the source.
2. Discuss key takeaways before writing anything.
3. If it's a raw artifact worth preserving (PDF, image), save it under `wiki/research/sources/` with a descriptive filename. Otherwise a link is fine.
4. Write a summary page under `wiki/research/<topic>.md`. Front matter includes a `sources` list pointing back to the raw file or URL.
5. Update any existing pages this source affects — especially `specs/*.md`, `competitive/*.md`, and `synthesis/open-questions.md`. Use `wiki_edit` for targeted updates; full `wiki_write` only when rewriting the whole page.
6. Update `_index.md`.
7. The append to `_log.md` is automatic on every mutating tool call.

A single source might touch 3–10 pages. That's expected — the LLM's job is the bookkeeping.

### 5.2 Log a working session

At the end of a collaborative working session:

1. Write `sessions/YYYY-MM-DD-<slug>.md` summarizing what was discussed, what was decided, what the decisions affected (specs updated, pages rewritten), and what's still open.
2. Update `synthesis/open-questions.md` — add new questions, resolve answered ones, re-prioritize. Use `wiki_edit` for targeted row changes.
3. Auto-appends to `_log.md`.

### 5.3 Query

When asked a question:

1. Call `wiki_index` first unless the answer is obviously in one specific page.
2. Read 2–5 likely-relevant pages — prefer `wiki_read_many` for batched reads, or `wiki_read(..., section=...)` when you only need one section of a long page.
3. Synthesize a response with explicit wikilink citations.
4. **If the answer is interesting, file it back into the wiki** as an update to the relevant spec or as a new synthesis page. Don't let valuable analysis live only in chat history.

### 5.4 Lint

On demand, scan the wiki for health issues:

- Pages referenced by other pages but marked `planned` and unwritten.
- `seed` pages with no activity for 30+ days (candidates for promotion or retirement).
- Contradictions between pages (especially between specs and the sections of other specs that reference them).
- Orphan pages with no inbound wikilinks.
- Open questions in `synthesis/open-questions.md` with no owner or no recent movement.

Output to `wiki/synthesis/lint-report.md` with a dated section. The lint workflow is the canonical use case for `wiki_read_many` (batch-read the whole wiki) and `wiki_edit` (apply N small fixes across N pages without full rewrites).

---

## 6. Indexing and logging

- **`_index.md`** — content-oriented master index. Tables by category with status and tags. The LLM's first read for any non-trivial query. Updated on every meaningful change.
- **`_log.md`** — chronological, append-only. Every mutating MCP tool call (`wiki_write`, `wiki_edit`, `wiki_status_set`, `wiki_delete`) auto-appends an entry in the format `## [YYYY-MM-DD] <op> | <context> | <short>` so it is greppable (`grep "^## \[" _log.md | tail -20`). Operations: `ingest`, `session`, `spec`, `lint`, `schema`, `write`, `edit`, `status`, `delete`. Use `wiki_log_tail` to inspect recent entries cheaply rather than reading the whole log.

Note on log formatting: the short description field is plaintext, not further pipe-delimited. Use dashes or commas inside the short description if you need internal separators. Pipes inside the description confuse the format.

---

## 7. Voice

- Precise and compact. Active voice. No hedging beyond what the `confidence` field already captures.
- Every significant design choice carries its rationale inline. Brief. One paragraph or a tight bullet list, not a treatise.
- Speculation is fine — we're pre-design. Label it: "Proposal:", "Open question:", "We're currently leaning toward X because...".
- Disagreement between contributors is recorded, not flattened. When contributors hold different views, the page captures each position and names it, and notes what would resolve it.
- No filler, no ceremony. A half-page doc that says something real beats a three-page doc that restates the obvious.

---

## 8. Confidentiality

This is a private repo, but assume anything written here might be shared with a future hire, a future client, or a future investor. Don't put anything in that wouldn't be appropriate to show one of them — personal rants, unflattering vendor commentary without specifics, etc.

This wiki will not hold real engagement data. CSAK's `Org` entity (slice 1) is the system of record for that, and the wiki stays focused on designing and exercising the *product*. The `test-plans/` folder holds prose-side testing plans for the product itself; testing fixtures, mock targets, and synthetic data are fine here — real client targets, real findings, and real engagement details are not.

---

## 9. Working with the MCP tools

The server exposes eleven tools. Use the right one for the job — picking the wrong tool is the difference between a fast interaction and a slow one.

### Tool catalog

| Tool | Purpose | When to use |
|------|---------|-------------|
| `wiki_index` | Fetch `_index.md`. | First call for any non-trivial query, unless the target page is obvious. |
| `wiki_list` | List pages, optionally filtered by category folder. | When you need to enumerate pages in a folder. Often followed by `wiki_read_many`. |
| `wiki_read` | Read a specific page. Optional `section` parameter returns just one section. | Reading a single page. Always pass `section="..."` when you only need one section of a long page (e.g. just the §Scoring section of `specs/slice-1.md`). |
| `wiki_read_many` | Batched read of N pages, optionally filtered by section. Accepts an explicit list or a `category=` shortcut. | **Reading 2+ pages in a row.** Saves per-call latency and lets you reason over the whole batch at once. The default move for any lint pass, multi-page synthesis, or "read the whole competitive cluster" workflow. |
| `wiki_search` | BM25 search across all pages. Use content terms, not meta words like "page" or "wiki". | When you need to find pages by content, not by path. Cheaper than reading multiple pages just to confirm whether a stale phrase still appears. |
| `wiki_write` | Create or replace an entire page. | **Only** when creating a new page or rewriting more than ~50% of an existing page. For targeted edits use `wiki_edit`. |
| `wiki_edit` | Patch a page by replacing exact strings. Multi-edit transactional (all or nothing). Refuses to edit YAML front matter. | **The default mutation tool.** Any change smaller than a full rewrite — fixing a paragraph, updating a table row, swapping a stale claim for a current one, applying a batch of related small edits across one page. The lint pass and "fix one section" workflows are the canonical use cases. |
| `wiki_status_set` | Mutate front matter only (status, confidence, owner, tags, superseded_by). Validates against the schema. | Flipping `draft` → `active`. Bumping confidence. Adding a tag. Marking a page superseded. Anything that only touches the YAML block. |
| `wiki_log_tail` | Recent entries from `_log.md` as structured data, optionally filtered by op or date. | Quick orientation ("what happened recently?") and health checks ("is the auto-append firing?"). Cheaper than reading the whole `_log.md`. |
| `wiki_delete` | Permanently delete a page. Refuses by default unless the page looks like a test artifact; pass `force=true` for real pages. | Genuine deletions only. For stale design material, prefer `wiki_status_set(status="retired")` instead — it preserves history. |

### Decision rules

When you're about to interact with the wiki, work through this:

**1. Reading: are you fetching one page or many?**
- One page, just one section → `wiki_read(page_path, section="...")`.
- One page, the whole thing → `wiki_read(page_path)`.
- Two or more pages → `wiki_read_many`. Always. Never sequence multiple `wiki_read` calls when one `wiki_read_many` would do.
- Searching by content rather than path → `wiki_search` first, then targeted reads.

**2. Writing: are you creating, rewriting, or editing?**
- New page → `wiki_write`.
- Rewriting more than ~50% of an existing page → `wiki_write`.
- Anything smaller — a paragraph, a table row, a stale sentence, a section header rename → `wiki_edit`.
- Multiple small changes to the same page → one `wiki_edit` call with multiple edits in the `edits` list. Do not split into separate calls.
- **Front matter only** (status, confidence, tags, owner, superseded_by) → `wiki_status_set`. Never use `wiki_edit` for front matter — it will refuse.

**3. Combined writes: lint passes and multi-page sweeps.**
- Read everything you need first via `wiki_read_many`.
- Apply each page's fixes via `wiki_edit` (one call per page; multiple edits per call where applicable).
- Use `wiki_status_set` separately for any front matter bumps.
- Don't intermix reads and writes if you can avoid it — batch the reads, think, then batch the writes.

### Patterns to internalize

- **Reflexive `wiki_read_many` for lint and multi-page work.** A lint pass that touches 8 pages is one read call (or two — first the index, then the batch) and 8 edit calls. Not 8 reads and 8 writes.
- **`section=` everywhere on long pages.** When you need just §Scoring of `specs/slice-1.md`, don't pull in 45KB to look at 3KB. Same for the lint report, architecture overview, and any spec.
- **`wiki_edit` instead of `wiki_write` whenever possible.** Full-page rewrites cost LLM output time proportional to page size. `wiki_edit` costs time proportional to the change size. The savings compound.
- **`wiki_status_set` for status flips.** Don't rewrite a 30KB page just to change `draft` to `active`. The dedicated tool exists exactly for this.
- **`wiki_log_tail` instead of reading `_log.md`.** Almost always faster and more useful — structured data, filterable by op and date.
- **Auto-changelog is fine for routine edits.** You can pass `changelog_entry` explicitly when the change deserves a thoughtful description; for routine "fixed a typo" or "updated stale reference" edits, let the auto-generated entry do its job.

### Concurrent-write detection

All mutating tools (`wiki_write`, `wiki_edit`, `wiki_status_set`, `wiki_delete`) check whether the page was modified between your last read and the call. If yes, the call is rejected with an informative error. The right response is **always**: re-read the page, integrate the changes into your edit, retry. Do not ignore the error. Do not assume your edit is "safe enough" to retry without re-reading. The wiki has multiple contributors (you, Eli editing in Obsidian, Christopher in another session) — treating concurrent-write errors as routine prevents silent overwrites.

### Scope limitations

`wiki_write`, `wiki_edit`, `wiki_status_set`, and `wiki_delete` operate only on paths under the wiki root. Files at the repo root (e.g. `ONBOARDING.md` at the top level) are not reachable through the MCP tools — edit them locally or through the GitHub UI.

`wiki_edit` will refuse any edit that overlaps a page's YAML front matter. Use `wiki_status_set` for front matter changes; the validation it does is a feature, not a constraint.

### What this looks like in practice

A recent lint pass touched eight pages with small, targeted updates. Under the old toolset that was eight `wiki_read` + eight `wiki_write` calls (16 round-trips, eight full-page regenerations). Under the current toolset:

- One `wiki_read_many(page_paths=[...])` to load all eight pages.
- One `wiki_edit` per page (eight calls, each with 1-3 edits inside).
- Two `wiki_status_set` calls for front-matter-only updates.
- Total: ~11 round-trips, zero full-page regenerations.

That ratio is the design target. If you find yourself doing many sequential reads or many full-page writes, stop and ask whether you're using the right tool.

---

## 10. Evolution

This schema is co-evolved by the team and the LLM. When a convention turns out to be wrong or a new one is needed, update this file and log the change in `_log.md` with prefix `## [YYYY-MM-DD] schema | <change>`.
