---
title: "Lint Report"
category: synthesis
tags: [lint, maintenance, health]
status: active
confidence: high
owner: shared
created: 2026-04-23
updated: 2026-04-24
---

# Lint Report

> Health snapshots of the wiki. Each dated section records what was found and what was fixed. Most entries here will become **fix tasks** rather than prose commentary.

---

## 2026-04-24 — third pass (post slice 2 spec finalization)

Triggered by: "lint the wiki in the meantime" request after slice 2 spec was approved (`active`, high confidence) and the slice 2 tool output reference page was written.

### Summary

Slice 1 is shipped. Slice 2 spec is approved. Architecture overview reflects both. The wiki has accumulated a different kind of drift this time: **forward-looking sections written when slice 2 was an open question are now stale because slice 2 is settled.** Several pages still describe the slice 2 design space as a list of open questions when in fact those questions are answered in [[specs/slice-2|the slice 2 spec]].

The drift cluster is concentrated in the cross-slice pages (scope, slices, open-questions, users-and-jobs Job 5) and in the leverage-analysis recommendations. The slice 1 cluster is clean. The architecture overview is clean. The slice 2 spec is clean. The two competitive case studies that drive slice 2 (reconftw, build-vs-adapt) are clean.

Severity scale, unchanged: **critical** (misleads readers about a finalized decision), **high** (contradicts a finalized decision or points at a deleted page), **medium** (stale but not contradictory), **low** (cosmetic).

### High

**H3-1. `synthesis/open-questions.md` — entire slice 2 section is stale.**

Six of eight rows in the slice 2 table are now answered by [[specs/slice-2|the slice 2 spec]] but still listed as `open` or `deferred`:

- Replace/augment/integrate reconFTW → resolved. None of the three. Build our own orchestrator, adapt recipes from reconFTW with attribution. Tracked in [[competitive/build-vs-adapt|build-vs-adapt]] and the [[competitive/reconftw|reconFTW case study]].
- Tool selection (heuristic / config / LLM-assisted) → resolved. Heuristic: target type detection drives which tools run; mode flag drives intensity. Not LLM-assisted (slice 2 stays deterministic).
- Execution model → resolved. Subprocess invocation. Not container, not mixed.
- Parameter inference → resolved. Tool catalog (Python module per tool) carries per-mode invocation recipes.
- Long-running tools → resolved. Sync-only with per-stage `--timeout` flags; backgrounding is slice 3 if needed.
- Adaptive rate limiting as a slice 2 requirement → resolved. Yes, default-on.
- Generic-CSV ingest → status changes from `open` to `dropped` (deferred indefinitely; slice 2 spec out-of-scope).
- reconFTW JSON ingest → status changes from `open` to `dropped` (deferred indefinitely; slice 2 spec out-of-scope, supplanted by native orchestrator).

Plus the slice 3 row "Quick-rescan pattern" should move to `dropped` (slice 2 spec explicitly rejects it: "later slice if ever").

**Fix:** rewrite the slice 2 section. Move all eight rows to the Answered section with their resolution and a pointer to the slice 2 spec. Trim the slice 2 section in the open-questions doc to whatever remains genuinely open for slice 2.5+ (Nessus API integration is a candidate).

**H3-2. `product/scope.md` — slice 2 preview lists open questions that are all closed.**

The "Open questions for slice 2 to settle before it starts" subsection lists seven items. All seven are now resolved in the slice 2 spec. The page also links to [[competitive/reconftw|reconFTW]] for the integration question, which is fine, but the framing implies the question is still being worked.

**Fix:** rewrite the slice 2 section to point at [[specs/slice-2|the slice 2 spec]] as the authoritative source (same pattern as the slice 1 section already uses), and replace the "open questions" subsection with a one-paragraph summary of slice 2's actual scope: orchestrate Subfinder + httpx + Nuclei via target-type-aware routing, three modes, sync, adaptive rate limiting, no quick rescan, no LLM, no Nessus API yet.

**H3-3. `product/slices.md` — slice 2 section duplicates the same stale "open questions" list.**

Same issue as H3-2, in a parallel page. Same seven items.

