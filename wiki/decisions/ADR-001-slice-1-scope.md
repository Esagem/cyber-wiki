---
title: "ADR-001: Slice 1 scope — Ingest & Report"
category: decisions
tags: [adr, slice-1, scope, ingest, triage, report]
status: proposed
confidence: medium
owner: shared
adr: ADR-001
created: 2026-04-23
updated: 2026-04-23
superseded_by: ""
---

# ADR-001: Slice 1 scope — Ingest & Report

## Context

CSAK's product shape is a four-step pipeline: **target intake → collect → triage → report**. This is more than a single release can ship well. We need an explicit first slice so we can start building instead of continuing to design in the abstract.

The [[product/slices|slice plan]] sketches four slices:

- **Slice 1** — Ingest & Report (user brings tool output, CSAK triages and reports).
- **Slice 2** — Tool Orchestration (CSAK runs the tools).
- **Slice 3** — Recursion + Catalog Expansion.
- **Slice 4+** — deliberately undefined; scheduled/automated generation likely lives here.

The [[specs/slice-1|slice 1 spec]] draft captures what we currently think goes in slice 1, but the scope has not been formally committed. Several downstream decisions (ADR-004 storage, ADR-008 template language) can't be made without slice 1's boundary nailed down.

Competitive research ([[competitive/defectdojo|DefectDojo]], [[competitive/reconftw|reconFTW]], [[competitive/leverage-analysis|Leverage Analysis]], [[competitive/build-vs-adapt|Build vs Adapt]]) confirms that slice 1 has real competitors and that our differentiation depends on shipping a specific shape, not a generic "vuln management tool."

The 2026-04-23 correction to [[sessions/2026-04-22-slice-1-kickoff|session notes]] clarified that CSAK is primarily **on-demand / real-time** — reports have time-window structure but invocation is analyst-driven, not scheduled. This ADR makes that boundary explicit.

## Decision

> **Slice 1 ships "Ingest & Report": CSAK accepts pre-collected output from five specific tools, normalizes findings into an Org → Target → Finding data model, triages deterministically, and emits on-demand reports scoped to (org, time window). Tool execution, automatic tool selection, recursion, scheduled generation, and streaming detection are all out of slice 1.**

Concretely, slice 1 is bounded by the following commitments:

**In scope.**

- On-demand CLI invocation, with latency target of seconds to a few minutes per report on an analyst's laptop.
- Ingest from five starter tool formats: Nuclei (JSON), Nessus Essentials (`.nessus` XML), Zeek (TSV/JSON logs), osquery (JSON query results), Subfinder + httpx (JSON).
- Data model: Org → Target → Finding, plus an immutable Artifact layer for raw inputs and a Report layer for time-bounded snapshots.
- Deterministic triage: severity (mapped via versioned per-tool tables) × confidence (tool-reported or CSAK defaults) × target weight (analyst-configurable, default 1.0).
- Dedup within and across runs per (org, tool, tool-specific dedup key).
- Two report kinds: Internal Review (markdown, for the analyst team) and Fix-it Ticket Bundle (directory of markdown tickets, for the team being monitored).
- Reports are frozen at generation — `finding_ids` are captured so regenerating produces the same deliverable.
- Minimal CLI: `csak org create`, `csak ingest`, `csak triage`, `csak report generate`, `csak findings list`, `csak target list`.

**Out of scope.**

- Tool execution (moves to slice 2).
- Automatic tool selection (slice 2).
- Recursion and chained tool runs (slice 3).
- Scheduled or automated report generation (slice 4+).
- Streaming or continuous detection — indefinitely out of scope, SIEM territory.
- Bidirectional integration with external systems (Jira, Slack, ServiceNow).
- Multi-user, multi-tenant beyond org separation in the data model.
- Authentication beyond "single user on their own machine."
- Web UI.
- LLM in triage scoring, ingest parsing, or tool selection. (LLM is permitted, case-by-case, for report-layer tasks like plain-language impact sections, finding grouping, and period summaries.)

**Not decided by this ADR** (these have their own forecasted ADRs):

- Storage backend — ADR-004.
- Template language — ADR-008.
- Whether to also accept DefectDojo JSON exports and reconFTW `report/report.json` as ingest formats in slice 1 vs. a later slice.
- Whether Finding status includes `false-positive` as distinct from `suppressed`.
- Whether the data model grows a fourth layer (Scan / Run / Test) between Target and Finding.

## Options considered

### Option A — Ship the full four-step pipeline before v0 (rejected)

Build ingest, orchestration, triage, reporting, and recursion all before any release.

**Pros:** the story is complete at launch; nothing feels missing.

**Cons:** years of work before anything is usable; orchestration and recursion are the two hardest parts and block everything else; no way to validate the triage and report layer against real data until the end; high risk of building the wrong thing across the entire pipeline.

### Option B — Ship "Ingest & Report" first (selected)

Build the last two steps (triage + report) against analyst-provided tool output. No tool execution, no recursion, no scheduling.

**Pros:** smallest slice that produces something genuinely usable; the hard design questions (data model, triage scoring, report format) get tested against real data early; differentiating features (narrative fix-it tickets, multi-axis triage, open-source LLM use) all live in this slice and ship in v0; on-demand invocation is natural because the analyst is already running the tools — CSAK just needs to consume their output.

**Cons:** "bring your own tool output" is a harder sell than a single-command "scan this target"; users who want orchestration will wait for slice 2; doesn't directly displace reconFTW for bug-bounty-style workflows.

### Option C — Ship "Orchestration only" first (rejected)

