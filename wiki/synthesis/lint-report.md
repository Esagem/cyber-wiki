---
title: "Lint Report"
category: synthesis
tags: [lint, maintenance, health]
status: active
confidence: high
owner: shared
created: 2026-04-23
updated: 2026-04-23
---

# Lint Report

> Health snapshots of the wiki. Each dated section records what was found and what was fixed. Most entries here will become **fix tasks** rather than prose commentary.

---

## 2026-04-23 — first pass after slice 1 finalization

Triggered by: "lint the wiki" request after slice 1 spec was finalized and the ADR scaffolding was deleted.

### Summary

Slice 1 design is final, but several pages around it are stale. The spec and open-questions are current; the product-layer pages (vision, scope, slices, users-and-jobs) predate the major late-April decisions (Scan entity, stateless reports, no LLM in slice 1, markdown+docx+JSON exports, no retriage). Three leftover ADR references remain, and the glossary is a pre-ADR-removal artifact. None of this is dangerous, but it will mislead anyone reading the wiki top-down.

Severity scale below: **critical** (misleads readers about a finalized decision), **high** (contradicts a finalized decision or points at a deleted page), **medium** (stale but not contradictory), **low** (cosmetic).

### Critical

**C-1. `product/vision.md` describes an outdated data model and LLM posture.**
- Says: "A separate **Report** entity captures the time-bounded snapshot — frozen at generation time."
- Reality per [[specs/slice-1|slice 1 spec]]: no Report entity. Reports are stateless exports.
- Says: "Deterministic at the core, LLM-assisted where LLMs do the job better." Lists four proposed slice-1 LLM applications in the "Still open" section.
- Reality: slice 1 has no LLM. LLM work is deferred to a later slice.
- Says: "Three layers, org at the top."
- Reality: four layers now (Org → Target → Scan → Finding), plus Artifact.
- Says: "Storage default: SQLite + flat-file artifacts (pending ADR-004)."
- Reality: decided, not pending, and ADR-004 no longer exists as a concept.
- Fix: rewrite the "Data model" section, the "LLM posture" reference, the "Settled vs. open" section, and the "How we're building it" summary to match the finalized spec.

**C-2. `product/scope.md` — same data-model and LLM drift.**
- "Three-layer data model" → four layers now.
- Lists LLM as an in-scope concern for slice 1 ("LLM-driven anything that doesn't beat a deterministic alternative on a specific task"). Reality: no LLM in slice 1 at all.
- Mentions "SQLite + flat-file artifact store" as the in-scope storage. Correct, but phrasing is dated.
- Fix: replace slice 1 in-scope / out-of-scope lists with the version from the finalized [[specs/slice-1|slice 1 spec]].

**C-3. `product/slices.md` slice 1 section is outdated.**
- Says slice 1 exit criteria include "Reports for each of the 5 tool formats are good enough to hand to a real analyst without embarrassment" — fine but incomplete.
- Says "one internal review per target" and "one fix-it ticket bundle per target" — reality: reports are scoped per (org, time window), not per target.
- Does not mention docx, JSON, or the stateless-reports model.
- Fix: tighten the slice 1 section to match [[specs/slice-1|slice 1 spec]]. Summary-level, not a re-spec.

### High

**H-1. Three dangling references to deleted ADRs.**
- [[competitive/leverage-analysis|leverage-analysis]] references "ADR-009" in its recommendations list ("Defer the 'fork vs integrate' question for slice 2. That's ADR-009's job...").
- [[competitive/build-vs-adapt|build-vs-adapt]] does not appear to reference any ADR directly — spot-check confirms this.
- [[competitive/defectdojo|defectdojo]] references a separate "Report" entity and a three-layer data model in its "Design changes this research suggests" section. Design changed: Scan entity now exists, Report entity removed.
- Fix: remove the ADR-009 reference in leverage-analysis. Update defectdojo's "Design changes this research suggests" to reflect that the fourth-layer question was resolved (Scan entity added) and that DefectDojo's generic-CSV influence was deferred rather than accepted into slice 1.

**H-2. `product/users-and-jobs.md` anti-persona bullet contradicts current spec.**
- Anti-persona list says: "The FAANG SOC analyst. They have dedicated detection-engineering, real-time alerting, and bespoke tooling. CSAK's periodic-report shape doesn't fit their workflow."
- "Periodic-report shape" is the framing we explicitly corrected on 2026-04-23. CSAK is on-demand / real-time.
- Fix: rewrite that bullet to say the FAANG SOC anti-persona is out because they have dedicated SIEM / detection engineering, not because CSAK is periodic.

