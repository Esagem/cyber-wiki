---
title: "Architecture Overview"
category: architecture
tags: [architecture, overview, diagram, narrative]
status: active
confidence: high
owner: shared
created: 2026-04-23
updated: 2026-04-23
---

# Architecture Overview

> Companion to [[specs/slice-1|slice 1 spec]]. The spec is the authoritative source for every decision; this page is the map. A new contributor should be able to read this in five minutes and know where each responsibility lives and where to look in the spec for detail. This page also covers what [[architecture/data-flow|architecture/data-flow]] would have covered — the two have been folded together.

## What CSAK is, briefly

CSAK ingests security-tool output, scores findings deterministically, and emits reports. Slice 1 is the pipeline from pre-collected tool output to rendered report. Tool orchestration (slice 2), recursion (slice 3), and LLM features (later slice) attach to the same pipeline without reshaping it.

The four-step product model is **intake → collect → triage → report**. Slice 1 ships intake (manual, via CLI), triage, and report. It does not ship collect — that's slice 2.

## System diagram

```mermaid
flowchart TB
    analyst([Analyst])

    subgraph cli["CLI<br/>(click-based, thin)"]
        cmd_ingest[csak ingest]
        cmd_report[csak report generate]
        cmd_query[csak findings / target / scan<br/>list &amp; update]
    end

    subgraph ingest["Ingest<br/>(per-tool parsers + promotion logic)"]
        parser_nuclei[Nuclei parser]
        parser_nessus[Nessus parser]
        parser_zeek[Zeek parser<br/>folder-aware]
        parser_osquery[osquery parser]
        parser_probe[Subfinder + httpx parser]
        scoring[Scoring<br/>write-once at ingest]
        dedup[Dedup<br/>tool-specific keys]
    end

    subgraph storage["Storage"]
        sqlite[(SQLite<br/>Org / Target / Scan /<br/>Finding / FindingScanOccurrence /<br/>Artifact metadata)]
        artifacts[(artifacts/<br/>content-addressed<br/>raw bytes)]
    end

    subgraph query["Query &amp; Context"]
        query_layer[Finding / Scan / Target queries]
        context_builder[Report context builder<br/>one Python object<br/>per report generation]
    end

    subgraph render["Render<br/>(format-specific, pluggable)"]
        md[Markdown renderer<br/>Jinja2 templates]
        docx[Docx renderer<br/>python-docx]
        json[JSON renderer<br/>stable schema]
    end

    subgraph outputs["Outputs on disk"]
        report_files[(reports/&lt;org&gt;/&lt;period&gt;/<br/>timestamped files<br/>accumulate)]
    end

    analyst -->|tool files| cmd_ingest
    analyst -->|report requests| cmd_report
    analyst -->|mutations| cmd_query

    cmd_ingest --> parser_nuclei & parser_nessus & parser_zeek & parser_osquery & parser_probe
    parser_nuclei & parser_nessus & parser_zeek & parser_osquery & parser_probe --> scoring
    scoring --> dedup
    dedup --> sqlite
    cmd_ingest -.->|raw bytes| artifacts

    cmd_report --> query_layer
    cmd_query --> query_layer
    query_layer --> sqlite
    query_layer --> context_builder
    context_builder --> md & docx & json
    md & docx & json --> report_files
    report_files -->|analyst reads| analyst

    classDef deferred stroke-dasharray: 5 5,opacity:0.6
```

Two things worth noting about the diagram:

- **Arrows flow one way through the pipeline.** The ingest side writes to storage; the render side reads from it. No feedback loops in slice 1 — no retriage, no report-to-database writes, no cross-report comparison.
- **The render column is pluggable by format.** Adding HTML or PDF later means adding one more renderer that consumes the same report context. No changes upstream.

## Module boundaries

Five modules. Each owns a narrow responsibility; the boundaries match the diagram columns.

### 1. CLI (thin, click-based)

**Owns:** argument parsing, command dispatch, user-facing output formatting (error messages, progress indicators, table output for `list` commands). Nothing more.

**Does not own:** business logic, data access, rendering. The CLI's `csak report generate` is ~10 lines that parses flags, calls the query layer, calls the context builder, calls the relevant renderers, and exits. Every substantive thing happens in the modules below.

