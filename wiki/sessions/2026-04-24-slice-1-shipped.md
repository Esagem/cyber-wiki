---
title: "2026-04-24 — Slice 1 Shipped & Reviewed"
category: sessions
tags: [slice-1, implementation, review, ms-timestamps, id-column]
status: active
confidence: high
owner: shared
created: 2026-04-24
updated: 2026-04-24
---

# 2026-04-24 — Slice 1 Shipped & Reviewed

First post-design session. Slice 1 implementation delivered by Eli (via Claude Code) and reviewed end-to-end in this session.

## What arrived

A complete slice 1 build: `csak` package with the module layout matching [[architecture/overview|the architecture overview]] exactly — `cli/`, `ingest/`, `storage/`, `query/`, `render/`, `templates/`, plus `tests/`. Dependencies per spec: click, jinja2, python-docx. No pandoc, no SQLAlchemy (stdlib `sqlite3` directly), no extra deps.

83 tests. All passing. ~7 seconds to run.

## What I verified against the spec

- **Data model.** All six tables present. Unique constraint on `(org_id, source_tool, dedup_key)`. Partial unique index on active target names. Soft-delete everywhere except Artifacts. No `probability_real` column.
- **Scoring.** Three axes (`severity × confidence × target_weight`), priority stored on Finding at ingest. Nessus 0-4 mapping correct. Per-tool default confidences defined.
- **Dedup.** All six tool-specific keys match the spec. Zeek has sensible fallback for non-notice log types.
- **Ingest pipeline.** Artifact hash dedup, Scan always new (even on re-ingest), re-occurrences advance `last_seen` + add FindingScanOccurrence **without recomputing priority** (explicit code comment calls this out). Folder-aware for Zeek.
- **Target promotion.** Three-case hybrid from the spec. Plus a `record_identifier_only` path for subfinder-style discoveries.
- **CLI mutations.** `findings update --status/--tag` and `target update --weight`. Priority recomputes on both. **No `--probability-real` flag**.
- **Report context.** Single shared Python object, all renderers pure functions of it, no DB access from renderers.
- **Exports.** Markdown (Jinja2), docx (python-docx, no pandoc), JSON (schema v2, self-describing, `priority_components` block present).
- **Output layout.** `reports/<org>/<period>/<timestamp>_<kind>.<ext>` per spec. Multiple invocations accumulate. Fit bundles ship as directory + zip + period-level JSON.

## End-to-end run (verified live)

Created Org `acmecorp`, ingested a small Nessus fixture with four `<ReportItem>`s across two hosts. Verified:

- Priority arithmetic: Critical × Medium confidence × 1.0 = **0.700**; High × Medium × 1.0 = **0.525**; Medium × Medium × 1.0 = **0.350**; Low × Medium × 1.0 = **0.175**. All correct.
- Bumped web-01 target to weight 1.5 — all three web-01 findings recomputed (0.700→1.050, 0.350→0.525, 0.175→0.2625). db-01's finding unchanged. Spec behavior holds.
- Suppressed the low finding via `findings update <id> --status suppressed`. Next internal-review report excluded it (3 shown, not 4). Markdown report includes priority trace inline (`1.050 (1.00 × 0.70 × 1.50)`).
- Generated all three formats (markdown, docx, JSON). Word docx is real (37KB Microsoft Word 2007+ format). JSON is schema v2 with `priority_components` present. All three same content, same section order.
- Fit bundle: directory of per-ticket files + zip of directory + period-level JSON. Zip compressed cleanly.

## Two deviations from the 2026-04-23 spec text — accepted

Flagged during review, both now written back into [[specs/slice-1|the spec]].

**1. Millisecond timestamp precision.** Spec said "second-level granularity"; code uses `%Y-%m-%dT%H-%M-%S-<mmm>` with an inline comment explaining that same-second collisions are a real failure mode when an analyst pipes several `report generate` invocations together. Defensible improvement over the literal spec. Spec updated to match.

**2. `ID` column on `csak findings list`.** Original spec showed `PRIORITY / SEVERITY / TOOL / TARGET / TITLE`. Shipped code adds an `ID` column first (truncated to 8 characters for display, prefix-resolvable on downstream commands). Without it, the analyst who wants to `findings update <id>` has to drop into sqlite3 to find the UUID — breaks the mutation workflow. The shipped behavior is better; spec updated to match. Added as an explicit exit criterion so future regressions can't slip it back out.

Both changes are small but real. The spec now records what shipped rather than what was originally written.

## What this means for the wiki

The wiki's role has shifted. From 2026-04-21 through 2026-04-23 it was the primary working surface — every design decision lived here first, code didn't exist yet. From today forward it's the reference alongside the CSAK repo. The spec remains authoritative for load-bearing decisions; the code is authoritative for shipped behavior; the wiki keeps them in sync when they disagree.

Specifically, updates landing today:
- [[specs/slice-1|slice 1 spec]] — status stays `active`, confidence `high`; preamble rewritten to note implementation complete; ms-timestamps and ID-column changes integrated; exit criteria have a "Status: all criteria met as of 2026-04-24" marker.
- [[architecture/overview|architecture overview]] — walkthrough refreshed to match shipped behavior (ID column in step 2, ms timestamp in step 3 output); module descriptions updated to match actual file layout (`docx_renderer.py` not `docx.py`, `scoring.py` carries the inline tables, etc.).
- [[synthesis/roadmap|roadmap]] — new Phase 1b section recording the implementation milestone. Phase 1 + 1b both marked done. Pre-design → build transition completed. Phase 3 (slice 2 design) marked as "next thing to work on."
- [[_index|index]] — phase marker at the top updated to "slice 1 shipped." Recent activity entry added. Specs table adds a planned row for slice 2.

## What's next

**Slice 2 design.** The strategic question that must be settled first: the reconFTW relationship — replace, augment, or integrate? Every downstream slice 2 decision depends on it. Options were sketched in an earlier session; needs deliberate answer before the rest of slice 2 design unblocks.

Non-blocking items still on the back burner:
- More competitive pages (Faraday, PlexTrac, AttackForge, Splunk, Wazuh, Tenable, n8n, an LLM-powered upstart).
- reconFTW GitHub issue on the MIT/GPL-3.0 license ambiguity (matters before any code-level leverage in slice 2).
- Canva pitch deck slides 4 and 8 — periodic-mode language fix. External.
- Christopher's onboarding.
- Move scoring tables from inline Python to YAML config files. Polish, deferred.

## Related

- [[specs/slice-1|Slice 1 Spec]]
- [[architecture/overview|Architecture Overview]]
- [[synthesis/roadmap|Roadmap]]
- [[sessions/2026-04-22-slice-1-kickoff|2026-04-22 — Slice 1 Kickoff]] (design session that preceded this)
- [[synthesis/open-questions|Open Questions]]
