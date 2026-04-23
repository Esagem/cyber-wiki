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

## 2026-04-23 — second pass (after the first round of fixes)

Triggered by: "lint the wiki one more time" request after the first round of fixes landed.

### Summary

The first pass caught the product-layer pages (vision, scope, slices, users-and-jobs, glossary) and two of the four competitive pages (defectdojo, leverage-analysis). This pass caught three remaining stale references in the competitive cluster that the first pass missed — all from the same late-April decision sweep, all in places that got rewritten once but not twice.

No contradictions found in the product-layer pages or the spec. No new issues in the session notes, index, roadmap, or glossary.

Severity scale below, unchanged: **critical** (misleads readers about a finalized decision), **high** (contradicts a finalized decision or points at a deleted page), **medium** (stale but not contradictory), **low** (cosmetic).

### High

**H2-1. `competitive/reconftw.md` "Design changes this research suggests" still recommends slice 1 ingest of reconFTW JSON.**
- Bullet: "Add reconFTW's `report/report.json` as a potential slice 1 ingest format. Either in the initial 5 or as a stretch goal."
- Reality per [[specs/slice-1|slice 1 spec]]: reconFTW JSON is explicitly deferred out of slice 1. The parser architecture supports adding it later; slice 1 stays scoped to the five committed formats.
- Same pattern fixed in `defectdojo.md` first pass ("Design changes" → "How this research influenced the spec"); same fix applies here.
- Fix: rewrite the "Design changes this research suggests" section to record how each surfaced question was resolved (JSON ingest deferred, Quick Rescan / adaptive rate limiting both noted as slice 2 material, license ambiguity still open).

**H2-2. `competitive/README.md` "Key takeaways so far" item 3 claims CSAK accepts DefectDojo and reconFTW JSON as slice 1 ingest formats.**
- Exact wording: "CSAK can accept both DefectDojo JSON exports and reconFTW `report/report.json` as slice 1 ingest formats."
- Also in the index row for `leverage-analysis`: "ingest both tools' output formats in slice 1."
- Reality: both deferred out of slice 1.
- Fix: rewrite item 3 and the leverage-analysis index row to say "slice 2 candidates, not slice 1."

**H2-3. `competitive/build-vs-adapt.md` — one stale clause about slice 1 LLM prototyping.**
- In the `reconftw_ai` recommendation: "We'll prototype LLM use in slice 1 against our own structured data."
- Reality: slice 1 has no LLM use at all. A later slice layers LLM over slice 1's JSON export.
- Fix: adjust the sentence to point at the later LLM layer rather than claiming slice 1 prototypes LLM use.

### Medium

**M2-1. `engagements-RESERVED/README.md` confidence field is `high` on a `seed` page.**
- The content is fine — it's a deliberate placeholder that correctly notes the Org entity may obsolete it.
- Confidence `high` on a `seed` page is slightly odd (usually `seed` pages are `low` confidence because the content is stub-level) but defensible here — the status is `seed` because no real content exists, while the confidence refers to the meta-claim "this folder exists as a deliberate placeholder," which is in fact high-confidence.
- No fix required; noted for completeness.

### Low

**L2-1. `competitive/leverage-analysis.md` is still marked `draft` / confidence `medium`.**
- After the first-pass rewrite, the page is a pretty comprehensive and settled analysis. Could arguably bump to `active`.
- Not a correctness issue. Leaving as-is unless a future pass confirms it's stable.
- No fix required this pass.

**L2-2. `synthesis/open-questions.md` has a slice-2 row labeled "deferred" in the Status column.**
- The status vocabulary per CYBER.md §4 is `seed | draft | active | mature | planned | retired | superseded` — none of these are `deferred`.
- But: the Status column in open-questions has never strictly followed the CYBER.md status vocabulary — it uses question-lifecycle values (`open | in-progress | answered | dropped`) and the ad-hoc `deferred`. That's a reasonable choice for a question tracker; the CYBER.md vocabulary doesn't fit.
- No fix required; the open-questions table has its own internal convention and it's consistent within itself.

### What I checked this pass

- Every page in the wiki (20 pages, including the new lint report).
- Every instance of "slice 1" paired with "ingest," "DefectDojo," "reconFTW," "JSON," "LLM."
- Every "Design changes this research suggests" heading (to make sure the first-pass pattern was applied consistently).
- Every "Key takeaways" section in the competitive pages.
- Every "Related" section for deleted-page links (all clean).
- Every front-matter `status` / `confidence` combination for obvious mismatches.
- Full-text search for "three-layer", "Report entity", "ADR", and "periodic" — no new drift, all hits are in historical-context sections that correctly describe past state.

### What's intentionally not changing

- References to ADR-001 and ADR-004 in `_log.md` — the log is append-only and correctly records the creation-then-deletion as history. Not a lint issue.
- References to the old three-layer model in session notes — correctly framed as "used to be." Historical record.
- The `engagements-RESERVED/` folder's `status: seed`. It's a deliberate placeholder; no real content belongs until activation.

### Proposed action plan

Three fixes. All are rewrites of specific sections, not full-page rewrites.

