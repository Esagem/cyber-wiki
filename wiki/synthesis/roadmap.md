---
title: "Roadmap"
category: synthesis
tags: [roadmap, sequencing, priorities]
status: draft
confidence: low
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

## Phase 1 — Slice 1 design (we are here)

**Goal:** slice 1 spec is detailed, justified, and reviewed — detailed enough that someone could start coding from it.

- [ ] Every open question in [[synthesis/open-questions|open-questions]] affecting slice 1 is either answered or explicitly deferred.
- [ ] [[specs/slice-1|slice 1 spec]] moves `draft` → `active` after Eli's review.
- [ ] [[architecture/overview|architecture/overview]] written — diagram and narrative covering ingest → triage → report end to end.
- [ ] [[architecture/data-flow|architecture/data-flow]] written — concrete flow from Artifact ingest through Finding triage to Report render.
- [ ] Subsystem specs split out where the slice 1 spec is doing too much: [[specs/ingestion-model|ingestion-model]], [[specs/triage-model|triage-model]], [[specs/report-formats|report-formats]].

## Phase 2 — Competitive grounding (in progress)

**Goal:** we know what already exists so we don't reinvent.

- [x] [[competitive/defectdojo|DefectDojo]].
- [x] [[competitive/reconftw|reconFTW]].
- [x] [[competitive/leverage-analysis|leverage analysis]] and [[competitive/build-vs-adapt|build-vs-adapt]] — what we can borrow, what we build fresh.
- [ ] Faraday, PlexTrac, AttackForge.
- [ ] Splunk, Wazuh, Tenable (boundary documentation — what CSAK is explicitly not).
- [ ] One LLM-powered upstart (XBOW or NodeZero).
- [ ] Synthesis page: what's missing from the market that CSAK fills.

## Phase 3 — Slice 2 design (not yet started)

Triggered when slice 1 is close to build-ready.

Open questions to resolve (currently in [[synthesis/open-questions|open-questions]] slice 2 section):

- reconFTW — replace, augment, or integrate?
- Tool selection strategy.
- Execution model (subprocess / container / mixed).
- Parameter inference.
- Long-running tool handling.

## Exit criteria — "pre-design → build"

We leave pre-design when:

- Slice 1 spec is `active` (all its open questions answered or explicitly deferred).
- Architecture overview and data-flow pages are written.
- Competitive grounding is deep enough we're not surprised by an obvious prior art during implementation.
- Eli has reviewed and signed off.
- We both feel we could answer "what is CSAK" in one breath and describe slice 1 in three sentences.

At that point this wiki shifts role: it becomes the reference alongside a build repo, rather than the primary working surface.

## Related

- [[product/scope|Scope]]
- [[specs/slice-1|Slice 1 Spec]]
- [[synthesis/open-questions|Open Questions]]
