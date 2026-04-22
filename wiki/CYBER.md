---
title: "CYBER.md — Wiki Schema & Operating Guide"
category: synthesis
tags: [schema, operating-guide, meta]
status: active
confidence: high
owner: shared
created: 2026-04-21
updated: 2026-04-22
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

- **Not a case-management system.** No real client engagements, no live findings, no triaged alerts. The `engagements-RESERVED/` folder exists as a placeholder for a possible future where we dogfood CSAK on real work — but it is empty and stays empty until we make an explicit decision to activate it (which requires an ADR, see §4).
- **Not the tool's code.** Code will live in separate repos once we start building. Code-adjacent specs (API shapes, data schemas, protocol designs) live here; the actual implementation does not.
- **Not personal notes.** Keep personal scratch elsewhere. Pages here are for shared team understanding.
- **Not a drafting surface for client deliverables.** If later we decide to use CSAK on real engagements, those deliverables go through CSAK, not through this wiki.

---

## 2. The three layers (adapted from the LLM Wiki pattern)

- **Raw sources** (`wiki/research/sources/`) — reference material we've pulled in: papers, vendor docs, blog posts, screenshots, transcripts. Treated as immutable. The LLM reads them and writes *about* them elsewhere, never edits them.
- **The wiki** — everything else under `wiki/`. LLM-authored markdown: design docs, research summaries, ADRs, specs, session notes, synthesis. The LLM owns this layer.
- **The schema** — this file. Tells the LLM how to behave.

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
├── decisions/            # Architecture Decision Records (ADRs)
│   ├── README.md         # ADR format + how we use them
│   └── ADR-NNN-<slug>.md # One per decision, numbered sequentially
│
├── sessions/             # Notes from collaborative working sessions
│   └── YYYY-MM-DD-<slug>.md
│
├── synthesis/            # Cross-cutting views of the wiki
│   ├── open-questions.md # Every known unknown, with owner and status
│   ├── lint-report.md    # Wiki health snapshots
│   └── roadmap.md        # Rough sequencing of what we're designing next
│
└── engagements-RESERVED/ # Placeholder. Empty until an ADR activates it.
    └── README.md         # Explains why this is here and what would change it.
```

Folders = categories. Filenames use `kebab-case.md`. ADRs use `ADR-NNN-<slug>.md` with zero-padded 3-digit numbers, monotonically increasing, never reused.

---

## 4. Page conventions

### YAML front matter (required on every page)

```yaml
---
title: "Human-readable title"
category: <product|architecture|specs|research|competitive|decisions|sessions|synthesis>
tags: [tag1, tag2]
status: <seed|draft|active|mature|planned|retired|superseded>
confidence: <low|medium|high>
created: YYYY-MM-DD
updated: YYYY-MM-DD
# Optional
owner: <eli|christopher|shared>
superseded_by: <path-to-newer-page.md>
adr: ADR-NNN    # if this page is an ADR
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

### Link format

Always use explicit-path pipe-syntax wikilinks: `[[decisions/ADR-003-storage-backend|ADR-003: Storage Backend]]`. This prevents phantom pages in Obsidian and keeps references unambiguous for the LLM.

---

## 5. Core operations

### 5.1 Ingest a source (research material)

When a contributor drops a URL, paper, blog post, or doc into the chat:

1. Read the source.
2. Discuss key takeaways before writing anything.
3. If it's a raw artifact worth preserving (PDF, image), save it under `wiki/research/sources/` with a descriptive filename. Otherwise a link is fine.
4. Write a summary page under `wiki/research/<topic>.md`. Front matter includes a `sources` list pointing back to the raw file or URL.
5. Update any existing pages this source affects — especially `specs/*.md`, `competitive/*.md`, and `synthesis/open-questions.md`.
6. Update `_index.md`.
7. Append to `_log.md` with prefix `## [YYYY-MM-DD] ingest | <topic> | <short>`.

A single source might touch 3–10 pages. That's expected — the LLM's job is the bookkeeping.

### 5.2 Record a decision (ADR)

When the two of you converge on a design choice:

1. Pick the next ADR number (check `wiki/decisions/` for the highest existing `ADR-NNN-*`).
2. Create `decisions/ADR-NNN-<slug>.md` using the ADR template in [[decisions/README|decisions/README.md]].
3. Link the ADR from every page it affects (`specs/*.md`, `architecture/*.md`, etc.).
4. If the ADR supersedes a previous approach, update the superseded page's front matter (`status: superseded`, `superseded_by: decisions/ADR-NNN-...md`).
5. Update `_index.md` and append to `_log.md` with prefix `## [YYYY-MM-DD] adr | ADR-NNN | <short>`.

