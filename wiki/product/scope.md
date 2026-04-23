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

> Reframed 2026-04-22 to reflect the slice-based plan. Corrected 2026-04-23 to separate invocation modes (on-demand vs. streaming vs. scheduled) — the earlier version over-indexed on "periodic report mode."

The slice-based approach makes scope a moving target by design — what's "in" depends on which slice you're asking about. This page summarizes the boundaries; the per-slice specs hold the details.

## Invocation modes (cross-slice)

Before the per-slice scope, it's worth naming how CSAK is *used*:

- **On-demand / real-time** — in scope from slice 1. Analyst runs CSAK during active work and expects output immediately (seconds to minutes). This is the default usage pattern.
- **Streaming / continuous detection** — indefinitely out of scope. Watching a data source and firing on events as they arrive is SIEM territory; CSAK reads SIEM output but doesn't replace a SIEM.
- **Scheduled / automated report generation** — slice 4+. "Every Monday regenerate the weekly reports for all active orgs." Not designed yet. Useful, but not urgent.

Report *structure* being (org, time window) is independent of invocation *cadence*. A "May 2026 update" can be generated on May 31st, on June 15th, or regenerated six months later — the structure is the same, the invocation is whenever the analyst asks.

## Slice 1 — Ingest & Report

### In scope

- **On-demand invocation.** Analyst runs CSAK when actively working on a target; output arrives in seconds to minutes.
- **Ingest** from 5 specific tool formats: Nuclei JSON, Nessus XML, Zeek logs, osquery JSON, Subfinder + httpx JSON.
- **Three-layer data model**: Org → Target → Finding, plus immutable Artifact and frozen Report entities.
- **Deterministic triage** with explicit, versioned scoring tables.
- **Cross-run dedup** within an org: re-ingesting last week's scan doesn't double-count.
- **Two report families** scoped to (org, time window): internal review and fix-it ticket bundle. Report windows are whatever the analyst specifies — from "today" to "all of 2026."
- **CLI** as the only invocation surface.
- **SQLite + flat-file artifact store** (pending ADR-004).
- **Single-user, single-machine** operation. No auth.

### Explicitly out of scope (slice 1)

- Tool execution / orchestration (→ slice 2).
- Tool selection (→ slice 2).
- Recursion (→ slice 3).
- Scheduled / automated report generation (→ slice 4+).
- Streaming or continuous detection (indefinitely out of scope — SIEM territory).
- Web UI.
- Bidirectional integrations with ticketing systems.
- Multi-user features (RBAC, sharing, comments).
- LLM-driven anything that doesn't beat a deterministic alternative on a specific task.

See [[specs/slice-1|Slice 1 Spec]] for the full breakdown.

## Slice 2 — Tool Orchestration (preview)

Adds CSAK's ability to **run tools itself** against a target. The slice 1 ingest pipeline becomes the back end; slice 2 puts a "collect" stage in front of it.

Open questions for slice 2 to settle before it starts:

- Tool selection strategy (heuristic / config / LLM-assisted).
- Execution model (subprocess / container / mixed).
- How CSAK infers tool parameters from a target.
- Long-running tool handling.

## Slice 3 — Recursion & Catalog (preview)

Adds:

- **Recursion with budgets** — tool output can trigger further runs, with explicit time/depth/cost ceilings.
- **Tool catalog growth** — adding a new tool becomes a user-facing operation, not a code change.

Most slice 3 design will only make sense after slice 2 has taught us what real orchestration patterns look like.

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
- Conversational LLM chat interface inside the product. (LLM-assisted *authoring* is in scope; a chat UI is not.)

## Open scope questions

These don't block any specific slice but will shape the eventual product:

1. **Is CSAK kept internal to Surge Studios, open-sourced, or sold?** Eli's posture: don't let this drive design — make the best tool possible and distribution sorts itself out.
2. **Is the customer individual analysts, teams, or consultancies?** Slice 1 is built for individual-analyst use. Team features are not on any slice.
3. **Greenfield vs. integrate-with-existing.** If a team already runs DefectDojo or Faraday, is CSAK a replacement, a complement, or neither? Needs competitive analysis (see [[competitive/README|competitive/]]).
4. **What's the v0 story for non-vulnerability findings** (config drift, policy violations, anomalies)? Slice 1's ingest set handles some of these (osquery for config, Zeek for anomaly-adjacent), but the triage model is still vuln-centric. Worth revisiting after slice 1 hits reality.

## How scope changes get decided

Scope decisions escalate to ADRs. When we pick a direction on any of the above, it becomes `ADR-NNN-scope-<topic>.md` in [[decisions/README|decisions/]]. The first scope ADR (ADR-001) will likely freeze slice 1's scope after Eli's review settles.

## Related

- [[product/vision|Vision]]
- [[product/slices|Slice Plan]]
- [[specs/slice-1|Slice 1 Spec]]
- [[decisions/README|ADR Index]]
- [[synthesis/roadmap|Design-phase Roadmap]]