1. **`competitive/reconftw.md`** — rewrite the "Design changes this research suggests" section to match the "How this research influenced the spec" pattern already applied to `defectdojo.md` first pass. Move reconFTW JSON ingest to "deferred, parser architecture supports adding it." Keep Quick Rescan / adaptive rate limiting as slice 2 notes.
2. **`competitive/README.md`** — rewrite "Key takeaways" item 3 (remove "slice 1 ingest" claim) and the leverage-analysis index row.
3. **`competitive/build-vs-adapt.md`** — fix the one stale sentence in the `reconftw_ai` recommendation. Point at the future LLM layer rather than slice 1 prototyping.

---

## 2026-04-23 — first pass after slice 1 finalization

Triggered by: "lint the wiki" request after slice 1 spec was finalized and the ADR scaffolding was deleted.

### Summary

Slice 1 design is final, but several pages around it are stale. The spec and open-questions are current; the product-layer pages (vision, scope, slices, users-and-jobs) predate the major late-April decisions (Scan entity, stateless reports, no LLM in slice 1, markdown+docx+JSON exports, no retriage). Three leftover ADR references remain, and the glossary is a pre-ADR-removal artifact. None of this is dangerous, but it will mislead anyone reading the wiki top-down.

Severity scale: **critical** (misleads readers about a finalized decision), **high** (contradicts a finalized decision or points at a deleted page), **medium** (stale but not contradictory), **low** (cosmetic).

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
- **STATUS: Fixed 2026-04-23.**

**C-2. `product/scope.md` — same data-model and LLM drift.**
- "Three-layer data model" → four layers now.
- Lists LLM as an in-scope concern for slice 1 ("LLM-driven anything that doesn't beat a deterministic alternative on a specific task"). Reality: no LLM in slice 1 at all.
- Mentions "SQLite + flat-file artifact store" as the in-scope storage. Correct, but phrasing is dated.
- Fix: replace slice 1 in-scope / out-of-scope lists with the version from the finalized [[specs/slice-1|slice 1 spec]].
- **STATUS: Fixed 2026-04-23.**

**C-3. `product/slices.md` slice 1 section is outdated.**
- Says slice 1 exit criteria include "Reports for each of the 5 tool formats are good enough to hand to a real analyst without embarrassment" — fine but incomplete.
- Says "one internal review per target" and "one fix-it ticket bundle per target" — reality: reports are scoped per (org, time window), not per target.
- Does not mention docx, JSON, or the stateless-reports model.
- Fix: tighten the slice 1 section to match [[specs/slice-1|slice 1 spec]]. Summary-level, not a re-spec.
- **STATUS: Fixed 2026-04-23.**

### High

**H-1. Three dangling references to deleted ADRs.**
- [[competitive/leverage-analysis|leverage-analysis]] references "ADR-009" in its recommendations list ("Defer the 'fork vs integrate' question for slice 2. That's ADR-009's job...").
- [[competitive/build-vs-adapt|build-vs-adapt]] does not appear to reference any ADR directly — spot-check confirms this.
- [[competitive/defectdojo|defectdojo]] references a separate "Report" entity and a three-layer data model in its "Design changes this research suggests" section. Design changed: Scan entity now exists, Report entity removed.
- Fix: remove the ADR-009 reference in leverage-analysis. Update defectdojo's "Design changes this research suggests" to reflect that the fourth-layer question was resolved (Scan entity added) and that DefectDojo's generic-CSV influence was deferred rather than accepted into slice 1.
- **STATUS: Fixed 2026-04-23.**

**H-2. `product/users-and-jobs.md` anti-persona bullet contradicts current spec.**
- Anti-persona list says: "The FAANG SOC analyst. They have dedicated detection-engineering, real-time alerting, and bespoke tooling. CSAK's periodic-report shape doesn't fit their workflow."
- "Periodic-report shape" is the framing we explicitly corrected on 2026-04-23. CSAK is on-demand / real-time.
- Fix: rewrite that bullet to say the FAANG SOC anti-persona is out because they have dedicated SIEM / detection engineering, not because CSAK is periodic.
- **STATUS: Fixed 2026-04-23.**

**H-3. Glossary is pre-ADR-removal and pre-slice-1-final.**
- `product/glossary.md` under "Terms we're unsure about" says: "**Importance** vs. **severity** vs. **priority** — the original framing used 'level of importance.' Is that the same as severity × confidence × business context? Needs an ADR to disambiguate."
- Resolved: priority = severity × confidence × target_weight × probability_real (slice 1 spec §Scoring). "Importance" is not a term we use. No ADR needed; the spec carries the definition.
- Says "Source — the raw artifact an ingestor consumes." Reality: we use `Artifact` consistently in the spec. "Source" is not the canonical term.
- Missing key spec terms: Scan, FindingScanOccurrence, target_weight, probability_real, Artifact (as defined), Org, Target.
- "Engagement" is defined but not used in slice 1 spec; it may be a slice-2+ concept.
- "Playbook" is defined but not used anywhere in the spec; speculative vocabulary.
- "Ingestor" vs "adapter" is still flagged as "pick one" — open-questions doesn't track this anymore. Pick `ingestor`.
- Fix: rewrite the glossary to reflect slice 1 vocabulary. Mark `Engagement` and `Playbook` as future/not-yet-used. Add missing terms. Drop the "needs an ADR" language.
- **STATUS: Fixed 2026-04-23.**

