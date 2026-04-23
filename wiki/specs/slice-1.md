---
title: "Slice 1 — Ingest & Report"
category: specs
tags: [slice-1, ingestion, triage, reporting, spec]
status: draft
confidence: medium
owner: shared
created: 2026-04-22
updated: 2026-04-23
---

# Slice 1 — Ingest & Report

> Finalized 2026-04-23. All open questions closed. Status stays `draft` until Eli's sign-off review; then `active`.

## Goal

Take pre-collected security tool output, normalize it into org-scoped findings, score them deterministically, and emit reports good enough to hand to a real analyst.

Reports are **exports**, not stored entities. Each invocation is a pipeline: data in, processing, files out. The on-disk files are the historical record. CSAK holds no record of past reports; if the analyst wants yesterday's April report, they open yesterday's file.

Reports are structured by (org, time window). The analyst invokes them on demand — usually in real-time during active work — for whatever window they care about: "today," "this week," "April 2026," "all of Q1." A report is a snapshot of the org's data for that window; it is not aware of any other report.

**Scheduled or automated report generation is slice 4+, not part of slice 1.** **Streaming or continuous detection is indefinitely out of scope** — that's SIEM territory.

No tool orchestration. No recursion. **No LLM** — slice 1 is entirely deterministic. A later slice can attach LLM features over the deterministic layer; slice 1 produces structured output shaped to make that easy.

## Scope

### In scope

- **On-demand invocation.** CLI command runs, CSAK produces output, analyst reads it. Latency target: seconds to minutes for a typical report.
- Ingest from 5 tool formats (see below). Zeek ingest is folder-aware.
- Four-layer entity model: **Org → Target → Scan → Finding**, plus an immutable **Artifact** layer for raw inputs.
- **Deterministic scoring at ingest time.** Each Finding is scored once, when first observed, using the current scoring tables. Scores do not change afterward within slice 1.
- Dedup within a single run and across runs against the same org.
- Two report kinds: internal review and fix-it ticket bundle. Both scoped to (org, time window). A report is aware only of the data for its window — it does not diff against prior reports.
- Two first-class export formats: **markdown** and **docx**. Also a **clean JSON export** designed as the interface for future LLM-layer consumers.
- Minimal CLI for invoking ingest and report generation.

### Out of scope

- Tool execution (→ slice 2).
- Automatic tool selection (→ slice 2).
- Recursion (→ slice 3).
- Re-scoring existing Findings under updated scoring tables. Scores are write-once at ingest in slice 1. If the analyst wants fresh scores after editing tables, they re-ingest the source artifacts (which produces a new Scan; the existing Findings retain their original scores). Comparing outputs is manual.
- Period summaries that compare one report against another. Each report is scoped to its own window; prior reports are on disk but opaque to CSAK.
- Analyst-initiated grouping of fix-it tickets beyond the automatic dedup-key grouping.
- Generic-CSV ingest. The ingest architecture is parser-plugin-shaped so this can be added later without core surgery.
- reconFTW `report/report.json` ingest. Same reasoning.
- Scheduled or automated report generation (→ slice 4+).
- Streaming or continuous detection (indefinitely out of scope — SIEM territory).
- Bidirectional integration with external systems (Jira, Slack, ticketing).
- Multi-user or multi-tenant features beyond org separation in the data model.
- Auth beyond "single user on their own machine."
- Web UI.
- Any database record of past reports — reports are export events, not entities.
- **Any LLM use inside CSAK.** Slice 1 is deterministic end-to-end. A later slice can layer LLM features over the structured outputs slice 1 produces; that's why slice 1 commits to a clean JSON export shape.

## Supported inputs — the 5 starter tools

Each tool produces output in a specific format. Slice 1 must parse all five.

