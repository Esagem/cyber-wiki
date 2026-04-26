---
title: "Lint Report"
category: synthesis
tags: [lint, maintenance, health]
status: active
confidence: high
owner: shared
created: 2026-04-23
updated: 2026-04-26
---

# Lint Report

> Health snapshots of the wiki. Each dated section records what was found and what was fixed. Most entries here will become **fix tasks** rather than prose commentary.

---

## 2026-04-26 — fifth pass (post slice 3 spec reconciliation against shipped slice 2 code)

Triggered by: "lint" request after the slice 3 spec was reconciled against the shipped slice 2 codebase. Scope: any drift the reconciliation introduced or surfaced. Wiki at 28 pages, no page count change since pass four.

### Summary

The reconciliation pass identified seven issues against the shipped code and corrected them in `specs/slice-3.md`. Two of those corrections introduced or surfaced inconsistencies elsewhere on the wiki, both in the architecture overview's slice 3 module section (which was written before the reconciliation):

1. The new module layout (`types.py` + `types/builtin.py`) is invalid Python — a flat module file and a package directory of the same name can't coexist. The same wording landed in the spec via my edit and was already in the architecture overview. Both need the same fix: `types/` becomes a package with `__init__.py`, mirroring the existing `csak/collect/tools/` pattern.
2. The architecture overview's slice 3 §7 references `csak/collect/output.py` for the live-output extension. That file doesn't exist; the slice 2 `ProgressReporter` lives in `csak/cli/collect.py`. The reconciled spec's module table doesn't carry this mistake (it correctly puts the depth-aware output work in `pipeline.py` extension), but the architecture overview wasn't reconciled in the same pass and still has the wrong path.

Plus two minor items: a small internal contradiction in how the spec describes `applies_to`'s post-slice-3 status, and a stale recent-activity entry on `_index.md` (no entry for the reconciliation).

Severity scale, unchanged: **critical** (misleads readers about a finalized decision), **high** (contradicts a finalized decision or describes invalid code), **medium** (stale but not contradictory), **low** (cosmetic).

### High

**H5-1. `csak/collect/types.py` and `csak/collect/types/builtin.py` cannot coexist.**

Python doesn't permit a flat module `types.py` and a package directory `types/` with the same parent. Two pages list both:

- `specs/slice-3.md` §Module changes against current source, "New files" table.
- `architecture/overview.md` §7 Collect, extended for recursion — slice 3, "Type registry" Lives-in paragraph.

Three valid fixes (everything in `types.py`, split into `types.py` + `builtin_types.py`, or make `types/` a package). The right one is **make `types/` a package** mirroring the existing `csak/collect/tools/` layout: `csak/collect/types/__init__.py` for the registry / `classify` / `matches` / `register_type` / validation, plus `csak/collect/types/builtin.py` for the seven core types. Same shape as the tools-as-package pattern already in the slice 2 source tree.

**Fix:** correct both pages. The spec is the authoritative source; the architecture overview should match.

**H5-2. `architecture/overview.md` §7 references `csak/collect/output.py` which does not exist.**

Verified against the shipped slice 2 code: there's no `output.py` in `csak/collect/`. The progress reporter (the `ProgressReporter` class with `print_header`, `handle_event`, `print_summary`, `_draw_bar_line`, etc.) lives in `csak/cli/collect.py`. Slice 3's depth-aware live output extends the CLI-side reporter — there is no collect-module-side reporter to extend.

The slice 3 spec's §Module changes table doesn't carry this mistake (it correctly attributes recursion-runner + live-output work to `pipeline.py` extension, with no reference to a non-existent `output.py`). The architecture overview wasn't reconciled in the same pass and still has the wrong path.

**Fix:** in §7 Recursion runner extension's Lives-in paragraph, replace the `csak/collect/output.py` reference with a pointer to the existing `csak/cli/collect.py:ProgressReporter`. The depth-aware extension lives there — not in a new file.

### Medium

**M5-1. Spec's `applies_to` story is slightly self-contradictory.**

In `specs/slice-3.md`:

