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

> Draft spec. Reviewed with Eli on 2026-04-22. Corrected 2026-04-23 to separate report *structure* (always org + time window) from report *invocation* (on-demand, usually real-time during active work — not scheduled or periodic). Data model expanded 2026-04-23 to add a Scan layer and a Finding↔Scan occurrences table, and to formalize Target nesting, Org boundaries, multi-Target findings, and delete semantics.

## Goal

Take pre-collected security tool output, normalize it into org-scoped findings, triage them, and emit reports good enough to hand to a real analyst.

Reports are structured by (org, time window). The analyst invokes them on demand — usually in real-time during active work — for whatever window they care about: "today," "this week," "April 2026," "all of Q1." The same report can be regenerated at any time and is frozen at each generation.

**Scheduled or automated report generation is slice 4+, not part of slice 1.** **Streaming or continuous detection is indefinitely out of scope** — that's SIEM territory.

No tool orchestration. No recursion. No LLM-driven anything unless it demonstrably beats a deterministic alternative.

## Scope

### In scope

- **On-demand invocation.** CLI command runs, CSAK produces output, analyst reads it. Latency target: seconds to minutes for a typical report.
- Ingest from 5 tool formats (see below).
- Four-layer entity model: **Org → Target → Scan → Finding**, plus an immutable **Artifact** layer for raw inputs and a **Report** layer for time-bounded snapshots.
- Deterministic triage scoring.
- Dedup within a single run and across runs against the same org.
- Two report formats: internal review and fix-it ticket bundle. Both scoped to (org, time window).
- Minimal CLI for invoking ingest and report-generation runs.

### Out of scope

- Tool execution (→ slice 2).
- Automatic tool selection (→ slice 2).
- Recursion (→ slice 3).
- Scheduled or automated report generation (→ slice 4+).
- Streaming or continuous detection (indefinitely out of scope — SIEM territory).
- Bidirectional integration with external systems (Jira, Slack, ticketing).
- Multi-user or multi-tenant features beyond org separation in the data model.
- Auth beyond "single user on their own machine."
- Web UI.

## Supported inputs — the 5 starter tools

Each tool produces output in a specific format. Slice 1 must parse all five.

| Tool | Covers | Input format CSAK accepts | Why picked |
|------|--------|---------------------------|------------|
| **Nuclei** | Web vuln scanning (template-based) | JSON (`-json-export` / `-j`) | Clean JSON, high signal, ubiquitous. Good canary for "URL → known vulns." |
| **Nessus Essentials** | Classic vuln scanner | `.nessus` XML | Industry-baseline format. Realistic for McCrary-style work. |
| **Zeek** | Network telemetry | Zeek log files (TSV/JSON) | Rich structured network logs. Covers "I have traffic, tell me what matters." |
| **osquery** | Host telemetry | JSON (query results) | Clean JSON. Covers host state (processes, users, files, configs). |
| **Subfinder + httpx** (ProjectDiscovery) | External attack surface | JSON (both tools output JSON) | Attack-surface discovery: domain → subdomains → live hosts. OSINT slice. |

**Rationale.** Five was chosen over "fewer" because we wanted each of the three surfaces CSAK cares about (web vulns, host telemetry, network telemetry) represented, plus the attack-surface slice for offensive engagements and Nessus as the industry-baseline escape hatch. Five over "more" because more tools means more parsers, more triage tables, more edge cases — and the whole point of slice 1 is to validate the model end to end, not to chase coverage.

**Deliberately excluded from slice 1:**

- Exploit/attack frameworks (Metasploit, Burp, ZAP) — they produce session artifacts, not findings.
- Full SIEM platforms (Wazuh, ELK, Graylog) — too big; CSAK consumes SIEM output if anything.
- Container/SBOM scanners (trivy, grype) — narrow, add in slice 3.
- OSINT tools beyond subfinder (theHarvester, amass) — subfinder covers the high-value slice.

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
├── timestamp_source   extracted | fallback-ingested   ← see §Timestamps below
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
│                      (kept for direct byte-level lookup; Scan is the semantic layer)
├── title              one-line description
├── severity           critical | high | medium | low | info | null
├── confidence         high | medium | low
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