| Tool | Covers | Input format CSAK accepts | Why picked |
|------|--------|---------------------------|------------|
| **Nuclei** | Web vuln scanning (template-based) | JSON (`-json-export` / `-j`) | Clean JSON, high signal, ubiquitous. Good canary for "URL → known vulns." |
| **Nessus Essentials** | Classic vuln scanner | `.nessus` XML | Industry-baseline format. Realistic for McCrary-style work. |
| **Zeek** | Network telemetry | Zeek log files (TSV/JSON), folder-aware | Rich structured network logs. Covers "I have traffic, tell me what matters." |
| **osquery** | Host telemetry | JSON (query results) | Clean JSON. Covers host state (processes, users, files, configs). |
| **Subfinder + httpx** (ProjectDiscovery) | External attack surface | JSON (both tools output JSON) | Attack-surface discovery: domain → subdomains → live hosts. OSINT slice. |

**Rationale.** Five was chosen over "fewer" because we wanted each of the three surfaces CSAK cares about (web vulns, host telemetry, network telemetry) represented, plus the attack-surface slice for offensive engagements and Nessus as the industry-baseline escape hatch. Five over "more" because more tools means more parsers, more scoring tables, more edge cases — and the whole point of slice 1 is to validate the model end to end, not to chase coverage.

**Deliberately excluded from slice 1:**

- Exploit/attack frameworks (Metasploit, Burp, ZAP) — they produce session artifacts, not findings.
- Full SIEM platforms (Wazuh, ELK, Graylog) — too big; CSAK consumes SIEM output if anything.
- Container/SBOM scanners (trivy, grype) — narrow, add in slice 3.
- OSINT tools beyond subfinder (theHarvester, amass) — subfinder covers the high-value slice.
- Generic CSV — deferred; worth building once the parser architecture has proven its shape with the five built-ins.
- reconFTW `report/report.json` — deferred for the same reason. reconFTW's JSON contains Nuclei-, Subfinder-, and httpx-derived findings that will map cleanly onto CSAK's Finding rows once added.

### Folder-aware Zeek ingest

Zeek typically produces many files per capture window (`conn.log`, `dns.log`, `http.log`, `notice.log`, etc. — often one per protocol, sometimes rotated hourly). The Zeek ingester accepts either a single log file or a directory; when given a directory, it globs for Zeek-format files and processes them as **one Scan**.

- `csak ingest --org X --tool zeek path/to/zeek-logs/` — directory path, CSAK picks up every Zeek-format file.
- `csak ingest --org X --tool zeek path/to/zeek-logs/notice.log` — single-file path still works for isolated files or rotated slices.
- Mixed contents in the directory — non-Zeek files are skipped with a stderr warning, not an error.
- `Scan.scan_started_at` / `scan_completed_at` are computed as `min` / `max` of timestamps across all contributing files. The `timestamp_source` is `extracted` in either single-file or multi-file cases.

## Data model

### Entity layers