**Lives in:** `csak/cli/` — one file per top-level command (`ingest.py`, `report.py`, `findings.py`, `target.py`, `scan.py`, `org.py`).

**Why thin:** a fat CLI is the classic way to end up unable to build a TUI or web UI later. Slice 1 is CLI-only; slices 3+ might need a different front end. Keeping the CLI thin keeps that option alive.

### 2. Ingest (per-tool parsers + scoring + dedup)

**Owns:** taking a file path (or directory, for Zeek) and a tool identifier, producing Scans, Artifacts, and Findings. Assigning severity, confidence, and priority at the moment a Finding is first observed. Running dedup against existing Findings for the same Org.

**Does not own:** the database schema (that's storage), analyst-facing commands (that's CLI), the report rendering (that's render). An ingestor doesn't know what a Report is.

**Lives in:** `csak/ingest/` — one subpackage per tool (`nuclei/`, `nessus/`, `zeek/`, `osquery/`, `probe/` for Subfinder+httpx). Shared scoring logic in `csak/ingest/scoring.py`; shared dedup logic in `csak/ingest/dedup.py`; shared Target-promotion logic in `csak/ingest/targets.py`.

**The parser interface** is the single seam: each parser is a class (or module) exposing `parse(artifact_path, org_id) -> (Scan, list[Finding], list[Artifact])`. All five slice 1 parsers satisfy this. A sixth parser for reconFTW JSON or generic CSV is slice 2 work and slots into the same interface.

See [[specs/slice-1|slice 1 spec §Scoring]] and §Dedup for the rules each parser must respect.

### 3. Storage (SQLite + flat-file artifacts)

**Owns:** persistence. SQLite holds the entity rows (Org, Target, Scan, Finding, FindingScanOccurrence, Artifact metadata). The filesystem under `artifacts/<hash-prefix>/<hash>` holds raw tool-output bytes, content-addressed.

**Does not own:** rendered reports. Reports are export artifacts, not state. They live under `reports/` on disk and no SQLite row references them.

**Lives in:** `csak/storage/` — `schema.py` for the SQLAlchemy models (or dataclass equivalents, decided at build time), `repository.py` for query helpers, `migrations/` for schema changes over time. Artifacts handled by `csak/storage/artifacts.py` using a content-addressed path scheme.

**Why SQLite:** single-user, single-machine, zero deployment. If slice 2+ ever needs concurrent writers, Postgres becomes the right answer — but we'd rather solve that problem once we actually have it. See [[specs/slice-1|slice 1 spec §Storage]].

### 4. Query & Context

**Owns:** reading from storage for read-side operations. Two sub-responsibilities:

- **Query layer.** Generic "give me active Findings for Org X within time window Y" queries used by both the `list` commands and report generation. Understands `deleted_at`, `first_seen`/`last_seen` bounds, and joins across FindingScanOccurrence.
- **Report context builder.** Given (org, period, kind), assembles a single structured Python object holding the Findings, the Scans that contributed, the Targets those Findings attach to, methodology metadata, and grouping hints. This object is the input to every renderer.

**Does not own:** rendering. The context builder emits a data structure, not a document. The same context feeds markdown, docx, and JSON identically.

**Lives in:** `csak/query/` — `finders.py` for the generic queries, `context.py` for the report context builder and its dataclasses.

**Why a dedicated context builder:** it's the invariant that keeps the three render formats aligned. Every renderer reads the same object; same section order, same content, same source. See [[specs/slice-1|slice 1 spec §Report context — the shared input to all renderers]].

### 5. Render (format-specific, pluggable)

**Owns:** turning a report context into output files. Three renderers in slice 1.

- **Markdown renderer.** Jinja2 templates under `templates/markdown/<kind>.md.j2`. Primary authoring format.
- **Docx renderer.** python-docx walking the context and emitting document elements programmatically. A base template at `templates/docx/base.docx` defines styles; the renderer fills it in. First-pass docx prioritizes structure; typography polish is a second pass during slice 1 implementation.
- **JSON renderer.** Serializes the context with a stable, versioned schema. Designed as the interface for the future LLM layer, not as a debug dump.

**Does not own:** the query that built the context, or deciding which formats to emit (that's the CLI based on `--format`).

**Lives in:** `csak/render/` — `markdown.py`, `docx.py`, `json.py`, plus `templates/` alongside for the Jinja and docx base files.

**Extension point:** a new format (HTML, PDF, CSV) is a new file in `csak/render/` implementing the same renderer interface, plus a registration in the renderer registry. No changes elsewhere.

## End-to-end walkthrough

One concrete invocation, traced through every module.

### Setup: analyst has a Nessus scan

Analyst ran Nessus Essentials against `acmecorp.com` last night. The output is at `~/scans/acme-april.nessus`. They've created an Org for this client earlier.

### Step 1: ingest

```
csak ingest --org acmecorp --tool nessus ~/scans/acme-april.nessus
```

What happens, in order:

1. **CLI** parses the flags, resolves `acmecorp` to an Org ID via the storage layer, dispatches to the Nessus ingestor.
2. **Ingestor** opens the file, hashes its contents. Storage layer checks: is there already an Artifact row with this hash for this Org? If yes, skip to step 6 (dedup-only path). If no, proceed.
3. **Ingestor** writes the raw bytes to `artifacts/ab/ab3c7f…`, creates an Artifact row in SQLite pointing at it.
4. **Nessus parser** reads the XML, extracts `scan_started_at` / `scan_completed_at` from the embedded timestamps (`timestamp_source = extracted`), and emits a Scan row plus one proto-Finding per `<ReportItem>`.
5. For each proto-Finding:
   - **Target promotion logic** looks up the host in Targets for this Org. If it's a known Target, attach. If it's a subdomain string in some parent Target's `identifiers` list, promote to a child Target. If it's brand new, create a Target.
   - **Scoring** reads Nessus severity (`5 = Critical`, `4 = High`, …), maps via the per-tool table to CSAK's scale. Pulls confidence from the Nessus finding or the tool default. Reads `target_weight` from the Target. Computes `priority = severity_weight × confidence_weight × target_weight` and writes it to the Finding.
   - **Dedup** checks `(org_id, source_tool='nessus', plugin_id + host + port)`. If a matching Finding exists, advance its `last_seen`, add a FindingScanOccurrence row, done. If not, insert a new Finding.
6. **CLI** prints a summary: "Ingested 1 Scan, 47 new Findings, 12 re-occurrences."

After this, SQLite holds the updated state. The raw `.nessus` file is preserved at `artifacts/ab/ab3c7f…`. No report has been generated yet.

### Step 2: report generate

```
csak report generate --org acmecorp --period 2026-04 --kind internal-review --format markdown,docx,json
```

What happens:

1. **CLI** parses flags, dispatches to the report command handler.
2. **Query layer** runs: "Findings for `acmecorp` where `last_seen >= 2026-04-01` AND `first_seen <= 2026-04-30` AND `status IN (active, accepted-risk)` AND `deleted_at IS NULL`." Returns a list of Findings, joined with their Targets and with the Scans they appeared in during the window (via FindingScanOccurrence).
3. **Context builder** assembles a Python `ReportContext` object: findings sorted by priority, grouped by severity, with methodology metadata recording which Scans contributed and whether any had `timestamp_source = fallback-ingested` (none in this case, since Nessus extracts cleanly). Includes Org info and the period bounds.
4. **Markdown renderer** walks the context, runs it through the `templates/markdown/internal-review.md.j2` Jinja template, writes `reports/acmecorp/2026-04/2026-04-23T14-30-22_internal-review.md`.
5. **Docx renderer** copies `templates/docx/base.docx` to a new file, then programmatically adds headings, paragraphs, and tables matching the markdown output's structure. Writes `reports/acmecorp/2026-04/2026-04-23T14-30-22_internal-review.docx`.
6. **JSON renderer** serializes the context with its schema-versioned shape. Writes `reports/acmecorp/2026-04/2026-04-23T14-30-22_internal-review.json`.
7. **CLI** prints the three paths and exits.

**No writes to SQLite during step 2.** The report is a pure export.

### Step 3: analyst iterates

Analyst reads the internal review, decides Finding #12 is noise and doesn't want to see it in the next report:

```
csak findings update <id-of-finding-12> --status suppressed
```

- **CLI** dispatches to the query layer's update path.
- **Query layer** writes `status = suppressed` to the Finding. Priority is recomputed defensively (same formula, same inputs, so same output in this case). No other Finding is touched.
- Next report generation naturally excludes suppressed findings from the default query.

If instead the analyst wants to flag the finding as probably-FP without committing, they can tag it (`--tag probably-fp`) and the tag surfaces in reports without affecting priority.

### Step 4: re-run the report

Analyst runs the same `report generate` command again. Every step repeats; a fresh set of three files is written with a new timestamp prefix. The previous three files stay on disk. The period directory now has two sets of timestamped outputs. That's the history.

## Extension points

Where future work attaches to this architecture, in order of likelihood.

- **New tool parser** (slice 2 brings reconFTW JSON; later, generic CSV). Drop a new subpackage into `csak/ingest/<tool>/`. Implement the parser interface. Add scoring-table entries under `config/triage/severity/<tool>.yaml`. Add a dedup-key rule in `csak/ingest/dedup.py`. That's it — no changes to storage, query, or render.
- **Tool execution** (slice 2). A new `csak/collect/` module runs tools and writes their output to disk as Artifacts. The ingest layer then picks them up exactly as it picks up analyst-provided files today. The existing pipeline stays unchanged; collect is a new on-ramp to the same pipeline.
- **New export format** (HTML, PDF, CSV — deferred). Drop a new renderer into `csak/render/<format>.py` implementing the renderer interface. Register it. The CLI's `--format` flag now accepts it. No changes upstream.
- **LLM layer** (later slice). Consumes the JSON export. Could be a new CLI command (`csak llm draft-impact --input <path-to-json>`) or a separate tool entirely; either way, the interface is the JSON schema, and CSAK's deterministic core never changes. See [[specs/slice-1|slice 1 spec §Report context]] for why the JSON shape is designed this way.
- **Scheduled invocation** (slice 4+). Wraps `csak report generate` on a cron or event trigger. CSAK itself doesn't need a scheduler — the OS provides one. If we later add cadence-aware features (like period summaries that diff against prior reports), *those* touch the data model; the scheduler itself doesn't.

## What's deliberately not covered here

Operational and engineering concerns that matter at build time but don't affect architecture:

- **Error handling strategy.** Which errors halt, which warn, which get retried. Addressed per-module during implementation.
- **Logging.** Structured vs. unstructured, log levels, where logs write. A build-time decision; the architecture doesn't care.
- **Concurrency.** Slice 1 is single-process, single-threaded for simplicity. Can ingest-while-querying later if needed, but SQLite in WAL mode handles it natively without architectural changes.
- **Config management.** Scoring tables live under `config/triage/severity/`; the rest (DB path, output path, defaults) is CLI flags or environment variables. A proper config file is only needed once there are enough knobs to warrant one, which is a slice 2+ concern.
- **Testing strategy.** Every module above has obvious test seams (parsers are pure functions of input bytes, the context builder is a pure function of DB state, renderers are pure functions of context). Detailed testing plan happens alongside implementation.
- **Packaging and distribution.** How CSAK ships (pip-installable, single binary, Docker image) is a build-time decision. It doesn't affect any module boundary.

These will be addressed in build notes and sub-specs as slice 1 implementation progresses, not here.

## How this relates to the spec

| Concept | Defined in the spec at | Referenced here |
|---------|----------------------|----------------|
| Data model (Org / Target / Scan / Finding / Artifact / FindingScanOccurrence) | [[specs/slice-1\|slice 1 spec §Data model]] | Storage module |
| Scoring rules and priority formula | [[specs/slice-1\|slice 1 spec §Scoring]] | Ingest module |
| Dedup keys per tool | [[specs/slice-1\|slice 1 spec §Dedup]] | Ingest module |
| Report kinds and section content | [[specs/slice-1\|slice 1 spec §Reports]] | Render module |
| Export formats | [[specs/slice-1\|slice 1 spec §Export formats]] | Render module |
| CLI surface | [[specs/slice-1\|slice 1 spec §Interface]] | CLI module |
| Storage choices | [[specs/slice-1\|slice 1 spec §Storage]] | Storage module |
| Exit criteria | [[specs/slice-1\|slice 1 spec §Exit criteria]] | (whole-system) |

If this overview and the spec disagree on a detail, **the spec wins.** This page is a map to the spec, not a replacement for it.

## Related

- [[specs/slice-1|Slice 1 — Ingest & Report]]
- [[product/vision|Vision]]
- [[product/slices|Slice Plan]]
- [[product/glossary|Glossary]]