Report  (a time-bounded snapshot deliverable)
├── id                 UUID
├── org_id             which Org this report covers
├── period_start       window start
├── period_end         window end
├── label              human-readable: "April 2026 update" or "today" or "Q1 review"
├── generated_at       when CSAK produced this report
├── kind               internal-review | fix-it-bundle
├── finding_ids        which findings are included (frozen at generation time)
├── scan_ids           which scans contributed to the underlying findings (frozen; used for
│                      the "methodology" section of the report)
├── output_path        on-disk path to the rendered output
└── notes              freeform; analyst commentary baked into the report at generation time
```

### Why this shape

- **Org as top-level container**, not Target. The user's reports are organized by org and by date — "acmecorp April update," "acmecorp May update," "acmecorp right now." That's the unit of deliverable, so it's the unit of organization. Targets exist beneath orgs because one org has many assets to investigate.
- **Target is the middle layer** because tools produce findings against assets (a domain, an IP, a host), not against organizations. The org is the human-meaningful container; the target is the technical container.
- **Scan is a distinct layer** between Artifact and Finding. Artifact is bytes on disk; Scan is the analyst's mental unit of "the April Nessus scan" or "yesterday's Nuclei sweep." The distinction lets one Artifact participate in multiple Scans (re-triaging an old file under updated rules creates a new semantic Scan event from the same bytes) and one Scan to span multiple Artifacts (Zeek is typically 3+ log files per capture window, one Scan).
- **Finding is deduplicated per `(org_id, source_tool, tool-specific key)`**, and re-occurrence is recorded in `FindingScanOccurrence` rather than creating a new Finding row. This keeps `findings.status` and `findings.last_seen` as single sources of truth for "is this still active" while preserving the full scan history for "when did we first see this" and "which scans have caught it."
- **Artifact remains distinct** from Scan because it is the immutable byte-level record. Scans are analyst-facing abstractions that can be deleted or relabeled; Artifacts are evidence.
- **Report is a separate entity** because a report is a *snapshot*. Findings are mutable (status changes, new occurrences seen); a report is the frozen view of an org's state during a window. This is what makes "regenerate the April report" different from "re-run triage." It's also what lets an analyst generate "today's state of acmecorp" right now without committing to a monthly cadence.
- **Severity and confidence are independent axes** because they answer different questions. CVSS conflates them and that's a longstanding pain point.
- **`first_seen` / `last_seen`** lets the report query say "findings active during any window the analyst asks for" without needing a separate time-series store.
- **Soft delete everywhere except Artifacts.** Orgs, Targets, Findings get a `deleted_at` nullable timestamp. Frozen Reports continue to render correctly because `finding_ids` references survive the soft-delete. Artifacts are never deleted through CSAK; if someone really needs disk space back they can `rm` the file directly, but CSAK offers no command for it. Rationale: past reports must still regenerate, and analysts re-engaging with a past client want their old data back rather than a fresh Org.

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

**Rationale.** Suppression has to be per-asset. An analyst routinely accepts risk on staging but not prod; a single shared Finding couldn't express that. The duplication is fine because the Internal Review report's renderer will notice "these 17 Findings are the same issue across 17 assets" and group them visually. That's a rendering concern, not a storage concern.

### Scan timestamps

`Scan.scan_started_at` and `Scan.scan_completed_at` are best-effort per tool:

- **Nessus XML** — extracted from embedded scan timestamps.
- **Nuclei JSONL** — `min(finding.timestamp)` / `max(finding.timestamp)` over the run.
- **Zeek logs** — `min(timestamp)` / `max(timestamp)` from the log lines.
- **Subfinder / osquery** — neither carries run-level timestamps; falls back to `Artifact.received_at` for both.

Every Scan carries a `timestamp_source` field with one of two values:

- `extracted` — the timestamps came from the tool's own output.
- `fallback-ingested` — the tool didn't provide timestamps and we used `Artifact.received_at` as a placeholder.

When `timestamp_source = fallback-ingested`, reports that cite the scan window must label it explicitly — e.g., "Subfinder run (ingested 2026-04-23; scan window unknown)" — so the reader knows the timestamps are our approximation, not the tool's. This matters for the Internal Review's methodology section and for any period-summary that cites when a finding was first detected.

An analyst can override with `--scan-window 2026-04-01:2026-04-30` at ingest time for tools that don't carry their own timestamps. An override is recorded as `timestamp_source = analyst-override` (future work — not shipping in slice 1 unless it earns its place during implementation).

### How a report gets generated

```
1. User: "Generate today's state of acmecorp."  (or "April update" or "Q1 review")
2. CSAK queries Findings WHERE org_id = acmecorp
   AND last_seen >= period_start AND first_seen <= period_end
   AND status IN (active, accepted-risk)
   AND deleted_at IS NULL.