```
Org
├── id                 UUID
├── name               human-readable: "acmecorp"
├── slug               file-safe: "acmecorp"
├── notes              freeform context
├── created
├── updated
└── deleted_at         soft-delete marker; NULL when active

Target  (an asset or asset class belonging to one Org)
├── id                 UUID
├── org_id             which Org owns this target
├── name               human-readable: "acmecorp.com"
├── type               domain | subdomain | ip | ip-range | host | url | service | person
├── identifiers        list of concrete handles — domains, IPs, CIDRs, subdomains not yet
│                      promoted to child Targets, etc.
├── parent_target_id   optional; enables nesting (e.g. acmecorp.com → api.acmecorp.com)
├── target_weight      float, default 1.0; analyst override for scoring
├── first_seen
├── last_seen
└── deleted_at         soft-delete marker

Artifact  (an immutable raw input file; the bytes CSAK ingested)
├── id                 UUID
├── org_id             which Org this belongs to
├── source_tool        which tool produced it
├── received_at        when CSAK ingested it
├── path               on-disk location of the raw file
├── hash               content hash, for dedup across identical uploads
└── period_hint        optional; when the analyst tells CSAK "this scan covers April 1-30"

Scan  (one semantic tool execution that produced findings)
├── id                 UUID
├── org_id             which Org this scan ran against
├── source_tool        nuclei | nessus | zeek | osquery | subfinder | httpx | manual
├── label              human-readable: "April 2026 full Nessus scan" or "Nuclei sweep 2026-04-23"
├── scan_started_at    when the tool actually ran (extracted from Artifact when possible)
├── scan_completed_at  same; may equal started_at for instantaneous tools
├── timestamp_source   extracted | fallback-ingested   ← see §Scan timestamps
├── artifact_ids       list of Artifact IDs this Scan was extracted from
├── target_ids         list of Target IDs this Scan covered (denormalized for query speed)
├── ingested_at        when CSAK ingested the Scan
└── notes              freeform analyst commentary

Finding  (a single observation; deduplicated per (org, tool, dedup-key))
├── id                 UUID
├── org_id             which Org this belongs to (denormalized from Target)
├── target_id          which Target this attaches to
├── source_tool        nuclei | nessus | zeek | osquery | subfinder | httpx | manual
├── source_artifact_id pointer to the Artifact the first occurrence was parsed from
├── title              one-line description
├── severity           critical | high | medium | low | info | null
├── confidence         high | medium | low
├── probability_real   float 0.0–1.0, default 1.0; analyst override for "probably FP but not committed"
├── priority           float; derived at ingest time. priority = severity_weight × confidence_weight
│                                                              × target_weight × probability_real
├── raw                the tool's original representation, preserved
├── normalized         CSAK's internal representation
├── first_seen         when this finding first appeared in any Scan for this org
├── last_seen          when this finding last appeared (advanced on re-occurrence)
├── status             active | suppressed | accepted-risk | false-positive | fixed
├── tags               freeform
└── deleted_at         soft-delete marker

FindingScanOccurrence  (junction; records every Scan a Finding appeared in)
├── finding_id         UUID (FK → Finding)
├── scan_id            UUID (FK → Scan)
└── seen_at            when this Scan saw this Finding
```

There is **no Report entity** in the data model. Reports are stateless exports — see §Reports below.

### Why this shape

