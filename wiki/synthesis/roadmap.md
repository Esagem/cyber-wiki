---
title: "Roadmap"
category: synthesis
tags: [roadmap, sequencing, priorities]
status: draft
confidence: high
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

## Phase 1 — Slice 1 design (done)

**Goal:** slice 1 spec is detailed, justified, and reviewed — detailed enough that someone could start coding from it.

- [x] Every open question in [[synthesis/open-questions|open-questions]] affecting slice 1 is either answered or explicitly deferred. *(Closed 2026-04-23.)*
- [x] First wiki lint pass after slice 1 finalization. *(Completed 2026-04-23.)*
- [x] Second wiki lint pass after first-round fixes. *(Completed 2026-04-23.)*
- [x] [[specs/slice-1|slice 1 spec]] signed off by Eli and moved `draft` → `active`. *(Approved 2026-04-23.)*
- [x] [[architecture/overview|architecture/overview]] written — diagram, module boundaries, end-to-end walkthrough, extension points. *(Written 2026-04-23.)*
- [x] ~~`architecture/data-flow.md`~~ — folded into the overview's walkthrough section rather than written as a separate page. The two would have overlapped ~80%; one page reads cleaner.
- [ ] Subsystem specs split out if the slice 1 spec is doing too much in practice: [[specs/ingestion-model|ingestion-model]], [[specs/triage-model|triage-model]], [[specs/report-formats|report-formats]]. Low priority, deferred — slice 1 spec currently covers these in enough detail. Revisit only if implementation pressure requires it.

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

Triggered when slice 1 is close to build-ready or once build begins.

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
- [x] [[architecture/overview|architecture overview]] is written so a newcomer can understand the pipeline shape without reading the full spec.
- [x] Competitive grounding is deep enough we're not surprised by an obvious prior art during implementation. *(DefectDojo and reconFTW covered; the rest can land in parallel with build.)*
- [x] Eli has reviewed and signed off. *(2026-04-23.)*
- [ ] We both feel we could answer "what is CSAK" in one breath and describe slice 1 in three sentences. *(Soft check — the hard blockers are all met.)*

**All hard blockers are met.** The elevator-pitch check is a sanity gate rather than a gate item; clearing it is a matter of saying the pitch out loud to each other once.

At this point the wiki shifts role: it becomes the reference alongside a build repo, rather than the primary working surface.

## Outstanding non-blocking items

Tracked so they don't get lost, but none of these prevent starting slice 1 implementation:

- More competitive pages (Faraday, PlexTrac, AttackForge, Splunk, Wazuh, Tenable, an LLM-powered upstart).
- reconFTW GitHub issue on the MIT/GPL-3.0 license ambiguity. Only matters before code-level leverage, which is slice 2 territory.
- Canva pitch deck slides 4 and 8 — periodic-mode language fix. External to this wiki.
- Christopher's onboarding (repo collaborator access, Claude connector setup, Obsidian+Git sync).
- Slice 2 design questions start becoming relevant once slice 1 is in implementation.

## Related

- [[product/scope|Scope]]
- [[specs/slice-1|Slice 1 Spec]]
- [[architecture/overview|Architecture Overview]]
- [[synthesis/open-questions|Open Questions]]
- [[synthesis/lint-report|Lint Report]]
