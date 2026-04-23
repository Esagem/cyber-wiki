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

> Draft spec. Reviewed with Eli on 2026-04-22. Corrected 2026-04-23 to separate report *structure* (always org + time window) from report *invocation* (on-demand, usually real-time during active work — not scheduled or periodic).

## Goal

Take pre-collected security tool output, normalize it into org-scoped findings, triage them, and emit reports good enough to hand to a real analyst.

Reports are structured by (org, time window). The analyst invokes them on demand — usually in real-time during active work — for whatever window they care about: "today," "this week," "April 2026," "all of Q1." The same report can be regenerated at any time and is frozen at each generation.

**Scheduled or automated report generation is slice 4+, not part of slice 1.** **Streaming or continuous detection is indefinitely out of scope** — that's SIEM territory.

No tool orchestration. No recursion. No LLM-driven anything unless it demonstrably beats a deterministic alternative.

## Scope

### In scope

- **On-demand invocation.** CLI command runs, CSAK produces output, analyst reads it. Latency target: seconds to minutes for a typical report.
- Ingest from 5 tool formats (see below).
- Three-layer entity model: **Org → Target → Finding**, plus an immutable **Artifact** layer for raw inputs and a **Report** layer for time-bounded snapshots.
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
└── updated

Target  (an asset or asset class belonging to one Org)
├── id                 UUID
├── org_id             which Org owns this target
├── name               human-readable: "acmecorp.com"
├── type               domain | subdomain | ip | ip-range | host | url | service | person
├── identifiers        list of concrete handles — domains, IPs, CIDRs, etc.
├── parent_target_id   optional; enables nesting (e.g. acmecorp.com → api.acmecorp.com)
├── first_seen
└── last_seen

Finding  (a single observation, attached to a Target)
├── id                 UUID
├── target_id          which Target this attaches to
├── org_id             denormalized from Target for query speed
├── source_tool        nuclei | nessus | zeek | osquery | subfinder | httpx | manual
├── source_artifact_id pointer to the ingested artifact
├── title              one-line description
├── severity           critical | high | medium | low | info | null
├── confidence         high | medium | low
├── raw                the tool's original representation, preserved
├── normalized         CSAK's internal representation
├── first_seen         when this finding first appeared in any artifact for this org
├── last_seen          when this finding last appeared
├── status             active | suppressed | accepted-risk | fixed
└── tags               freeform

Artifact  (an immutable raw input file)
├── id                 UUID
├── org_id             which Org this belongs to
├── source_tool        which tool produced it
├── received_at        when CSAK ingested it
├── path               on-disk location of the raw file
├── hash               content hash, for dedup across identical uploads
└── period_hint        optional; when the analyst tells CSAK "this scan covers April 1-30"

Report  (a time-bounded snapshot deliverable)
├── id                 UUID
├── org_id             which Org this report covers
├── period_start       window start
├── period_end         window end
├── label              human-readable: "April 2026 update" or "today" or "Q1 review"
├── generated_at       when CSAK produced this report
├── kind               internal-review | fix-it-bundle
├── finding_ids        which findings are included (frozen at generation time)
├── output_path        on-disk path to the rendered output
└── notes              freeform; analyst commentary baked into the report at generation time
```

### Why this shape

- **Org as top-level container**, not Target. The user's reports are organized by org and by date — "acmecorp April update," "acmecorp May update," "acmecorp right now." That's the unit of deliverable, so it's the unit of organization. Targets exist beneath orgs because one org has many assets to investigate.
- **Target is the middle layer** because tools produce findings against assets (a domain, an IP, a host), not against organizations. The org is the human-meaningful container; the target is the technical container.
- **Artifact table exists** because the same raw output might produce findings multiple times (re-triaging a past Nessus file against updated rules, for example). The artifact is the immutable input; findings are derived.
- **Report is a separate entity** because a report is a *snapshot*. Findings are mutable (status changes, new occurrences seen); a report is the frozen view of an org's state during a window. This is what makes "regenerate the April report" different from "re-run triage." It's also what lets an analyst generate "today's state of acmecorp" right now without committing to a monthly cadence.
- **Severity and confidence are independent axes** because they answer different questions. CVSS conflates them and that's a longstanding pain point.
- **`first_seen` / `last_seen`** lets the report query say "findings active during any window the analyst asks for" without needing a separate time-series store.

### How a report gets generated

```
1. User: "Generate today's state of acmecorp."  (or "April update" or "Q1 review")
2. CSAK queries Findings WHERE org_id = acmecorp
   AND last_seen >= period_start AND first_seen <= period_end
   AND status IN (active, accepted-risk).