- **Org as top-level container**, not Target. The user's reports are organized by org and by date — "acmecorp April update," "acmecorp May update," "acmecorp right now." That's the unit of deliverable, so it's the unit of organization. Targets exist beneath orgs because one org has many assets to investigate.
- **Target is the middle layer** because tools produce findings against assets (a domain, an IP, a host), not against organizations. The org is the human-meaningful container; the target is the technical container.
- **Scan is a distinct layer** between Artifact and Finding. Artifact is bytes on disk; Scan is the analyst's mental unit of "the April Nessus scan" or "yesterday's Nuclei sweep." The distinction lets one Artifact participate in multiple Scans (re-ingesting the same bytes creates a new Scan event) and one Scan to span multiple Artifacts (Zeek is typically 3+ log files per capture window, one Scan).
- **Finding is deduplicated per `(org_id, source_tool, tool-specific key)`**, and re-occurrence is recorded in `FindingScanOccurrence` rather than creating a new Finding row. This keeps `findings.status` and `findings.last_seen` as single sources of truth for "is this still active" while preserving the full scan history for "when did we first see this" and "which scans have caught it."
- **Artifact remains distinct** from Scan because it is the immutable byte-level record. Scans are analyst-facing abstractions that can be deleted or relabeled; Artifacts are evidence.
- **Severity, confidence, and `probability_real` are independent axes** because they answer different questions from different sources. Severity and confidence come from the tool (or CSAK's defaults for it); `probability_real` comes from the analyst when they want to downweight a finding without committing to `false-positive` status. CVSS conflates these dimensions and that's a longstanding pain point.
- **`priority` is stored, not recomputed.** It's computed once at ingest time and written to the Finding row. This is what "deterministic scoring at ingest time" means concretely: no code path mutates priority after the Finding is written, except the explicit analyst actions that mutate `probability_real`, `target_weight`, or `status`, which do trigger a recompute of that Finding's priority.
- **`first_seen` / `last_seen`** lets the report query say "findings active during any window the analyst asks for" without needing a separate time-series store.
- **Soft delete everywhere except Artifacts.** Orgs, Targets, Findings get a `deleted_at` nullable timestamp. Artifacts are never deleted through CSAK; if someone really needs disk space back they can `rm` the file directly. Rationale: analysts re-engaging with a past client want their old data back rather than a fresh Org, and the byte-level record of what CSAK was given should be preserved even when downstream Findings are softly removed.
- **No Report entity.** Reports are pipeline outputs, not state. CSAK never holds a record of past reports, and never re-renders a past report — each invocation is a fresh query against current state, written to a timestamped file. The directory of timestamped files is the history.

### Target nesting

When CSAK sees a subdomain (or other child asset) in a scan result, there are three outcomes:

1. **The subdomain already has a Target.** Finding attaches to that Target.
2. **The subdomain exists only as a string in some parent Target's `identifiers` list, and now has a finding attaching to it, or the analyst has assigned it a `target_weight` different from its parent's default.** It gets promoted to its own child Target, `parent_target_id` points at the original Target, and the finding attaches there.
3. **The subdomain is newly discovered and has no findings attaching to it (e.g. subfinder found it, but no vuln scanner has hit it yet).** It goes into the parent Target's `identifiers` list as a string. No new Target row.

Promotion is automatic during ingest. The parser emits a Finding keyed to a specific identifier; the storage layer checks whether that identifier corresponds to an existing Target, creates one under the relevant parent if not, and attaches the Finding. The analyst doesn't see the machinery.

**Rationale.** Promoting every discovered subdomain drowns the Target table with assets that never matter. Keeping everything as strings in `identifiers` flattens the hierarchy and makes per-subdomain weighting impossible. The hybrid gives us the hierarchy when it earns it — when either a Finding or an analyst weight override makes the subdomain matter.

### Org boundaries

One Org per client company. Subsidiaries and acquired entities live as top-level Targets under that Org (with `parent_target_id` = NULL and their own child Targets beneath them). Reports are scoped to (Org, period) because the deliverable is "here's how Acme Corp looked in April," not "here's how Acme Corp Delaware LLC looked in April."

**Rationale.** The analyst's mental model of a client is the company they got paid by, not the legal entity they're scanning this hour. Splitting subsidiaries into separate Orgs forces the analyst to run N reports and concatenate them — exactly what CSAK is supposed to spare them.

**What this rules out for later:** if an acquired subsidiary genuinely becomes a separate engagement, we'd eventually need an "Org split" operation that moves Targets + Findings from one Org to a new one. Slice 1 doesn't need it; the data model doesn't preclude it.

### Multi-Target findings

The same vulnerability affecting three subdomains produces **three Finding rows**, one per (Target, dedup-key). Not one Finding with a list of target_ids.

**Rationale.** Suppression has to be per-asset. An analyst routinely accepts risk on staging but not prod; a single shared Finding couldn't express that. The duplication is fine because the Internal Review's renderer groups them visually, and fix-it tickets collapse them into one ticket. That's a rendering concern, not a storage concern.

### Scan timestamps

`Scan.scan_started_at` and `Scan.scan_completed_at` are best-effort per tool:

- **Nessus XML** — extracted from embedded scan timestamps.
- **Nuclei JSONL** — `min(finding.timestamp)` / `max(finding.timestamp)` over the run.
- **Zeek logs** — `min(timestamp)` / `max(timestamp)` over all contributing log files.
- **Subfinder / osquery** — neither carries run-level timestamps; falls back to `Artifact.received_at` for both.

Every Scan carries a `timestamp_source` field with one of two values:

- `extracted` — the timestamps came from the tool's own output.
- `fallback-ingested` — the tool didn't provide timestamps and we used `Artifact.received_at` as a placeholder.

When `timestamp_source = fallback-ingested`, reports that cite the scan window must label it explicitly — e.g., "Subfinder run (ingested 2026-04-23; scan window unknown)" — so the reader knows the timestamps are our approximation, not the tool's. This matters for the Internal Review's methodology section.

## Scoring

CSAK scores each Finding **once, at ingest time**. The scored value is stored on the Finding row and does not change afterward in slice 1. An analyst who edits a scoring table and wants fresh scores re-ingests the source artifact; the existing Finding keeps its prior score, and the new Scan produces freshly-scored Findings or records an occurrence on the existing one (which does not re-score it).

Each Finding gets:

- **Severity**: taken from the source tool when provided, mapped onto CSAK's 5-point scale (critical/high/medium/low/info) via a per-tool translation table. For tools that don't emit severity (Zeek events, osquery results), CSAK applies a ruleset keyed on the finding shape. Findings the rules can't classify are `null`, which surfaces in reports as "needs analyst review."
- **Confidence**: tool-reported when available; otherwise a CSAK default that reflects how much a given tool tends to hallucinate. Nessus's "Medium confidence" is treated differently from osquery's objective query results. The defaults are explicit in a versioned table.
- **`probability_real`**: float 0.0–1.0, default 1.0. The analyst sets this when they think a finding is probably a false positive but aren't ready to commit to `status = false-positive`. Tools never set `probability_real`; it is analyst-only.
- **`target_weight`**: lives on the Target row, default 1.0, analyst-settable. Persists across scans and runs.
- **Priority**: derived and stored at ingest time. `priority = severity_weight × confidence_weight × target_weight × probability_real`.

Mutations that recompute priority for a specific Finding:

- Analyst sets `status`, `probability_real`, or `tags`.
- Analyst changes a Target's `target_weight` — priorities for all Findings on that Target recompute.

Mutations that do **not** trigger recompute:

- Editing a scoring table file on disk.
- Upgrading CSAK to a version with new default tables.

Re-scoring those Findings requires re-ingesting the source artifact. Slice 1 deliberately does not offer a bulk re-score command because there is no reliable way to compare outputs across scoring-table changes without manual review; the re-ingest path forces that review to happen (the analyst sees a new Scan with new Findings and compares to the old ones manually).

**Rationale for all of the above.** Three-and-a-half axes (severity × confidence × target weight × probability_real) rather than single-axis priority or CVSS alone because CVSS conflates severity and confidence into one number that's often wrong, and because target weight and probability_real are axes only the analyst can supply. Deterministic over LLM-assisted because scoring must be consistent and auditable — an LLM layer can attach later if desired, but slice 1's job is to produce a reliable, explainable score. Write-once at ingest so that scores can't silently change between when the analyst looked at a report and when they look at the next one.

## Dedup

Two findings are the same if they match on: `org_id`, `source_tool`, and a **tool-specific dedup key**.

- **Nuclei**: `template-id + matched-at`
- **Nessus**: `plugin_id + host + port`
- **Zeek**: depends on event type — for `notice.log` it's `note + src + dst`
- **osquery**: query name + row hash
- **Subfinder**: subdomain
- **httpx**: URL

When dedup fires on a re-ingest:

1. The existing Finding's `last_seen` advances.
2. A new row is written to `FindingScanOccurrence` with the new `scan_id`.
3. No new Finding row is created.
4. The existing Finding's priority is **not** recomputed. (Re-occurrence doesn't change severity, confidence, target weight, or probability_real.)