- §`Tool catalog — extended interface` says: "The slice 2 method stays available as a thin wrapper for backward compatibility during the migration; slice 3 builds prefer using `accepts` directly."
- §Module changes against current source — `router.py` row says: "Replace `tool.applies_to(target_type)` calls with `matches(candidate.type, tool.accepts)`."

Readable as consistent (router goes direct because it has the `TypedTarget` in hand; `applies_to` stays for external callers like `csak doctor` and tests), but the spec doesn't quite say that. A reader could conclude the spec is changing its mind about whether `applies_to` survives.

**Fix:** in the §Module changes `router.py` row, add a clarifying clause: `applies_to` is kept available as documented in §Tool catalog, but the router (which has the `TypedTarget` in hand from `classify()`) calls `matches()` directly because that's the path the new code prefers.

**M5-2. `_index.md` recent-activity section is one entry behind.**

No entry for the 2026-04-26 reconciliation against the shipped slice 2 codebase. The reconciliation applied seven specific corrections to the spec (httpx accepts, Tool interface fields, extract_outputs lineage, InvalidTargetError, depth-0 vs depth-1+ failure cascade, target promotion via slice 1 ingest path, module-by-module diff). A reader looking at the index would see the 2026-04-25 "slice 3 spec drafted" entry and assume the spec hasn't moved.

**Fix:** add a recent-activity entry summarizing the reconciliation. Keep it brief — the spec itself is the authoritative source; the index entry just signals that the spec is now grounded against shipped code and that implementation can start cleanly when sign-off lands.

### Low

**L5-1. Phase-marker preamble in `_index.md` could mention the reconciliation.** "Slice 3 design is in progress" is still accurate — status is still `draft` awaiting sign-off, the reconciliation didn't change strategic decisions. The recent-activity entry (M5-2) covers the reconciliation explicitly; the phase marker doesn't need to. **No fix unless M5-2 lands in the same write and there's a natural place for it.**

**L5-2. Spec doesn't repeat the `output.py` mistake.** Verified via search. The spec's module table correctly omits `output.py` and puts the depth-aware progress work under `pipeline.py` extension. Only the architecture overview needs the H5-2 correction. **No fix.**

### Process notes

**The reconciliation pass found seven things, none of which had been caught by lints to date.** Worth flagging: the prior four lint passes operated on the wiki internally — page-vs-page consistency, status drift, stale forward-looking sections. None of them checked the wiki against the shipped code. The reconciliation was its own pass triggered by Eli uploading the slice 2 codebase, and it caught issues like `httpx.accepts = ["host", "url"]` (wrong; `url` skips httpx in slice 2) that no internal lint could catch because the wiki was internally consistent on the wrong assumption.