3. CSAK groups findings (by severity, by target, or per-finding for tickets).
4. CSAK renders the Internal Review markdown.
5. Optionally CSAK renders the Fix-it Ticket bundle (one file per ticket).
6. Both outputs registered as Reports in the database, with finding_ids frozen.
```

A "period" can be anything the analyst wants — a single day, a week, a month, a quarter, the entire history of an engagement. The data model doesn't care; the query just adjusts the window.

### Open data-model questions

- **Target nesting rules.** When does a discovered subdomain become its own child Target? Options: (a) every discovered subdomain → child Target; (b) subdomains live as `identifiers` on one Target; (c) hybrid — promote to child Target only if findings attach to that subdomain specifically. Leaning (c) but this needs a decision before implementation.
- **Org boundaries.** Is "the parent company plus its subsidiaries" one Org or many? Probably one Org with parent/child Targets, but `Org` itself doesn't nest in the slice 1 data model. Revisit if pain emerges.
- **What happens when a report period overlaps with another report's period for the same org?** Allowed — an analyst might generate "all of Q1" and "March specifically" and expect both to contain the overlapping findings. Reports are independent snapshots.
- **Soft vs hard delete** for Targets and Orgs. Probably soft only, with Artifacts preserved separately under all conditions.

## Triage

### Scoring

Slice 1 uses **deterministic scoring**. Each finding gets:

- **Severity**: taken from the source tool when provided, mapped onto CSAK's 5-point scale (critical/high/medium/low/info) via a per-tool translation table. For tools that don't emit severity (Zeek events, osquery results), CSAK applies a ruleset keyed on the finding shape. Findings the rules can't classify are `null`, which surfaces in reports as "needs analyst review."
- **Confidence**: tool-reported when available; otherwise a CSAK default that reflects how much a given tool tends to hallucinate. Nessus's "Medium confidence" is treated differently from osquery's objective query results. The defaults are explicit in a versioned table.
- **Priority**: derived. `priority = severity_weight × confidence_weight × target_weight`. Target weight defaults to 1.0; the analyst can bump it (e.g. public-facing infra = 1.5).

No LLM involvement in slice 1 triage. The scoring tables and rules are explicit, versioned, and surfaceable in the report ("scored High because: Nessus reported Critical (mapped to High by table v3), confidence High, target weight 1.5").

### Dedup

Two findings are the same if they match on: `org_id`, `source_tool`, and a **tool-specific dedup key**.

- **Nuclei**: `template-id + matched-at`
- **Nessus**: `plugin_id + host + port`
- **Zeek**: depends on event type — for `notice.log` it's `note + src + dst`
- **osquery**: query name + row hash
- **Subfinder**: subdomain
- **httpx**: URL

When dedup fires on a re-ingest, the existing finding's `last_seen` advances; a duplicate is not created. Re-ingesting the same artifact (matched by hash) is a no-op at the artifact layer — the finding extraction never runs.

### Open triage questions

- Does triage re-run automatically if scoring rules change, or only on explicit re-triage command? Leaning: explicit only. Auto-re-triage breaks reproducibility.
- "Probably a false positive" without fully suppressing. Proposed: a separate `probability_real` field, distinct from confidence, that the analyst can override.
- How do we handle findings that span multiple Targets (e.g. same vuln on three subdomains)? Probably one Finding per (target, dedup-key) — duplication across Targets is correct because the analyst may suppress on one and not the other.

## Reports

### Two output families

Both are scoped to **(org, time window)**.

**Internal Review** — for the analyst team.

- One per (org, period, "review" kind).
- Markdown.
- Sections: org summary, period covered, methodology (what tools/artifacts contributed), findings grouped by severity (default) or by Target (option), notes on confidence and caveats, raw-data appendix or pointer to artifacts.
- Technical language assumed. Cross-references between findings. Preserves ambiguity.

**Fix-it Ticket Bundle** — for the team being monitored.

- One bundle per (org, period, "fix-it" kind). The bundle is a directory of markdown files, one per ticket.
- A ticket is a single finding by default; grouping (one ticket covering N closely-related findings) is a per-report option, initially manual.
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

Not decided. Options:

- **Jinja2** — most flexible, most popular, Python-native.
- **Mustache / Handlebars** — logic-less, cleaner separation.
- **Pure markdown with front matter and string substitution** — no templating engine, simplest.

Leaning Jinja2 unless we find a reason not to. Marked as ADR-008 in the forecast list.

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
```

CLI-first because:

- Fits an analyst's existing workflow (terminal-heavy, invoked on-demand during active work).
- Fastest to build.
- Doesn't constrain the eventual UI (a web/TUI can wrap a CLI; it's harder the other way).

A web UI is explicitly slice-3-or-later.

## Storage

Slice 1 uses **SQLite + a flat-file artifact store**. Decision pending an ADR (ADR-004) but this is the default.

- SQLite for Org, Target, Finding, Report tables.
- Artifacts stored on disk under `artifacts/<hash-prefix>/<hash>` — content-addressed.
- Reports rendered to `reports/<org-slug>/<period>/...` per the naming convention above.

Reasons over Postgres in slice 1: zero operational overhead, embeds in the product, handles anything short of millions of findings without complaint. Reasons to consider Postgres later: concurrent multi-user access, richer query language. Neither is a slice 1 problem.

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
- Dedup across runs against the same org actually works. Re-ingesting last week's Nessus scan doesn't double-count.
- Two reports for the same org over different but overlapping windows (e.g. "all of Q1" and "March alone") both correctly contain the overlapping findings.
- At least one analyst (Eli) has used it on a real piece of work and not hated it.

## Related

- [[product/vision|Vision]]
- [[product/slices|Slice Plan]]
- [[product/scope|Scope]]
- [[product/users-and-jobs|Users & Jobs]]
- [[synthesis/open-questions|Open Questions]]
- [[decisions/README|ADR Index]]
- [[sessions/2026-04-22-slice-1-kickoff|Session: Slice 1 Kickoff]]