Re-ingesting the same Artifact (matched by hash) is a no-op at the Artifact layer — the Finding extraction never runs. However, the same Artifact can participate in a new Scan (explicit analyst re-ingest), and that Scan does get a row even if no new Findings result from it.

## Reports

Reports are **stateless exports**. Each `csak report generate` invocation:

1. Queries current Finding state scoped to (org, period, kind).
2. Builds a structured report context from the query result.
3. Renders one or more output files from that context.
4. Exits. No database row written for the report itself.

A report is aware only of the data for its window. It is not aware of any other report. "Has this finding appeared in a prior report?" is not a question CSAK can answer in slice 1 — prior reports are markdown and docx files on disk, opaque to the tool.

The directory of timestamped output files is the history. There is no "regenerate" command — to produce a fresh report reflecting current state, the analyst runs `csak report generate` again, which writes a new timestamped file alongside the prior one.

### Two report kinds

Both are scoped to **(org, time window)**.

**Internal Review** — for the analyst team.

- Sections: org summary, period covered, methodology (the Scans that contributed, with `fallback-ingested` timestamps labeled as such), findings grouped by severity (default) or by Target (option), notes on confidence and caveats, raw-data appendix or pointer to artifacts.
- Technical language assumed. Cross-references between findings. Preserves ambiguity.