**ADRs are immutable once accepted.** If we change our minds later, we write a new ADR that supersedes the old one; we don't rewrite history.

### 5.3 Log a working session

At the end of a collaborative working session:

1. Write `sessions/YYYY-MM-DD-<slug>.md` summarizing what was discussed, what was decided (often a new ADR), and what's still open.
2. Update `synthesis/open-questions.md` — add new questions, resolve answered ones, re-prioritize.
3. Append to `_log.md` with prefix `## [YYYY-MM-DD] session | <slug> | <short>`.

### 5.4 Query

When asked a question:

1. Call `wiki_index` first unless the answer is obviously in one specific page.
2. Read 2–5 likely-relevant pages.
3. Synthesize a response with explicit wikilink citations.
4. **If the answer is interesting, file it back into the wiki** as a new synthesis page or as an update to an existing one. Don't let valuable analysis live only in chat history.

### 5.5 Lint

On demand, scan the wiki for health issues:

- Pages referenced by other pages but marked `planned` and unwritten.
- `seed` pages with no activity for 30+ days (candidates for promotion or retirement).
- Contradictions between pages (especially specs vs. ADRs).
- Orphan pages with no inbound wikilinks.
- Open questions in `synthesis/open-questions.md` with no owner or no recent movement.
- ADRs not yet indexed in `decisions/README.md`.

Output to `wiki/synthesis/lint-report.md` with a dated section.

---

## 6. Indexing and logging

- **`_index.md`** — content-oriented master index. Tables by category with status and tags. The LLM's first read for any non-trivial query. Updated on every meaningful change.
- **`_log.md`** — chronological, append-only. Prefix every entry with `## [YYYY-MM-DD] <op> | <context> | <short>` so it is greppable (`grep "^## \[" _log.md | tail -20`). Operations: `ingest`, `adr`, `session`, `spec`, `lint`, `schema`, `write`, `delete`.

Note on log formatting: the short description field is plaintext, not further pipe-delimited. Use dashes or commas inside the short description if you need internal separators. Pipes inside the description confuse the format.

---

## 7. Voice

- Precise and compact. Active voice. No hedging beyond what the `confidence` field already captures.
- Speculation is fine — we're pre-design. Label it: "Proposal:", "Open question:", "We're currently leaning toward X because...".
- Disagreement between contributors is recorded, not flattened. When contributors hold different views, the page captures each position and names it, then notes whether an ADR is open to resolve it.
- No filler, no ceremony. A half-page doc that says something real beats a three-page doc that restates the obvious.

---

## 8. Confidentiality

This is a private repo, but assume anything written here might be shared with a future hire, a future client, or a future investor. Don't put anything in that wouldn't be appropriate to show one of them — personal rants, unflattering vendor commentary without specifics, etc.

If we ever activate `engagements-RESERVED/` and start holding real engagement data, the rules change substantially and a new section gets added to this file.

---

## 9. Working with the MCP tools

The server exposes six tools:

| Tool | Purpose |
|------|---------|
| `wiki_index` | Fetch `_index.md`. Call first for any non-trivial query. |
| `wiki_list` | List pages, optionally filtered by category folder. |
| `wiki_read` | Read a specific page by relative path (e.g. `specs/triage-model.md`). |
| `wiki_search` | BM25 search across all pages. Use content terms, not meta terms. |
| `wiki_write` | Create or update a page. Must include full YAML front matter. Auto-appends to `_log.md`. Returns a concurrent-write error if the page was modified between read and write — re-read and retry in that case. |
| `wiki_delete` | Permanently delete a page. Refuses by default unless the page looks like a test artifact (filename starts with `smoke-test` or `test-`, or path starts with `tmp/`). Pass `force=true` to delete real pages, but prefer setting `status: retired` in the page's front matter instead. |

Canonical query pattern: `wiki_index` → identify candidate pages → `wiki_read` 2–5 of them → synthesize. Use `wiki_search` when the index doesn't surface an obvious hit.

**Important:** scope for `wiki_write` and `wiki_delete` is restricted to paths under the wiki root. Files at the repo root (e.g. `ONBOARDING.md` at the top level, if that's where it ends up) are not reachable through the MCP tools — edit them locally or through the GitHub UI.

---

## 10. Evolution

This schema is co-evolved by the team and the LLM. When a convention turns out to be wrong or a new one is needed, update this file and log the change in `_log.md` with prefix `## [YYYY-MM-DD] schema | <change>`. The first major schema change to watch for: activating `engagements-RESERVED/` if and when the team decides to dogfood CSAK on real work.