Build slice 2 first: CSAK runs the tools, dumps their output, user reads raw output. No triage or unified reporting.

**Pros:** solves the pain point of "installing and configuring 80 tools"; easier to demo.

**Cons:** this is exactly what reconFTW already does, better, and for free. Without triage or reports, CSAK would be strictly worse than reconFTW for its target use case, with no differentiation. Also defers every interesting design decision (data model, triage scoring, reporting) and risks building an orchestrator shaped wrong for what slices 2+ actually need.

### Option D — Ship "Triage only" first (rejected)

CSAK accepts pre-normalized findings and triages them, skipping ingest. Users are responsible for format conversion.

**Pros:** the smallest possible slice; lets us validate triage design in isolation.

**Cons:** too small to be useful to anyone; nobody has pre-normalized findings lying around; defers the parser work that has to happen eventually and gives us no feedback on whether our data model survives real tool output.

## Rationale

We picked Option B because:

1. **It produces something useful end-to-end.** An analyst with a Nessus file and a Zeek directory can generate a coherent report on day one of slice 1 shipping. That's a real deliverable, not a half-product.

2. **It tests the hardest design decisions first.** The data model (Org → Target → Finding + Artifact + Report), the triage scoring (severity × confidence × target weight), and the report formats (Internal Review + Fix-it Ticket Bundle) are the parts of CSAK that are genuinely novel. If any of these are wrong, we need to know before spending slice-2 time on orchestration that depends on them.

3. **It lets orchestration (slice 2) be designed against a working triage and report layer.** Building orchestration without knowing what the downstream consumer needs is how reconFTW ended up bash-shaped — the output formats were whatever was expedient at the time. CSAK slice 2's tool execution can be designed specifically to produce what slice 1's parsers want.

4. **It carves out a defensible niche against DefectDojo.** DefectDojo covers ingest + dedup + tracking but does not do narrative fix-it tickets, multi-axis triage with confidence and target-weight, or open-source LLM integration. Slice 1's feature set maps onto exactly the gaps DefectDojo leaves. Positioning a slice 2 alone (orchestration) against reconFTW would be harder.

5. **On-demand invocation is natural for this slice.** If the analyst is the one running the tools, they already know when they have new data. They want CSAK to consume it and produce a report *now*, not on a cron schedule. This also avoids taking on any daemon / watcher / scheduled-job complexity in v0.

**What would have to change for us to revisit:**

- If feedback from the first real use indicates that "bring your own tool output" is unusable friction — analysts won't use CSAK until it also runs the tools — we'd need to collapse slices 1 and 2 into one slice or invert the order.
- If DefectDojo's BSD 3-Clause positioning becomes moot (e.g. because DefectDojo releases a CLI with narrative reports and opens up its AI tier), the slice 1 differentiation weakens and we'd need to rethink.
- If LLM in the report layer turns out to be substantially worse than we hope (too token-expensive, too hallucination-prone), the "narrative fix-it tickets" differentiator weakens and slice 1's value prop shrinks.

## Consequences

**Positive.**

- Downstream ADRs (ADR-004 storage, ADR-008 template language, ADR-002 user persona if we write one) can now be written against a committed slice 1 scope.
- The slice 1 spec transitions from `draft` toward `active` once Eli reviews.
- Implementation can begin. The exit criteria in the slice 1 spec become the definition of done.
- Differentiation against DefectDojo and reconFTW is now explicit and defensible.

**Negative.**

- Users who expect "one command scans my target" won't get what they want until slice 2.
- CSAK's first release will be more awkward to demo than an orchestrator would be — it requires explaining the BYO-output model.
- The parser work for five tools is nontrivial and front-loaded; we eat that cost before we see whether the overall shape is right.

**Neutral.**

- The data model commits to Org → Target → Finding with Artifact and Report layers. The question of a fourth layer (Scan / Run / Test) is deferred, not answered. If slice 1 implementation surfaces real pain from the missing layer, we revisit in a follow-up ADR.
- The five starter tools commit us to parsers for exactly those formats in v0. Adding a sixth (for example, generic CSV or DefectDojo JSON export) is a small, bounded decision — not a scope expansion.

## Follow-ups

- [[specs/slice-1|Slice 1 Spec]] — transition from `draft` to `active` after Eli's review, referencing this ADR.
- [[product/slices|Slice Plan]] — add a "see ADR-001" link to the slice 1 entry.
- **ADR-004** — Storage backend. Forecast: SQLite + flat-file artifact store; needs its own ADR.
- **ADR-008** — Template language for reports. Forecast: Jinja2.
- **Open questions** to keep tracking in [[synthesis/open-questions|open-questions]] rather than resolving here:
    - Target nesting rules (full child target per subdomain vs. identifier vs. hybrid).
    - Whether `false-positive` is a distinct Finding status from `suppressed`.
    - Whether slice 1 adds DefectDojo / reconFTW output formats as ingest inputs.
    - Whether triage re-runs automatically when scoring rules change.
- Update the [[_index|master index]] recent-activity section when this ADR is accepted.

## Related

- [[specs/slice-1|Slice 1 Spec]]
- [[product/vision|Vision]]
- [[product/slices|Slice Plan]]
- [[product/scope|Scope]]
- [[competitive/defectdojo|DefectDojo]]
- [[competitive/reconftw|reconFTW]]
- [[competitive/build-vs-adapt|Build vs Adapt]]
- [[sessions/2026-04-22-slice-1-kickoff|2026-04-22 Session Notes]]
- [[synthesis/open-questions|Open Questions]]