**Fix-it Ticket Bundle** — for the team being monitored.

- A bundle is a collection of tickets, one per Finding, with the exception that multi-Target Findings sharing a dedup-key collapse into a single ticket listing all affected assets.
- Sections per ticket: title, affected assets, impact in plain language, reproduction steps if available, remediation, validation.
- Plain language. No internal chatter. No speculation. Designed to be forwarded as-is.
- Packaged both as a directory of files and as a single `.zip` for easy sharing.
- Analyst-initiated grouping beyond the dedup-key rule is not a slice 1 feature.

### Report context — the shared input to all renderers

Every `csak report generate` invocation produces a **structured report context** — a Python object holding the findings, scans, targets, org info, period bounds, methodology metadata, and grouping hints for that report. All renderers consume the same context.

This is the mechanism that keeps markdown, docx, and JSON output aligned: they render from the same source, section order and content are the same across formats, and adding a new renderer later (HTML, PDF, CSV) means writing against the same context object rather than re-querying the database or re-templating the markdown.

The report context is also the design seam for later LLM features. A slice 2+ addition that wants an LLM to draft the plain-language impact sections, or to summarize a period, will consume the same structured context the deterministic renderers do. Slice 1's commitment is that the context is clean, self-describing, and complete enough that an LLM layer can do useful work over it without needing to re-query CSAK's database.

### Export formats

**First-class:** markdown, docx, and JSON. Any combination on every `csak report generate` invocation.

- **Markdown** is the primary authoring format. Readable, diffable, forwardable, low-friction to edit.
- **Docx** is for clients that live in Word or expect a Word-native attachment. Slice 1 uses **python-docx** to build docx output programmatically from the shared report context. No pandoc dependency, toolchain stays Python-only.
- **JSON** is the machine-readable serialization of the report context. It is a first-class export, not a debug option — its purpose is to be the input format for future LLM features, external automation, or any other programmatic consumer of a CSAK report. The JSON is stable and versioned so downstream consumers can depend on it.

**Deferred:** HTML, PDF, CSV, and any other format. The rendering layer is a set of format-specific renderers keyed on format name, each consuming the shared report context. Adding a format means dropping in a new renderer — no changes to the query path or to existing renderers.

**Format selection:**

```
csak report generate --org acmecorp --period 2026-04 --kind internal-review
                     --format markdown,docx,json
```

`--format` defaults to `markdown` alone when omitted. `--format json` is how a downstream caller (an LLM harness, a script) gets the structured data without bothering with markdown.

### Renderer implementation notes