**Fix:** rewrite the slice 2 section. Mirror the slice 1 section's pattern: a paragraph saying what slice 2 does, a paragraph saying what it doesn't, an exit-criteria sentence, link to [[specs/slice-2|the slice 2 spec]]. Drop the open-questions subsection entirely.

**H3-4. `competitive/leverage-analysis.md` — slice 2 recommendations are stale.**

The page was written before the reconFTW case study and the slice 2 spec. Four specific stale claims:

- "**Recommendation: Optional mode, not a default.** CSAK slice 2 could support 'if reconFTW is installed, you can delegate recon to it.'" — the slice 2 spec rejected this; CSAK does not subprocess-invoke reconFTW.
- "**The slice 2 orchestration question is open.** Whether slice 2 builds its own orchestrator, delegates to reconFTW, or supports both is not yet decided" — resolved. Build our own.
- "Tracked in [[synthesis/open-questions|open-questions]] as a slice 2 question and settled when slice 2 design opens" — slice 2 design is closed; this question is in the answered section now (post-H3-1 fix).
- "Defer the 'fork vs integrate reconFTW' question. It becomes active when slice 2 design opens." — resolved.

Plus the "Recommendations — what to do next" section's first item ("Resolve reconFTW license ambiguity") is now noted in the build-vs-adapt page as moot (we don't depend on reconFTW), so its priority should be downgraded to "courtesy / not blocking."

**Fix:** rewrite the reconFTW Strategy 3 (Subprocess invocation) recommendation to say "Considered and rejected for slice 2 — see [[specs/slice-2|slice 2 spec]] and the [[competitive/reconftw|reconFTW case study]]." Rewrite the "Combined picture" section to reflect the actual slice 2 decision. Update the "Recommendations" section to reflect resolved items.

**H3-5. `competitive/README.md` — index Verdict and Key takeaways have stale slice 2 framing.**

Two specific claims:

- Index row for reconFTW: "License status is ambiguous (MIT vs GPL-3.0 contradiction in the repo itself) — resolve before any code-level leverage." — true but moot per the case study. We're not doing code-level leverage.
- Key takeaway #2: "Slice 2 has a mature free competitor. reconFTW covers most of what slice 2 proposes. Before slice 2 begins, we need an explicit answer: replace, augment, or integrate." — slice 2 began and the answer is none of the three; build our own with adapted recipes.
- Key takeaway #3: "Foreign-JSON ingest is a slice 2 opportunity, not slice 1." — partially stale. The slice 2 spec defers reconFTW JSON ingest indefinitely and DefectDojo JSON ingest is not in slice 2 either. The framing should be "deferred from both slice 1 and slice 2; will be revisited if a real analyst needs it."
- Key takeaway #6: "reconFTW's license is ambiguous in the repo. ... doesn't affect the build-vs-adapt recommendation (we're not forking either way)." — the framing is right but the conclusion is now stronger: it doesn't affect *anything* CSAK does, because CSAK has no runtime dependency on reconFTW.

**Fix:** update the reconFTW index Verdict to reflect the case-study resolution. Rewrite Key takeaways 2, 3, and 6 to match the current state.

### Medium

**M3-1. `product/vision.md` — last paragraph mentions "Open questions tracked in open-questions are now all scoped to slice 2+" but the slice 2 questions are also resolved.**

The line: "Open questions tracked in [[synthesis/open-questions|open-questions]] are now all scoped to slice 2+, the LLM layer, or cross-cutting product questions that don't block the current work."

True at the time it was written. Still true in spirit, but post-H3-1 fix the actually-open questions are: LLM layer (4 items), cross-cutting product questions (5 items), Nessus API integration (a likely slice 2.5 add not yet a row). The "scoped to slice 2+" framing is now misleading because slice 2 itself has no open questions.

**Fix:** rewrite to: "Open questions tracked in [[synthesis/open-questions|open-questions]] are scoped to the LLM layer, slice 2.5+ extensions, and cross-cutting product positioning — none block slice 2 implementation."

**M3-2. `product/users-and-jobs.md` — Job 5 implies the reconFTW question is open.**

