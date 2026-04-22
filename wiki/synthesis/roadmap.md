---
title: "Roadmap"
category: synthesis
tags: [roadmap, sequencing, priorities]
status: seed
confidence: low
owner: shared
created: 2026-04-21
updated: 2026-04-21
---

# Roadmap

> Rough sequencing of what we're designing next. This is a *design* roadmap, not a build roadmap — it describes when we expect to converge on each set of decisions. Build starts after the exit criteria at the bottom.

## Phase 0 — Framing (we are here)

**Goal:** shared vocabulary, explicit scope, known unknowns documented.

- [ ] Vision page usable as an elevator pitch ([[product/vision|Vision]]).
- [ ] Scope page with proposed in/out lists ([[product/scope|Scope]]).
- [ ] Glossary covers every term we use in more than one page ([[product/glossary|Glossary]]).
- [ ] Open questions page populated ([[synthesis/open-questions|Open Questions]]).
- [ ] First working session logged in `sessions/`.

## Phase 1 — Foundation ADRs

**Goal:** the 3-4 decisions that unlock everything else.

- [ ] ADR-001 — v0 scope boundary.
- [ ] ADR-002 — primary user persona.
- [ ] ADR-003 — architecture shape.
- [ ] ADR-004 — storage backend.

## Phase 2 — Subsystem specs

**Goal:** specs detailed enough that someone could start coding from them.

- [ ] `specs/ingestion-model.md` — concrete plugin protocol.
- [ ] `specs/triage-model.md` — scoring rules, data model.
- [ ] `specs/report-formats.md` — internal review + fix-it ticket templates.
- [ ] `architecture/overview.md` — diagram + narrative covering all three subsystems end-to-end.

## Phase 3 — Competitive grounding

**Goal:** we know what already exists so we don't reinvent.

- [ ] Pages for the obvious competitors/adjacents in `competitive/`: DefectDojo, Faraday, PlexTrac, Tines, Nuclei-derived tooling, any LLM-powered upstarts.
- [ ] Synthesis page: what's missing from the market that CSAK would fill.

## Exit criteria — "pre-design → design-done"

We leave pre-design when:

- All four Phase 1 ADRs are `accepted`.
- All three Phase 2 specs are `active` and have been reviewed by both of us.
- Remaining open questions don't block a v0 build.
- We both feel we could answer "what is CSAK" in one breath, and describe v0 in three sentences.

At that point this wiki shifts role: it becomes the reference alongside a build repo, rather than the primary working surface.

## Related

- [[product/scope|Scope]]
- [[decisions/README|ADR Index]]
- [[synthesis/open-questions|Open Questions]]