**H-3. Glossary is pre-ADR-removal and pre-slice-1-final.**
- `product/glossary.md` under "Terms we're unsure about" says: "**Importance** vs. **severity** vs. **priority** — the original framing used 'level of importance.' Is that the same as severity × confidence × business context? Needs an ADR to disambiguate."
- Resolved: priority = severity × confidence × target_weight × probability_real (slice 1 spec §Scoring). "Importance" is not a term we use. No ADR needed; the spec carries the definition.
- Says "Source — the raw artifact an ingestor consumes." Reality: we use `Artifact` consistently in the spec. "Source" is not the canonical term.
- Missing key spec terms: Scan, FindingScanOccurrence, target_weight, probability_real, Artifact (as defined), Org, Target.
- "Engagement" is defined but not used in slice 1 spec; it may be a slice-2+ concept.
- "Playbook" is defined but not used anywhere in the spec; speculative vocabulary.
- "Ingestor" vs "adapter" is still flagged as "pick one" — open-questions doesn't track this anymore. Pick `ingestor`.
- Fix: rewrite the glossary to reflect slice 1 vocabulary. Mark `Engagement` and `Playbook` as future/not-yet-used. Add missing terms. Drop the "needs an ADR" language.

### Medium

**M-1. Status mismatch: slice 1 spec is still `draft`, but it's behaviorally finalized.**
- The spec header now reads "Finalized 2026-04-23. All open questions closed. Status stays `draft` until Eli's sign-off review; then `active`."
- This is correct — it waits for Eli's review. Noted here so it doesn't get missed at lint time.
- Fix: flip to `active` after Eli reviews. No action required yet.

**M-2. `_index.md` recent-activity section is one iteration behind.**
- Most recent entry is "2026-04-23 (ADR scaffolding removed)." Since then: slice 1 fully finalized (data model closed, Scan entity added, reports made stateless, docx committed to python-docx, JSON promoted to first-class, LLM removed from slice 1, retriage dropped). None of that is reflected in the index.
- Fix: add a "2026-04-23 (slice 1 finalized)" entry summarizing the closure.

**M-3. `synthesis/roadmap.md` is partially stale.**
- Phase 1 checklist includes "Every open question in [[synthesis/open-questions|open-questions]] affecting slice 1 is either answered or explicitly deferred" — now true.
- Phase 1 checklist includes "`specs/slice-1` moves `draft` → `active` after Eli's review" — still pending, correct.
- Does not reflect that most of the phase-1 work is done.
- Fix: check off the completed items in the phase 1 list. Move roadmap from `seed` to `draft` at minimum.

**M-4. `sessions/2026-04-22-slice-1-kickoff.md` "Outstanding for Claude (next session)" list is stale.**
- Says "Draft **ADR-001 (slice 1 scope boundary)**" and "Draft **ADR-004 (storage backend)**." Both ADRs were written and then deleted; rationale moved inline.
- Says "Begin competitive analysis with DefectDojo, reconFTW, and one LLM-powered upstart." Two done, upstart not.
- Fix: append a dated "Update — 2026-04-23" block at the bottom of the session notes that records what was actually done vs. what this list said, rather than editing the original list. Session notes are historical.

**M-5. `product/users-and-jobs.md` Job 5/6 references slice 2/3 orchestration with "don't make me wire them up by hand every time" — fine, but the page doesn't reflect the current understanding that reconFTW is a likely slice 2 partner or backend.**
- Fix: add a pointer or note acknowledging that slice 2 orchestration may integrate with or delegate to reconFTW rather than building from scratch.

### Low

**L-1. `research/README.md` has a typo.**
- Line: "This category holds our notes on **the world outside CSAK** — pa pers, blog posts..."
- "pa pers" should be "papers."
- Fix: trivial.

**L-2. `CYBER.md` §9 still documents six MCP tools, which is correct, but the "Important: scope for `wiki_write` and `wiki_delete`" note references the repo-root `ONBOARDING.md` as the example of a file the tools can't reach.**
- That's correct, but the list of folders shown in §3 no longer includes `decisions/`. Just re-verify the layout diagram is consistent with reality (it is; I checked during the rewrite).
- No fix needed.

**L-3. `competitive/README.md` target list mentions "AttackForge" and "Nemesis (SpecterOps)" for slice 2.**
- No action — both are reasonable future reads, and they're clearly labeled as not-yet-written. Noted here so it doesn't feel like an omission in a future pass.