Job 5: "...slice 2 design has to decide whether CSAK builds its own orchestrator, delegates to reconFTW, or supports both."

Resolved per the slice 2 spec.

**Fix:** rewrite Job 5's last sentence to: "Slice 2 ships CSAK's own orchestrator over Subfinder + httpx + Nuclei. reconFTW's invocation recipes are adapted into CSAK's tool catalog with attribution; CSAK doesn't depend on reconFTW at runtime. See [[specs/slice-2|the slice 2 spec]]."

**M3-3. `product/glossary.md` — missing slice 2 vocabulary.**

The glossary covers slice 1 thoroughly but doesn't define the canonical slice 2 terms now that slice 2 is `active`:

- **Collect** — the new `csak collect` stage; the collect step in the four-step intake → collect → triage → report model.
- **Target type** — domain / subdomain / ip / cidr / url. Determines which tools run.
- **Mode** — quick / standard / deep. Determines tool intensity.
- **Tool catalog** — `csak/collect/tools/<tool>.py` per-tool module.
- **Adaptive rate limiting** — the watch-for-429-and-back-off behavior default-on in slice 2.
- **csak doctor** — the dependency-check + permission-prompted auto-install command.

**Fix:** add a "Tool execution (slice 2)" section after "Triage and scoring" with these terms. Cross-reference the slice 2 spec sections that define each.

**M3-4. `engagements-RESERVED/README.md` — "Revisit when slice 1 is close to build-ready" is stale.**

The line: "Revisit when slice 1 is close to build-ready." — slice 1 is shipped. The decision about whether this folder should retire (because the Org entity in shipped CSAK already provides the engagement-shaped storage) is now actionable, not future.

**Fix:** update the line to record that slice 1 has shipped, the Org entity exists in CSAK code, and the question "should this folder retire?" is now active rather than deferred. Don't actually retire the folder without an explicit decision from Eli — this is a heads-up, not a unilateral move.

**M3-5. `synthesis/open-questions.md` — "Quick-rescan pattern" row has wrong status.**

In the slice 3 section: "Quick-rescan pattern — skip heavy stages when no new assets? | shared | open | reconFTW does this; smart pattern."

Per [[specs/slice-2|the slice 2 spec]] §"Quick rescan — explicitly NOT in slice 2", this is dropped: "Re-evaluated in a later slice if it earns its place." That's `dropped` with a "may revisit" note, not `open`.

**Fix:** move to Answered section with status `dropped` and the resolution "Considered for slice 2, deliberately rejected. May revisit in a later slice if it earns its place — see [[specs/slice-2|slice 2 spec]] §Quick rescan."

### Low

**L3-1. `sessions.md` exists at the wiki top level but the schema (CYBER.md §3) puts session notes under `sessions/`.**

The file is empty (zero bytes per `wiki_read`). Likely an accidental creation.

**Fix:** verify it's empty and either delete (via `wiki_delete --force`) or, if there's a use case for an index page at `sessions/` level, populate it as a sessions/README. My read: delete it. The two session notes both link from the master `_index.md` directly; an extra index layer doesn't add value at this size.

**L3-2. `sessions/2026-04-24-slice-1-implementation-review.md` is not listed in `_index.md`.**

The session-notes table in the index lists `2026-04-22-slice-1-kickoff.md` and `2026-04-24-slice-1-shipped.md` but not `2026-04-24-slice-1-implementation-review.md`. The implementation-review session notes are real (well-formed, accurate, dated correctly) and were written when the implementation was reviewed in this session series.

**Fix:** add the row to the index sessions table. The two 2026-04-24 session pages overlap in content; that's acceptable because they record different activities (review vs. shipped/closed) within the same calendar day.

**L3-3. `_log.md` doesn't have entries for several recent writes.**

Spot-check: the `_log.md` should contain auto-appended entries for every `wiki_write` per CYBER.md §6. Without reading the log directly I can't verify this exhaustively, but a chronologically-recent gap would suggest the auto-append isn't firing. Worth verifying.

