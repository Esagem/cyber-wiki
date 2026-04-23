---
title: "Roadmap"
category: synthesis
tags: [roadmap, sequencing, priorities]
status: draft
confidence: medium
owner: shared
created: 2026-04-21
updated: 2026-04-23
---

# Roadmap

> Rough sequencing of what we're designing next. This is a *design* roadmap, not a build roadmap — it describes when we expect to converge on each set of decisions. Build starts after the exit criteria at the bottom.

## Phase 0 — Framing (done)

- [x] Slice plan adopted ([[product/slices|slices]]).
- [x] Initial scope committed ([[product/scope|scope]]).
- [x] Five starter tools for slice 1 chosen.
- [x] First working session logged ([[sessions/2026-04-22-slice-1-kickoff|2026-04-22]]).

## Phase 1 — Slice 1 design (nearly done)

**Goal:** slice 1 spec is detailed, justified, and reviewed — detailed enough that someone could start coding from it.

- [x] Every open question in [[synthesis/open-questions|open-questions]] affecting slice 1 is either answered or explicitly deferred. *(Closed 2026-04-23; all slice 1 questions live in the Answered section.)*
- [x] First wiki lint pass after slice 1 finalization. *(Completed 2026-04-23; see [[synthesis/lint-report|lint report]].)*
- [x] Second wiki lint pass after first-round fixes. *(Completed 2026-04-23.)*
- [x] [[specs/slice-1|slice 1 spec]] signed off by Eli and moved `draft` → `active`. *(Approved 2026-04-23.)*
- [ ] [[architecture/overview|architecture/overview]] written — diagram and narrative covering ingest → triage → report end to end. **The last remaining phase 1 blocker to pre-design exit.**
- [ ] [[architecture/data-flow|architecture/data-flow]] written — concrete flow from Artifact ingest through Finding triage to Report render. Medium priority; may end up as a section of architecture/overview rather than its own page.
- [ ] Subsystem specs split out if the slice 1 spec is doing too much in practice: [[specs/ingestion-model|ingestion-model]], [[specs/triage-model|triage-model]], [[specs/report-formats|report-formats]]. Low priority — slice 1 spec currently covers these in enough detail.

## Phase 2 — Competitive grounding (in progress)

**Goal:** we know what already exists so we don't reinvent.

- [x] [[competitive/defectdojo|DefectDojo]].
- [x] [[competitive/reconftw|reconFTW]].
- [x] [[competitive/leverage-analysis|leverage analysis]] and [[competitive/build-vs-adapt|build-vs-adapt]] — what we can borrow, what we build fresh.
- [ ] Faraday, PlexTrac, AttackForge.
- [ ] Splunk, Wazuh, Tenable (boundary documentation — what CSAK is explicitly not).
- [ ] One LLM-powered upstart (XBOW or NodeZero).
- [ ] Synthesis page: what's missing from the market that CSAK fills.

Phase 2 can continue in parallel with build; none of it is load-bearing for starting slice 1 implementation.

## Phase 3 — Slice 2 design (not yet started)

Triggered when slice 1 is close to build-ready.

Open questions to resolve (currently in [[synthesis/open-questions|open-questions]] slice 2 section):

- reconFTW — replace, augment, or integrate?
- Tool selection strategy.
- Execution model (subprocess / container / mixed).
- Parameter inference.
- Long-running tool handling.
- Whether generic-CSV ingest and reconFTW JSON ingest land here or later.
- Adaptive rate limiting as a slice 2 requirement.

## Exit criteria — "pre-design → build"

We leave pre-design when:

- [x] Slice 1 spec is `active` (sign-off complete).
- [ ] [[architecture/overview|architecture overview]] is written so a newcomer can understand the pipeline shape without reading the full spec.
- [x] Competitive grounding is deep enough we're not surprised by an obvious prior art during implementation. *(DefectDojo and reconFTW covered; the rest can land in parallel with build.)*
- [x] Eli has reviewed and signed off. *(2026-04-23.)*
- [ ] We both feel we could answer "what is CSAK" in one breath and describe slice 1 in three sentences.

**One remaining hard blocker (architecture overview) and one soft check (the elevator-pitch test) before build starts.**

At that point this wiki shifts role: it becomes the reference alongside a build repo, rather than the primary working surface.

## Related

- [[product/scope|Scope]]
- [[specs/slice-1|Slice 1 Spec]]
- [[synthesis/open-questions|Open Questions]]
- [[synthesis/lint-report|Lint Report]]