**L-4. Research category has no actual research pages — only the README.**
- This is fine for pre-design, but worth noting. Research pages tend to arrive when a specific source gets ingested. None have been yet.
- No fix required.

### Planned pages that remain unwritten

Tracked here so a future pass can decide whether to write them, demote them, or drop them:

- `architecture/overview.md` — **priority: high**. Would be the diagram-and-narrative companion to the slice 1 spec. Useful before implementation starts.
- `architecture/data-flow.md` — **priority: medium**. Overlaps with the slice 1 spec's "How a report gets generated" section; might end up as a subset of architecture/overview rather than its own page.
- `specs/ingestion-model.md` — **priority: low**. Slice 1 spec already covers ingest in enough detail for slice 1. A standalone page makes sense once slice 2 starts adding more ingestors.
- `specs/triage-model.md` — **priority: low**. Same reasoning. Slice 1 spec's Scoring section is sufficient for now.
- `specs/report-formats.md` — **priority: low**. Same. Slice 1 spec's Reports section is sufficient.

Decision: keep all five as `planned` until slice 1 starts or slice 2 design opens. The `architecture/overview.md` one is the one Eli has been flagging as worth writing before build.

### Orphan / underlinked pages

No true orphans — every page is reachable from `_index.md`. Undersized inbound-link counts (pages referenced once or not at all from other design pages):

- `product/glossary.md` — only linked from `_index.md`. Should be referenced from any page using terms from it. Slice 1 spec in particular should link the Glossary in §Related.
- `research/README.md` — only `_index.md`. Could be linked from `CYBER.md §5.1`.
- `engagements-RESERVED/README.md` — only `_index.md`. That's correct; it's a placeholder.

### Contradictions between pages

**CX-1.** `product/vision.md` describes a three-layer data model with a Report entity. `specs/slice-1.md` describes a four-layer data model with no Report entity. Vision is wrong.

**CX-2.** `product/vision.md` says "LLMs are evaluated case-by-case and used where they beat deterministic alternatives." `specs/slice-1.md` says "No LLM." These are not literally contradictory — vision is written as a long-term product statement, slice 1 is a specific slice — but a reader could reasonably be confused. Vision should clarify that LLM use is a later-slice concern.

**CX-3.** `product/vision.md`'s "Still open" section lists five items, four of which are resolved (target nesting, report template language, LLM applications, org boundaries) and one of which is ambiguous (fix-it tickets one format or many). Vision should clear these.

**CX-4.** `product/scope.md` and `specs/slice-1.md` have overlapping but slightly different scope lists. They should be consistent. Recommend scope points at the spec for the authoritative list rather than duplicating.

### What I checked

- Every page in the wiki (19 pages) was opened and scanned in this pass.
- Every reference to "ADR", "decisions/", "Report entity", "three-layer", "periodic", and "LLM-assist" was spot-checked.
- Every "status" and "confidence" front matter value was compared against the page's content.
- Every "Related" section was checked for links to deleted pages.
- Every "planned" page referenced in the index was verified as still unwritten (all five are still planned).

### Proposed action plan

High-value fixes, in priority order:

1. **Rewrite `product/vision.md`** (C-1, CX-1, CX-2, CX-3). The vision is the first thing a new reader reads; it should match finalized reality.
2. **Rewrite `product/scope.md`** (C-2, CX-4). Reduce duplication with the slice 1 spec; point at it for authoritative scope.
3. **Tighten `product/slices.md`** (C-3). Summary-level only.
4. **Clean up `product/users-and-jobs.md`** (H-2, M-5). Mostly one bullet to rewrite plus one pointer to add.
5. **Rewrite `product/glossary.md`** (H-3). Add slice 1 vocabulary; remove ADR references; mark speculative terms.
6. **Fix dangling references** (H-1). Leverage-analysis and defectdojo pages.
7. **Update `_index.md` recent activity** (M-2).
8. **Update `synthesis/roadmap.md` checkboxes and status** (M-3).
9. **Append update block to `sessions/2026-04-22-slice-1-kickoff.md`** (M-4).
10. **Fix `research/README.md` typo** (L-1). Trivial; batch with anything else.

Not in this pass: writing `architecture/overview.md`. That's its own substantial piece of work.

## Related

- [[_index|Master Index]]
- [[CYBER|CYBER.md §5.4 — Lint]]
- [[specs/slice-1|Slice 1 Spec]]
- [[synthesis/open-questions|Open Questions]]