**Fix:** read `_log.md` and confirm recent writes are present. If gaps exist, that's an MCP server issue rather than a content lint issue — escalate to Eli.

**L3-4. `engagements-RESERVED/` confidence is `high` on a `seed` page — same as last pass, no action.**

Carried over from the second pass with the same conclusion: defensible because the `confidence` refers to the meta-claim "this folder exists deliberately as a placeholder" rather than to substantive content. No fix.

**L3-5. `competitive/README.md` target list still mentions Faraday, PlexTrac, AttackForge, etc. as not-yet-written.**

True. Same as previous passes. Non-blocking; won't be written until someone has an actual reason to.

**L3-6. `competitive/leverage-analysis.md` and `competitive/build-vs-adapt.md` status fields are not in sync.**

`leverage-analysis.md` is `draft` / `medium`; `build-vs-adapt.md` was bumped to `active` / `high` in the slice 2 work. Both pages cover related material at similar quality and stability. Recommend bumping `leverage-analysis.md` to `active` / `medium` (the medium confidence is fair — some claims about reconFTW were outdated until this pass).

**Fix:** bump in the same write that addresses H3-4.

### Status of planned pages (unchanged from prior pass)

- `architecture/overview.md` — **written** (no longer planned). Status: `active`.
- `architecture/data-flow.md` — folded into overview. Page never created; the index correctly notes this.
- `specs/ingestion-model.md` — still `planned`. Slice 1 spec covers ingestion in enough detail; revisit only if implementation pressure requires it.
- `specs/triage-model.md` — same.
- `specs/report-formats.md` — same.

No change to these. Decision unchanged: keep all three as `planned` until they earn their place.

### What I checked this pass

- Every page in the wiki (26 pages including this lint report).
- Every "slice 2" reference in pages outside `specs/slice-2.md` itself.
- Every "open question" framing for slice 2 work.
- Every reconFTW reference for the case-study resolution.
- Every page's front matter for status/confidence consistency post-shipping.
- Both 2026-04-24 session-notes pages for fidelity to actual events.
- `engagements-RESERVED/README.md` for the slice-1-shipped impact.
- `_index.md` for missing rows or stale categorizations.

### What's intentionally not changing

- **Session notes are historical.** The "Outstanding for Claude (next session)" list in `2026-04-22-slice-1-kickoff.md` still says "Draft ADR-001" etc. — false at the time it was written *to* be true at the time, then updated via Update blocks. Don't edit historical session content; the update blocks preserve the history correctly.
- **`sessions/2026-04-24-slice-1-implementation-review.md` and `sessions/2026-04-24-slice-1-shipped.md` overlap.** Both are legitimate records of distinct activities on the same day. Not lint-worthy.
- **`engagements-RESERVED/README.md` content beyond the "revisit" line is fine.** The folder remains intentionally reserved; only the trigger condition needs updating.

### Proposed action plan

Six fixes, in order:

1. **`synthesis/open-questions.md`** (H3-1, M3-5) — rewrite slice 2 section, move all answered rows to Answered, update slice 3 quick-rescan row.
2. **`product/scope.md`** (H3-2) — rewrite slice 2 preview to summary + spec link.
3. **`product/slices.md`** (H3-3) — rewrite slice 2 section to mirror slice 1 pattern.
4. **`competitive/leverage-analysis.md`** (H3-4, L3-6) — update reconFTW Strategy 3 recommendation, Combined picture section, Recommendations section. Bump status to `active` / `medium`.
5. **`competitive/README.md`** (H3-5) — update reconFTW index Verdict and rewrite Key takeaways 2, 3, 6.
6. **`product/vision.md`** (M3-1), **`product/users-and-jobs.md`** (M3-2), **`product/glossary.md`** (M3-3), **`engagements-RESERVED/README.md`** (M3-4) — small targeted edits each.
7. **`_index.md`** (L3-2) — add the implementation-review session row.
8. **`sessions.md`** (L3-1) — delete (empty file).

Plus a check on `_log.md` for L3-3.

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
- [[specs/slice-2|Slice 2 Spec]]
- [[synthesis/open-questions|Open Questions]]