Lesson: a future fifth-pass kind of lint — cross-checking spec against shipped code — should run after every implementation hand-off. The first opportunity for one was after slice 1 shipped 2026-04-24; we did it informally as the implementation review session note. Slice 2's equivalent didn't happen (yet — there's no slice 2 implementation review session note). Worth adding to the workflow: when an implementation lands, the next session should be a "reconcile spec against shipped code" pass, the way 2026-04-26 did for the slice 3 spec retroactively against slice 2.

### What I checked this pass

- The spec's reconciliation edits for any contradictions they introduced.
- The architecture overview's slice 3 §7 against the spec for consistency on module paths.
- The shipped code (`src/csak/collect/`) for whether referenced files (`csak/collect/output.py`) actually exist.
- The glossary's slice 3 vocabulary section for module-path references (none found; clean).
- `_index.md` for an entry on the reconciliation (none yet).
- `_log.md` via `wiki_log_tail` for the reconciliation entry (present, dated correctly).
- Spec internal consistency on `applies_to` survival.

### What's intentionally not changing

- Strategic decisions in the spec (the reconciliation only added implementation precision; nothing about deterministic recursion / structural dedup / max-depth / sync-only / pluggable catalog has changed).
- Spec status (`draft`, confidence `medium`). Eli's sign-off is still pending; the reconciliation strengthens the case for sign-off but doesn't replace it.
- Session notes (historical record).
- `engagements-RESERVED/README.md` (still awaiting Eli's call; same as pass four).
- Anything else from the pass-four action plan — those nine items all landed 2026-04-25.

### Proposed action plan

Four items, in priority order:

1. **`specs/slice-3.md`** (H5-1, M5-1) — fix the `types/` package layout in the new-files table; clarify `applies_to` survival in the `router.py` module-change row.
2. **`architecture/overview.md`** (H5-1, H5-2) — fix the `types/` package layout in §7 Type registry; fix the `csak/collect/output.py` reference in §7 Recursion runner extension.
3. **`_index.md`** (M5-2) — add recent-activity entry for the reconciliation.
4. **`synthesis/lint-report.md`** (this section) — already written by this edit. STATUS markers will be added after items 1-3 land.

---

## 2026-04-25 — fourth pass (post slice 3 spec draft)

Triggered by: "lint" request after slice 3 spec was drafted, slice 3 bookkeeping was applied to six pages, and the slice 3 design session note was written. Wiki now at 28 pages.

### Summary

Two themes drive this pass:

1. **Slice 2 implementation status drift.** Slice 2 was reported as built and under test (per Eli, 2026-04-25) after the third-pass lint fixes had already landed. Several pages still say "slice 2 spec approved, ready for implementation" because they were written before the build was reported. The slice 2 spec page itself was correctly updated in the index to "in implementation"; the surrounding pages weren't.
2. **Slice 3 not fully propagated.** Slice 3 spec is `draft`. The slice 3 bookkeeping pass touched the obvious places (slice plan, glossary, open-questions, roadmap, architecture overview, deferred-features, index). It missed scope, vision, users-and-jobs Job 6, and the competitive cluster (build-vs-adapt's forward-looking slice-2 section, leverage-analysis scope-fit tables). These pages reference slices 2 and 3 in ways that pre-date current state.

Slice 1 cluster is clean. Slice 2 spec page is clean. Slice 3 spec is clean (it's draft, that's expected). The architecture overview is clean post-2026-04-25 update. The glossary's slice 3 section is clean; its slice 2 section needs a one-line addition pointing at slice 3.

### High

**H4-1. `product/scope.md` — slice 2 status stale, slice 3 preview contradicts the spec.**

Two issues on the same page:

- Slice 2 heading reads "Slice 2 — Tool Orchestration (spec approved, ready for implementation)". Per Eli 2026-04-25, slice 2 is built and under test. The status parenthetical needs updating to match the index ("in implementation").
- Slice 3 preview reads: "Recursion with budgets — tool output can trigger further runs, with explicit time/depth/cost ceilings." The slice 3 spec rejects time and cost ceilings explicitly — only depth, with structural dedup as the termination mechanism. "With budgets" plural is wrong. The preview also has no spec link.

**Fix:** update slice 2 status parenthetical. Rewrite slice 3 preview to mirror the slice 1 / slice 2 pattern: short summary, link to [[specs/slice-3|slice 3 spec]].

**H4-2. `product/vision.md` — "How we're building it" and "What's settled" sections two slices behind.**

- Slice 2 bullet: "Spec approved 2026-04-24, ready for implementation." Stale.
- Slice 3 bullet: "Tool output can trigger further tool runs (exposed IPs → deeper recon). Tool catalog grows." No spec link, no status, framing pre-dates the spec.
- "What's settled" section: "Slice 1 is shipped; slice 2 is spec-complete and ready for implementation. Open questions ... none block slice 2 implementation." Slice 2 implementation isn't blocked anymore (it's done). Slice 3 questions answered after this was written; framing is incomplete.

**Fix:** update slice 2 and slice 3 bullets to current status. Add spec link to slice 3 bullet. Rewrite "What's settled" to reflect slice 2 in implementation, slice 3 spec drafted, and the actually-open items (LLM layer, slice 2.5 Nessus API, cross-cutting product positioning).

**H4-3. `product/users-and-jobs.md` Job 6 (slice 3+) reads as if slice 3 is unspecced.**

> "This is the recursion pain. Slice 3."

With slice 3 now drafted, Job 6 should mirror Job 5's pattern — a sentence pointing at the slice 3 spec and naming the actual mechanism (deterministic recursion via output-to-input type matching, structural dedup, max-depth as the brake). The quote in Job 6 ("Just do it, with a budget") has the right spirit but "with a budget" connotes the time/cost framing that slice 3 deliberately rejected; could be tightened to "with a sensible depth limit" or similar.

**Fix:** rewrite Job 6's last sentence to point at [[specs/slice-3|slice 3 spec]] with a one-line summary of how recursion actually works. Optionally tweak the quote's "with a budget" phrasing.

**H4-4. `competitive/build-vs-adapt.md` — "What this means for slice 2 design" section reads as guidance to a slice-2-designer.**

The section was written when slice 2 was a future thing. Now slice 2 is built and slice 3 is in design. The bullets read forward-looking:

- "Tool catalog under `config/tools/<tool>.yaml` (or similar)..." — slice 2 chose Python module per tool, not YAML.
- "Slice 2 supports the on-demand active tools that earn their keep: Nuclei, Subfinder, httpx, possibly Nessus via API." — Nessus via API was deferred to slice 2.5+.
- "Mode model is a small set (probably 2-4 modes — something like `quick`, `standard`, `deep`)..." — slice 2 shipped with exactly those three. Predictive guess that turned out right; could be retrospective.
- "Quick rescan pattern from reconFTW... is the one piece of reconFTW's actual runtime logic worth adapting." — slice 2 deliberately rejected this.

The section's framing as "Concrete inputs to the slice 2 spec, when it gets written" is now obsolete — the spec exists and these are mostly resolved.

**Fix:** rewrite the section to a retrospective: "What slice 2 actually adopted from this analysis" — with the catalog-as-Python decision, three modes shipped, recipes adapted with attribution, quick-rescan rejected, Nessus API deferred. One paragraph or short bullet list. Pointer to [[specs/slice-2|slice 2 spec]] as the authoritative record.

**H4-5. `competitive/leverage-analysis.md` scope-fit tables — slice 3 row in DefectDojo table outdated.**

The DefectDojo scope-fit table has: "Slice 3: recursion with budgets | ❌ | Out of DefectDojo's scope entirely." The "with budgets" framing predates the slice 3 spec. The verdict (❌, out of scope) is correct; the row label is wrong.

The reconFTW scope-fit table has "Slice 3: recursion | ✅ native | This is what reconFTW's pipeline is." Accurate as scope-fit, but worth tightening: reconFTW's pipeline is a fixed-order chain with config knobs, not the deterministic-type-matching recursion CSAK slice 3 specs. A clarifying parenthetical ("different shape from CSAK's type-driven model") would help.

**Fix:** rename DefectDojo row to "Slice 3: recursion". Add clarifying parenthetical to reconFTW scope-fit row.

### Medium

**M4-1. `product/glossary.md` — "Target type" entry under §Tool execution (slice 2) is now incomplete.**

The slice 2 entry lists the flat target-type list (`domain | subdomain | ip | cidr | url`) without acknowledging that slice 3 supersedes it with a richer registry (`network_block | host | domain | subdomain | url | service | finding_ref` plus plugin types). The slice 3 vocabulary section *does* have a "Target type (slice 3 registry)" entry that handles this correctly — but the slice 2 entry above it is stale. A reader scanning alphabetically hits the slice 2 framing first.

Also: `cidr` in the slice 2 entry is renamed `network_block` in slice 3.

**Fix:** add a one-line "superseded in slice 3 — see Target type (slice 3 registry) below" to the slice 2 entry. Don't rewrite the slice 2 entry; it's accurate for slice 2.

**M4-2. `_log.md` health — verified clean.** Spot-checked via `wiki_log_tail` 2026-04-25; recent 25 operations all present, auto-append firing correctly. L3-3 from the third pass is now resolved as a non-issue.

**No fix.** Annotated for completeness.

**M4-3. `synthesis/lint-report.md` 2026-04-24 third-pass action plan items lack STATUS markers.**

The third-pass section listed eight numbered fixes plus a doctor item. Per the index recent-activity entry dated 2026-04-24 ("all eight high/medium fixes executed") and the corroborating `_log.md` entries dated 2026-04-25 (the lint-fix writes), all the action-plan items landed. The third-pass section itself doesn't have STATUS markers the way the 2026-04-23 first pass does. Reader looking at the third-pass action plan in isolation can't tell what's done.

**Fix:** add STATUS markers to each item in the third-pass action plan, or a summary block at the section end. (Applying this in the same edit that creates the fourth-pass section.)

**M4-4. `competitive/README.md` Key takeaway #3 has a small tense mismatch.**

> "Both DefectDojo and reconFTW JSON ingest were considered for slice 2 and dropped — slice 2's native orchestrator means analysts don't need to bring foreign JSON into CSAK if they can use CSAK directly."

The "means" is present-tense (slice 2 already does this) which is now correct since slice 2 is built, but the surrounding bullet is retrospective. Minor wording.

**Fix:** trivial. Could leave it. Marked here so a future pass doesn't re-flag.

**M4-5. `competitive/leverage-analysis.md` "Recommendations — what to do next" section has nothing live.**

All four numbered recommendations are either resolved (item 3, struck through), demoted (item 1, license ambiguity — "courtesy / not blocking"), or deferred indefinitely with a referral elsewhere (item 2, foreign-JSON ingest — should now point at [[synthesis/deferred-features|deferred-features]] which is the canonical home for re-evaluation triggers). Item 4 (don't fork either) is settled.

The section reads like a to-do list with no live to-dos.

**Fix:** rename section to "Recommendations — status" or "Resolved recommendations" and add a pointer to [[synthesis/deferred-features|deferred-features]] for items 2 and 3. Keep the historical recommendations visible (struck-through and demoted) for the audit trail.

**M4-6. `engagements-RESERVED/README.md` — "Should this folder retire?" still actionable, no movement since 2026-04-24.**

Not a lint defect; flagging as the longest-standing actionable decision in the wiki. The page correctly notes the question is awaiting Eli's call. Per CYBER.md §"the LLM should refuse to write into engagements-RESERVED/ except to update this README," no unilateral fix.

**No fix this pass.** Eli call needed.

### Low

**L4-1. `_index.md` phase-marker preamble repeats slice 3 strategic decisions in the recent-activity entry.**

The phase marker says "Slice 3 design is in progress — strategic decisions taken (deterministic recursion via output→input type matching, structural dedup, --max-depth flag with default 3, sync-only, plugin-pluggable catalog)." The recent-activity entry dated 2026-04-25 (slice 3 design strategic decisions) re-states the same content. The duplication is fine — phase marker is at-a-glance status, recent-activity is chronological record.

**No fix.** Noted for completeness so a future pass doesn't re-flag.

**L4-2. `sessions/2026-04-22-slice-1-kickoff.md` "Real outstanding work now (end of 2026-04-23)" list two days stale.**

List includes "Christopher's onboarding," "pitch deck slides 4 and 8 fix," "GitHub issue on reconFTW license," "start slice 1 implementation in Claude Code" — all written 2026-04-23. Slice 1 has shipped; slice 2 has shipped (under test); slice 3 spec drafted. Per CYBER.md §5.2 and the 2026-04-23 first-pass lint principle, **session notes are historical** and should not be edited.

**No fix.** Annotated for completeness.

**L4-3. `synthesis/roadmap.md` Phase 5 (slice 3 implementation) is correctly empty.**

A quick scan might suggest "this is unfilled, fix it." It's intentionally a stub awaiting slice 3 spec approval.

**No fix.**

**L4-4. `competitive/build-vs-adapt.md` confidence is `high` despite the stale slice-2 forward-looking content (H4-4).**

Once H4-4 is fixed, confidence stays `high` correctly. If H4-4 isn't fixed, confidence-`high` arguably overstates the page's currency.

**Fix:** apply with H4-4. No status flip needed if fix lands.

**L4-5. `competitive/build-vs-adapt.md` "A central references page" trigger has fired.**

The page says: "A `research/references.md` page should consolidate them. Low priority; add when the first reconFTW recipe lands in the slice 2 tool catalog." Slice 2 is built; slice 2 catalog modules carry reconFTW recipe attributions per the spec. The trigger condition has been met.

This item is also tracked in [[synthesis/deferred-features|deferred-features §Polish and minor improvements]] with the same trigger language. Not a contradiction; the deferred-features entry is canonical.

**Fix:** trivial — update the trigger sentence in build-vs-adapt to acknowledge the trigger has fired and point at deferred-features as the canonical home. Or leave as-is; the duplication is mild.

**L4-6. `competitive/leverage-analysis.md` page header still reads "Updated 2026-04-24".** Once any fix on this page lands, `updated:` auto-bumps via `wiki_edit`. No fix needed if M4-5 / H4-5 land.

### Status of planned pages (unchanged)

- `architecture/overview.md` — written, `active`. Updated 2026-04-25 with slice 3 module section.
- `architecture/data-flow.md` — folded into overview, never created. Index correctly notes this.
- `specs/ingestion-model.md` — still `planned`. Slice 1 spec covers it. No pressure.
- `specs/triage-model.md` — same.
- `specs/report-formats.md` — same.

No change.

### What I checked this pass

- Every page in the wiki (`wiki_list` returned 28 pages; read 27 via `wiki_read_many` batches plus prior in-conversation reads).
- Every "slice 2" reference outside `specs/slice-2.md` itself for status drift.
- Every "slice 3" reference for spec linkage (most are correct post-bookkeeping; the misses are flagged above).
- Competitive cluster scope-fit tables for the slice 3 row.
- `_log.md` via `wiki_log_tail` for auto-append health.
- Front-matter status/confidence consistency (no new mismatches).

### What I deliberately didn't change

- The third-pass section's prose. Adding STATUS markers (M4-3) is additive.
- Session notes (L4-2). Historical record.
- `engagements-RESERVED/README.md` (M4-6). Eli's call.
- Anything in the deferred-features page — it's the canonical home for cross-page deferral tracking and was just written; no drift yet.

### Proposed action plan

Nine items, in priority order:

1. **`product/scope.md`** (H4-1) — slice 2 status update + slice 3 preview rewrite.
2. **`product/vision.md`** (H4-2) — slice 2 + slice 3 status updates, "What's settled" rewrite.
3. **`product/users-and-jobs.md`** (H4-3) — Job 6 update with spec link.
4. **`competitive/build-vs-adapt.md`** (H4-4, L4-4, L4-5) — rewrite "What this means for slice 2 design" as a retrospective; update central-references-page trigger.
5. **`competitive/leverage-analysis.md`** (H4-5, M4-5) — fix slice 3 row in scope-fit tables; update Recommendations section.
6. **`product/glossary.md`** (M4-1) — add slice-3-supersedes pointer to slice 2 "Target type" entry.
7. **`competitive/README.md`** (M4-4) — trivial wording fix.
8. **`synthesis/lint-report.md`** (M4-3) — STATUS markers on third-pass action plan.
9. (No standalone — the `_log.md` check was M4-2 and resolved as non-issue.)

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

1. **`synthesis/open-questions.md`** (H3-1, M3-5) — rewrite slice 2 section, move all answered rows to Answered, update slice 3 quick-rescan row. **STATUS: Applied 2026-04-25.**
2. **`product/scope.md`** (H3-2) — rewrite slice 2 preview to summary + spec link. **STATUS: Applied 2026-04-25.**
3. **`product/slices.md`** (H3-3) — rewrite slice 2 section to mirror slice 1 pattern. **STATUS: Applied 2026-04-25.**
4. **`competitive/leverage-analysis.md`** (H3-4, L3-6) — update reconFTW Strategy 3 recommendation, Combined picture section, Recommendations section. Bump status to `active` / `medium`. **STATUS: Applied 2026-04-25.**
5. **`competitive/README.md`** (H3-5) — update reconFTW index Verdict and rewrite Key takeaways 2, 3, 6. **STATUS: Applied 2026-04-25.**
6. **`product/vision.md`** (M3-1), **`product/users-and-jobs.md`** (M3-2), **`product/glossary.md`** (M3-3), **`engagements-RESERVED/README.md`** (M3-4) — small targeted edits each. **STATUS: Applied 2026-04-25.**
7. **`_index.md`** (L3-2) — add the implementation-review session row. **STATUS: Applied 2026-04-25.**
8. **`sessions.md`** (L3-1) — delete (empty file). **STATUS: Applied 2026-04-25.**

Plus a check on `_log.md` for L3-3. **STATUS: Verified clean 2026-04-25 fourth pass via `wiki_log_tail`. Resolved as non-issue.**

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