- **Markdown renderer** uses Jinja2 templates over the report context. Templates live under `templates/markdown/<kind>.md.j2` with shared partials for finding cards, methodology blocks, and ticket bodies.
- **Docx renderer** uses python-docx over the report context directly. The renderer walks the context and emits docx elements (paragraphs, headings, tables, lists, page breaks) programmatically. A base `.docx` template under `templates/docx/base.docx` defines the style set (Heading 1/2/3, body font, table style, a small color palette); the renderer copies this template and fills it in rather than constructing a document from nothing.
- **JSON renderer** serializes the report context with a stable schema. Every field that appears in markdown or docx appears in JSON, plus machine-friendly metadata (schema version, generation timestamp, org and period identifiers, source-tool attributions per finding). The schema is versioned; bumps are documented in a changelog alongside the spec.
- **Polish is a second pass.** The first docx output in slice 1 prioritizes correct structure over typography — sensible headings, readable defaults, no broken tables. "Client-ready" polish (matched fonts, tight spacing, cover pages, header/footer with org name and date) is a deliberate second pass during slice 1 implementation, once the structure is stable.
- **All renderers produce the same content, in the same order, from the same report context.** That's the invariant the architecture protects. If a future feature needs format-specific content (e.g. docx getting a cover page that markdown doesn't), it lives as a renderer-specific section rendered from a flag in the context rather than diverging the content path.

### Output layout

```
reports/
└── <org-slug>/
    └── <period-label>/
        ├── 2026-04-23T14-30-22_internal-review.md
        ├── 2026-04-23T14-30-22_internal-review.docx
        ├── 2026-04-23T14-30-22_internal-review.json
        ├── 2026-04-23T14-30-22_fit/
        │   ├── FIT-001-<short-slug>.md
        │   ├── FIT-001-<short-slug>.docx
        │   ├── FIT-002-<short-slug>.md
        │   ├── FIT-002-<short-slug>.docx
        │   └── ...
        ├── 2026-04-23T14-30-22_fit.zip
        ├── 2026-04-23T14-30-22_fit.json
        └── <later timestamped invocations accumulate here>
```

Conventions:

- **Filename prefix** is ISO-8601 timestamp with colons replaced by dashes for filesystem safety: `2026-04-23T14-30-22_`. Second-level granularity.
- **No overwriting.** Two invocations produce two sets of files in the same period directory. The newest is the one that sorts last alphabetically.
- **Fix-it bundles** are both a directory of markdown/docx files and a `.zip` of that directory. The zip is the unit an analyst forwards to a client; the directory is for browsing during authoring. The fit bundle's JSON export is a single file at the period-directory level, not inside the bundle directory.
- **No `latest` symlink.** Alphabetical sort gives you the newest; adding a pointer file is one more thing to keep in sync.
- **Period label** format is the analyst's choice at the CLI (`--period 2026-04`, `--period today`, `--period q1-review`); CSAK doesn't impose a schema beyond filesystem-safety.

### Template language

**Jinja2** for the markdown renderer. Python-native, widely known, flexible enough to handle conditional sections, loops over findings, and inherited layouts when we need sub-templates. Logic-less alternatives (Mustache / Handlebars) force logic back into Python which adds friction without buying anything; pure string substitution is too weak once templates grow beyond toy size.

The docx renderer is code, not templates — see §Renderer implementation notes above. The JSON renderer is a serializer, not a template.

## Interface

Slice 1 ships with **CLI only**. Sketched commands:

```
csak org create acmecorp
csak ingest --org acmecorp --tool nessus path/to/scan.nessus
csak ingest --org acmecorp --tool zeek path/to/zeek-logs/
csak report generate --org acmecorp --period 2026-04 --kind internal-review --format markdown,docx
csak report generate --org acmecorp --period today --kind internal-review --format json
csak report generate --org acmecorp --period 2026-04 --kind fit-bundle --format markdown,docx,json
csak findings list --org acmecorp --status active --severity high
csak findings update <finding-id> --probability-real 0.3
csak target list --org acmecorp
csak target update <target-id> --weight 1.5
csak scan list --org acmecorp
```

Notable absences from slice 1:

