---
title: "CSAK — Scope"
category: product
tags: [scope, in-scope, out-of-scope, slices]
status: draft
confidence: medium
owner: shared
created: 2026-04-21
updated: 2026-04-23
---

# CSAK — Scope

> Reframed 2026-04-22 to reflect the slice-based plan. Corrected 2026-04-23 to separate invocation modes (on-demand vs. streaming vs. scheduled). Rewritten 2026-04-23 to point at the finalized [[specs/slice-1|slice 1 spec]] as the authoritative source of slice-1 in/out-of-scope rather than duplicating it here.

The slice-based approach makes scope a moving target by design — what's "in" depends on which slice you're asking about. This page summarizes the boundaries across slices; the per-slice specs hold the details.

## Invocation modes (cross-slice)

Before the per-slice scope, it's worth naming how CSAK is *used*:

- **On-demand / real-time** — in scope from slice 1. Analyst runs CSAK during active work and expects output immediately (seconds to minutes). This is the default usage pattern.
- **Streaming / continuous detection** — indefinitely out of scope. Watching a data source and firing on events as they arrive is SIEM territory; CSAK reads SIEM output but doesn't replace a SIEM.
- **Scheduled / automated report generation** — slice 4+. "Every Monday regenerate the weekly reports for all active orgs." Not designed yet. Useful, but not urgent.

Report *structure* being (org, time window) is independent of invocation *cadence*. A "May 2026 update" can be generated on May 31st, on June 15th, or regenerated weeks later — the structure is the same, the invocation is whenever the analyst asks.

## Slice 1 — Ingest & Report (finalized)

[[specs/slice-1|Slice 1 Spec]] is the authoritative source. Summary:

**In scope.** On-demand CLI invocation; ingest from 5 tool formats (Nuclei, Nessus Essentials, Zeek folder-aware, osquery, Subfinder + httpx); four-layer data model (Org → Target → Scan → Finding plus Artifact); deterministic scoring at ingest time with three axes (severity × confidence × target_weight); cross-run dedup; two report kinds (Internal Review, Fix-it Bundle) scoped to (org, time window); three first-class export formats (markdown, docx, JSON). Single-user, single-machine, SQLite + flat-file storage.

**Out of scope for slice 1.** Tool execution (→ slice 2), tool selection (→ slice 2), recursion (→ slice 3), scheduled/automated report generation (→ slice 4+), streaming or continuous detection (indefinitely out), LLM use inside CSAK (later slice attaches over slice-1 outputs), re-scoring existing findings under updated tables (slice 1 scores are write-once at ingest), period summaries that diff reports against each other (slice 4+ if ever — reports are stateless), fractional "probably FP" downweighting (analyst commits via status = false-positive or doesn't), web UI, auth beyond single-user, bidirectional ticketing integrations, multi-user/multi-tenant features, any database record of past reports.

## Slice 2 — Tool Orchestration (preview)

Adds CSAK's ability to **run tools itself** against a target. The slice 1 ingest pipeline becomes the back end; slice 2 puts a "collect" stage in front of it.

Open questions for slice 2 to settle before it starts:

- Tool selection strategy (heuristic / config / LLM-assisted).
- Execution model (subprocess / container / mixed).
- How CSAK infers tool parameters from a target.
- Long-running tool handling.
- Adaptive rate limiting (reconFTW treats this as first-class; CSAK should too).
- Relationship to reconFTW (replace / augment / integrate). See [[competitive/reconftw|reconFTW]].
- Whether generic-CSV ingest and reconFTW `report/report.json` ingest land here or earlier.

## Slice 3 — Recursion & Catalog (preview)

Adds:

- **Recursion with budgets** — tool output can trigger further runs, with explicit time/depth/cost ceilings.
- **Tool catalog growth** — adding a new tool becomes a user-facing operation, not a code change.

Most slice 3 design will only make sense after slice 2 has taught us what real orchestration patterns look like.

## LLM layer (future, not yet numbered)

Attaches over slice-1-and-later structured outputs. Slice 1's JSON export is the interface. Candidate applications:

- Drafting fix-it ticket "impact in plain language" sections.
- Internal review confidence caveats.
- Narrative finding grouping beyond the deterministic dedup-key rule.
- Period summaries.

The LLM layer does not replace the deterministic core; it wraps it.

## Slice 4+ (preview, deliberately light)

Candidates — not yet designed:

- **Scheduled / automated report generation.** Cron-style or event-triggered re-runs for active orgs.
- Other ideas will surface once slices 1–3 hit reality.

## Indefinitely out of scope

These are unlikely to land in any planned slice:

- Building our own scanner.
- Building our own EDR / SIEM.
- Offering CSAK as a SaaS managed service.
- Replacing Splunk for an existing client (CSAK can read Splunk output, not become Splunk).
- Streaming / continuous detection (watching data sources and firing on events as they arrive).
- Mobile.
- Conversational LLM chat interface inside the product. (LLM-assisted *authoring* is in scope for a later slice; a chat UI is not.)

## Open scope questions

These don't block any specific slice but will shape the eventual product:

1. **Is CSAK kept internal to Surge Studios, open-sourced, or sold?** Eli's posture: don't let this drive design — make the best tool possible and distribution sorts itself out.
2. **Is the customer individual analysts, teams, or consultancies?** Slice 1 is built for individual-analyst use. Team features are not on any slice.
3. **Greenfield vs. integrate-with-existing.** If a team already runs DefectDojo or Faraday, is CSAK a replacement, a complement, or neither? Current stance in [[competitive/build-vs-adapt|build-vs-adapt]]: complement at the ingest layer, independent everywhere else.
4. **What's the v0 story for non-vulnerability findings** (config drift, policy violations, anomalies)? Slice 1's ingest set handles some of these (osquery for config, Zeek for anomaly-adjacent), but the triage model is still vuln-centric. Worth revisiting after slice 1 hits reality.

## How scope changes get recorded

Scope changes happen in the affected spec, with the rationale stated briefly in the section that makes the change. Each significant change gets a line in [[sessions/|sessions/]] noting what moved and why. No separate decision-record documents — the spec is the record.

## Related

- [[product/vision|Vision]]
- [[product/slices|Slice Plan]]
- [[specs/slice-1|Slice 1 Spec]]
- [[synthesis/roadmap|Design-phase Roadmap]]