### Medium

**M-1. Status mismatch: slice 1 spec is still `draft`, but it's behaviorally finalized.**
- The spec header now reads "Finalized 2026-04-23. All open questions closed. Status stays `draft` until Eli's sign-off review; then `active`."
- This is correct — it waits for Eli's review. Noted here so it doesn't get missed at lint time.
- Fix: flip to `active` after Eli reviews. No action required yet.
- **STATUS: Still pending Eli's sign-off.**

**M-2. `_index.md` recent-activity section is one iteration behind.**
- Most recent entry is "2026-04-23 (ADR scaffolding removed)." Since then: slice 1 fully finalized (data model closed, Scan entity added, reports made stateless, docx committed to python-docx, JSON promoted to first-class, LLM removed from slice 1, retriage dropped). None of that is reflected in the index.
- Fix: add a "2026-04-23 (slice 1 finalized)" entry summarizing the closure.
- **STATUS: Fixed 2026-04-23.**

**M-3. `synthesis/roadmap.md` is partially stale.**
- Phase 1 checklist includes "Every open question in [[synthesis/open-questions|open-questions]] affecting slice 1 is either answered or explicitly deferred" — now true.
- Phase 1 checklist includes "`specs/slice-1` moves `draft` → `active` after Eli's review" — still pending, correct.
- Does not reflect that most of the phase-1 work is done.
- Fix: check off the completed items in the phase 1 list. Move roadmap from `seed` to `draft` at minimum.
- **STATUS: Fixed 2026-04-23.**

**M-4. `sessions/2026-04-22-slice-1-kickoff.md` "Outstanding for Claude (next session)" list is stale.**
- Says "Draft **ADR-001 (slice 1 scope boundary)**" and "Draft **ADR-004 (storage backend)**." Both ADRs were written and then deleted; rationale moved inline.
- Says "Begin competitive analysis with DefectDojo, reconFTW, and one LLM-powered upstart." Two done, upstart not.
- Fix: append a dated "Update — 2026-04-23" block at the bottom of the session notes that records what was actually done vs. what this list said, rather than editing the original list. Session notes are historical.
- **STATUS: Fixed 2026-04-23.**

**M-5. `product/users-and-jobs.md` Job 5/6 references slice 2/3 orchestration with "don't make me wire them up by hand every time" — fine, but the page doesn't reflect the current understanding that reconFTW is a likely slice 2 partner or backend.**
- Fix: add a pointer or note acknowledging that slice 2 orchestration may integrate with or delegate to reconFTW rather than building from scratch.
- **STATUS: Fixed 2026-04-23.**

### Low

**L-1. `research/README.md` has a typo.**
- Line: "This category holds our notes on **the world outside CSAK** — pa pers, blog posts..."
- "pa pers" should be "papers."
- Fix: trivial.
- **STATUS: Fixed 2026-04-23.**

**L-2. `CYBER.md` §9 still documents six MCP tools, which is correct, but the "Important: scope for `wiki_write` and `wiki_delete`" note references the repo-root `ONBOARDING.md` as the example of a file the tools can't reach.**
- That's correct, but the list of folders shown in §3 no longer includes `decisions/`. Just re-verify the layout diagram is consistent with reality (it is; I checked during the rewrite).
- No fix needed.
- **STATUS: No action.**

**L-3. `competitive/README.md` target list mentions "AttackForge" and "Nemesis (SpecterOps)" for slice 2.**
- No action — both are reasonable future reads, and they're clearly labeled as not-yet-written. Noted here so it doesn't feel like an omission in a future pass.
- **STATUS: No action.**

**L-4. Research category has no actual research pages — only the README.**
- This is fine for pre-design, but worth noting. Research pages tend to arrive when a specific source gets ingested. None have been yet.
- **STATUS: No action required.**

### Planned pages that remain unwritten (carry over across passes)

- `architecture/overview.md` — **priority: high**. Would be the diagram-and-narrative companion to the slice 1 spec. Useful before implementation starts.
- `architecture/data-flow.md` — **priority: medium**. Overlaps with the slice 1 spec's "How a report gets generated" section; might end up as a subset of architecture/overview rather than its own page.
- `specs/ingestion-model.md` — **priority: low**. Slice 1 spec already covers ingest in enough detail for slice 1.
- `specs/triage-model.md` — **priority: low**. Same reasoning.
- `specs/report-formats.md` — **priority: low**. Same.

Decision unchanged: keep all five as `planned` until slice 1 starts or slice 2 design opens. `architecture/overview.md` is the one flagged as worth writing before code begins.

## Related

- [[_index|Master Index]]
- [[CYBER|CYBER.md §5.4 — Lint]]
- [[specs/slice-1|Slice 1 Spec]]
- [[synthesis/open-questions|Open Questions]]