- **No `csak triage` command.** Scoring happens at ingest; there's nothing to re-run.
- **No `csak report regenerate` command.** Every generation is fresh and stateless; no identity exists to "regenerate."
- **No LLM-related commands or flags.**

**Rationale.** CLI over web UI over TUI over daemon. A CLI fits an analyst's existing workflow (terminal-heavy, invoked on-demand during active work), is fastest to build, and doesn't constrain what we do later — a web or TUI can wrap a CLI; it's much harder the other way. No daemon because slice 1 is explicitly not continuous.

## Storage

**SQLite for state. Flat files for everything else.**

- **SQLite** holds the entity tables: Org, Target, Scan, Finding, FindingScanOccurrence, and Artifact metadata.
- **Artifacts** (raw tool output, the byte-level record) live on disk under `artifacts/<hash-prefix>/<hash>`, content-addressed. The SQLite Artifact row holds the path and hash; the bytes live on disk.
- **Reports** (all rendered outputs, in all formats) live on disk under `reports/<org-slug>/<period>/...` per the layout above. There is no database record of reports — they are export artifacts, not state.

**Rationale.** SQLite over Postgres because slice 1 is single-user, single-machine, and Postgres adds a service dependency we don't need. SQLite embeds in the product, handles anything short of millions of findings without complaint, and the on-disk file is a natural unit of backup or transport. If slice 2+ ever needs concurrent multi-user writes, Postgres becomes the right answer — but we'd rather solve that problem once we actually have it. Flat files for raw artifacts and for report outputs because both are byte-sized content that benefits from being `grep`-able and tar-able with standard tools — stuffing them into SQLite blobs would buy nothing.

## What slice 1 explicitly does not solve

For clarity — these are real pain points, they just aren't slice 1's problem:

- Running tools against targets (slice 2).
- Figuring out which tools to run (slice 2).
- Recursive investigation (slice 3).
- Scheduled / automated report generation (slice 4+).
- Period summaries that compare one report against another (slice 4+ if at all).
- Re-scoring existing Findings under updated tables.
- Watching data sources and firing on events as they arrive (indefinitely out of scope — SIEM).
- LLM use of any kind inside CSAK (a later slice can layer LLM features over slice 1's structured outputs).
- Team collaboration features.
- Integrating with external trackers.
- A web UI.

## Exit criteria

Slice 1 is "done" when:

- All 5 tool formats ingest cleanly, including real-world messy examples.
- Zeek ingest handles both single files and folders of logs.
- A report generated on demand from a mixed-tool run (e.g. Nessus + Zeek for one org's April window) is coherent, not a concatenation of tool outputs.
- Latency is acceptable: a typical report generates in seconds to a few minutes on an analyst's laptop, not tens of minutes.
- Finding priorities are consistent and explainable. Priority is stored at ingest and visible on `csak findings list`. The analyst can trace a priority back to its severity, confidence, target_weight, and probability_real components.
- Dedup across runs against the same org works. Re-ingesting last week's Nessus scan doesn't double-count, and the finding's `last_seen` advances.
- Scan lineage is queryable. `csak scan list` shows every scan; each finding can list every scan it has appeared in.
- Reports correctly label `fallback-ingested` scan timestamps so readers aren't misled about when a tool actually ran.
- Markdown, docx, and JSON export all produce readable output with matching content and section order.
- The JSON export is self-describing (schema version present, source-tool attribution on every finding) and complete enough that an external consumer — including a future LLM layer — can generate a useful reply without re-querying CSAK.
- Multiple invocations for the same (org, period, kind) accumulate as timestamped files without overwriting.
- At least one analyst has used it on a real piece of work and not hated it.

## Related

- [[product/vision|Vision]]
- [[product/slices|Slice Plan]]
- [[product/scope|Scope]]
- [[product/users-and-jobs|Users & Jobs]]
- [[synthesis/open-questions|Open Questions]]
- [[sessions/2026-04-22-slice-1-kickoff|Session: Slice 1 Kickoff]]