3. CSAK resolves the contributing Scans via FindingScanOccurrence for the methodology section.
4. CSAK groups findings (by severity, by target, or per-finding for tickets).
5. CSAK renders the Internal Review markdown.
6. Optionally CSAK renders the Fix-it Ticket bundle (one file per ticket).
7. Both outputs registered as Reports in the database, with finding_ids and scan_ids frozen.
```

A "period" can be anything the analyst wants — a single day, a week, a month, a quarter, the entire history of an engagement. The data model doesn't care; the query just adjusts the window.

### Remaining open data-model questions

Everything committed above is final for slice 1 unless implementation exposes a real problem. What's still open:

- None blocking. The next unknowns (target nesting refinements in edge cases, how Org-split would work if needed later, whether `timestamp_source = analyst-override` needs to ship in slice 1) will only reveal themselves once the parsers are running against real data.

## Triage

### Scoring

Slice 1 uses **deterministic scoring**. Each finding gets:

- **Severity**: taken from the source tool when provided, mapped onto CSAK's 5-point scale (critical/high/medium/low/info) via a per-tool translation table. For tools that don't emit severity (Zeek events, osquery results), CSAK applies a ruleset keyed on the finding shape. Findings the rules can't classify are `null`, which surfaces in reports as "needs analyst review."
- **Confidence**: tool-reported when available; otherwise a CSAK default that reflects how much a given tool tends to hallucinate. Nessus's "Medium confidence" is treated differently from osquery's objective query results. The defaults are explicit in a versioned table.
- **Priority**: derived. `priority = severity_weight × confidence_weight × target_weight`. Target weight defaults to 1.0; the analyst can bump it (e.g. public-facing infra = 1.5). `target_weight` lives on the Target row (see §Data model) so it persists across runs.

No LLM involvement in slice 1 triage. The scoring tables and rules are explicit, versioned, and surfaceable in the report ("scored High because: Nessus reported Critical (mapped to High by table v3), confidence High, target weight 1.5").

**Rationale.** Three axes (severity × confidence × target weight) rather than single-axis priority or CVSS alone because CVSS conflates severity and confidence into one number that's often wrong, and because target weight is the one axis only the analyst can supply — a remote code execution on a staging box matters less than an info leak on the client's public-facing API. Deterministic over LLM-assisted because triage must be reproducible — re-running `csak triage` on unchanged findings has to produce identical scores, which an LLM cannot guarantee.

### Dedup

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

Re-ingesting the same Artifact (matched by hash) is a no-op at the Artifact layer — the Finding extraction never runs. However, the same Artifact can participate in a new Scan (e.g., re-triaging), and that Scan does get a row even if no new Findings result from it.

### Open triage questions

- Does triage re-run automatically if scoring rules change, or only on explicit re-triage command? Leaning: explicit only. Auto-re-triage breaks reproducibility.
- "Probably a false positive" without fully suppressing. Proposed: a separate `probability_real` field, distinct from confidence, that the analyst can override.

## Reports

### Two output families

Both are scoped to **(org, time window)**.

**Internal Review** — for the analyst team.

- One per (org, period, "review" kind).
- Markdown.
- Sections: org summary, period covered, methodology (the Scans that contributed, including which have `fallback-ingested` timestamps), findings grouped by severity (default) or by Target (option), notes on confidence and caveats, raw-data appendix or pointer to artifacts.
- Technical language assumed. Cross-references between findings. Preserves ambiguity.

**Fix-it Ticket Bundle** — for the team being monitored.

- One bundle per (org, period, "fix-it" kind). The bundle is a directory of markdown files, one per ticket.
- A ticket is a single finding by default; grouping (one ticket covering N closely-related findings) is a per-report option, initially manual. Multi-Target findings of the same dedup-key are rendered together in one ticket by default.
- Sections per ticket: title, affected assets, impact in plain language, reproduction steps if available, remediation, validation.
- Plain language. No internal chatter. No speculation. Designed to be forwarded as-is.

### Naming convention

```
reports/
└── <org-slug>/
    ├── <period-label>/
    │   ├── internal-review.md
    │   └── fix-it/
    │       ├── FIT-001-<short-slug>.md
    │       ├── FIT-002-<short-slug>.md
    │       └── ...
```

Example: `reports/acmecorp/2026-04/internal-review.md` or `reports/acmecorp/today-20260423/internal-review.md`. The period label format is the analyst's choice; CSAK stores the canonical start/end dates separately.

### Template language

**Jinja2.** Python-native, widely known, flexible enough to handle conditional sections, loops over findings, and inherited layouts when we need sub-templates. The alternatives (Mustache / Handlebars — logic-less but forces logic into Python, adding friction; pure string substitution — too weak once templates grow beyond toy size) don't pay off for this product. Jinja2 is overkill only until the first template needs a loop, which will be immediately.

### LLM's role in reports

**Under active consideration, case by case:**

- **Drafting the fix-it ticket's "impact in plain language" section.** LLM genuinely adds value here; translating CVE-speak into stakeholder-speak is tedious and LLMs do it well. *Likely yes.*
- **Drafting the internal review's "notes on confidence and caveats."** An LLM can articulate why a finding might be a false positive, but needs strong grounding to avoid fabrication. *Maybe; prototype.*
- **Grouping findings into ticket bundles.** A good LLM use if done carefully. *Worth trying.*
- **Period summary** ("what changed since the March update"). LLM-suitable but needs structured input — a diff of finding lists between reports. *Worth trying.*
- **Explaining triage scores.** No. Scoring is deterministic; its explanation should be too.
- **Tool selection or invocation parameters.** No — out of scope for slice 1 anyway, but explicitly excluded.

These are worth prototyping in slice 1 to find out what actually works against real data and the token-efficiency constraint.

## Interface

Slice 1 ships with **CLI only**. Sketched commands:

```
csak org create acmecorp
csak ingest --org acmecorp --tool nessus path/to/scan.nessus
csak ingest --org acmecorp --tool zeek path/to/zeek-logs/
csak triage --org acmecorp                       # re-runs triage on existing findings
csak report generate --org acmecorp --period 2026-04 --kind internal-review
csak report generate --org acmecorp --period today --kind internal-review
csak report generate --org acmecorp --period 2026-04 --kind fit-bundle
csak findings list --org acmecorp --status active --severity high
csak target list --org acmecorp
csak scan list --org acmecorp                    # scans recorded for this org, newest first
```

**Rationale.** CLI over web UI over TUI over daemon. A CLI fits an analyst's existing workflow (terminal-heavy, invoked on-demand during active work), is fastest to build, and doesn't constrain what we do later — a web or TUI can wrap a CLI; it's much harder the other way. Web UI is slice-3-or-later. No daemon because slice 1 is explicitly not continuous.

## Storage

**SQLite + flat-file artifact store.**

- SQLite for Org, Target, Scan, Finding, FindingScanOccurrence, and Report tables.
- Artifacts stored on disk under `artifacts/<hash-prefix>/<hash>` — content-addressed.
- Reports rendered to `reports/<org-slug>/<period>/...` per the naming convention above.

**Rationale.** SQLite over Postgres because slice 1 is single-user, single-machine, and Postgres adds a service dependency we don't need. SQLite embeds in the product binary, handles anything short of millions of findings without complaint, and the on-disk file is a natural unit of backup / transport. If slice 2+ ever needs concurrent multi-user writes, Postgres becomes the right answer — but we'd rather solve that problem once we actually have it. Flat-file artifact store because raw tool output is big, varied, and best left as the original bytes — sticking it in SQLite blobs buys nothing and loses `grep`.

## What slice 1 explicitly does not solve

For clarity — these are real pain points, they just aren't slice 1's problem:

- Running tools against targets (slice 2).
- Figuring out which tools to run (slice 2).
- Recursive investigation (slice 3).
- Scheduled / automated report generation (slice 4+).
- Watching data sources and firing on events as they arrive (indefinitely out of scope — SIEM).
- Team collaboration features.
- Integrating with external trackers.
- A web UI.

## Exit criteria

Slice 1 is "done" when:

- All 5 tool formats ingest cleanly, including real-world messy examples.
- A report generated on demand from a mixed-tool run (e.g. Nessus + Zeek for one org's April window) is coherent, not a concatenation of tool outputs.
- Latency is acceptable: a typical report generates in seconds to a few minutes on an analyst's laptop, not tens of minutes.
- Triage scores are reproducible and explainable. Re-running `csak triage` on unchanged findings produces identical scores.
- Dedup across runs against the same org actually works. Re-ingesting last week's Nessus scan doesn't double-count, and the finding's `last_seen` advances.
- Scan lineage is queryable. `csak scan list` shows every scan; each finding can list every scan it has appeared in.
- Reports correctly label `fallback-ingested` scan timestamps so readers aren't misled about when a tool actually ran.
- Two reports for the same org over different but overlapping windows (e.g. "all of Q1" and "March alone") both correctly contain the overlapping findings.
- At least one analyst (Eli) has used it on a real piece of work and not hated it.

## Related

- [[product/vision|Vision]]
- [[product/slices|Slice Plan]]
- [[product/scope|Scope]]
- [[product/users-and-jobs|Users & Jobs]]
- [[synthesis/open-questions|Open Questions]]
- [[sessions/2026-04-22-slice-1-kickoff|Session: Slice 1 Kickoff]]
