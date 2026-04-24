---
title: "2026-04-24 — Slice 1 Implementation Review"
category: sessions
tags: [slice-1, implementation, review, verification]
status: active
confidence: high
owner: shared
created: 2026-04-24
updated: 2026-04-24
---

# 2026-04-24 — Slice 1 Implementation Review

Eli uploaded a `Cybersecurity-Swiss-Army-Knife.zip` containing a working slice 1 implementation. Built between the spec finalization (2026-04-23) and this session, presumably via Claude Code. Goal of the session: verify the code matches the finalized spec and is sign-off-ready.

## What was reviewed

- `src/csak/` layout — matches the architecture overview's five-module structure exactly (cli / ingest / storage / query / render).
- All six storage entities (Org, Target, Artifact, Scan, Finding, FindingScanOccurrence) — schema, dataclasses, repository helpers.
- Scoring module — formula, per-tool tables, default confidences.
- Dedup module — all six tool-specific keys.
- Ingest pipeline — Artifact dedup by hash, Scan-always-new on re-ingest, re-occurrence path that does NOT recompute priority.
- Target promotion — three-case hybrid plus the discovery-only path for subfinder.
- CLI surface — `org`, `ingest`, `findings`, `target`, `scan`, `report`. Mutation commands (`findings update --status/--tag`, `target update --weight`).
- Query layer — period parser, active-in-window query, methodology query.
- Report context builder — single shared object, ticket grouping by `(source_tool, dedup_key)`.
- Markdown renderer (Jinja2), JSON renderer (schema v2), report command (orchestrates renderers, writes timestamped files, fit-bundle directory + zip).
- Nessus parser (XML edge case-rich, picked as spot-check for the parsers).

## Test suite

83 tests, all passing in 7 seconds. Coverage spans every module — parsers, scoring, dedup, storage, query, render, CLI smoke, end-to-end.

## End-to-end verification

Ran a fresh CSAK invocation against a small fabricated Nessus fixture (4 ReportItems across 2 hosts):

- `csak org create acmecorp` — works.
- `csak ingest --org acmecorp --tool nessus acme.nessus` — 4 new findings, 2 targets touched.
- `csak findings list --org acmecorp` — priorities computed correctly: Critical×Medium×1.0 = 0.700, High×Medium×1.0 = 0.525, Medium×Medium×1.0 = 0.350, Low×Medium×1.0 = 0.175.
- `csak target update <web-id> --weight 1.5` — recomputed all three findings on that target (×1.5), left the db host's finding untouched. Priority sort reshuffled correctly.
- `csak findings show <id>` — exposes severity_weight, confidence_weight, target_weight, making priority traceable. Spec exit criterion met explicitly.
- `csak findings update <id> --status suppressed` — works, suppressed finding excluded from subsequent reports.
- `csak report generate ... --kind internal-review --format markdown,docx,json` — three files written under `reports/acmecorp/2026-04/<timestamp>_internal-review.{md,docx,json}`. Markdown is clean and forwardable. JSON has schema v2, `priority_components` block, complete representation. Docx is a real Word file (37KB).
- `csak report generate ... --kind fit-bundle --format markdown,docx,json` — directory of per-ticket files plus `.zip` plus period-level JSON. Layout matches the spec exactly.

## What matches the spec

- Three-axis scoring (`severity × confidence × target_weight`) with no `probability_real` anywhere in code, schema, CLI, or JSON output.
- Four-layer data model with no Report entity in the database.
- Reports are stateless exports, accumulate as timestamped files, no overwriting.
- Markdown / docx / JSON all first-class, all rendered from the same `ReportContext` object.
- python-docx for docx (no pandoc dependency).
- SQLite + flat-file artifacts.
- Folder-aware Zeek ingest path.
- Re-ingest of the same Artifact is a no-op at the byte level; re-occurrence advances `last_seen` and adds a FindingScanOccurrence row without recomputing the existing Finding's priority.
- `--status` / `--tag` are the analyst's only finding-mutation surface; no `--probability-real` flag.
- Target weight changes recompute all findings on that target.
- Fit bundle is a directory + a zip + period-level JSON.
- Suppressed findings excluded from reports by default.

## Two small polish items

Neither is a correctness issue. Both are usability / spec-fidelity nits worth fixing before a real client engagement.

**1. Timestamp precision deviates from spec.** The spec says "second-level granularity" in the Output layout section. The implementation uses millisecond precision (`%Y-%m-%dT%H-%M-%S-<mmm>`) with a code comment explaining the reasoning — back-to-back invocations within the same second would otherwise collide. The deviation is more correct than the spec, but it's still a deviation. Two ways to resolve:
  - Update the spec to specify millisecond granularity (preferred — the code's reasoning is sound).
  - Revert the code to seconds and accept the collision risk (simpler but worse).

**2. `csak findings list` doesn't expose Finding IDs.** The tabular output is `PRIORITY / SEVERITY / TOOL / TARGET / TITLE` with no ID column. To call `findings update <id>` the analyst has to either know the ID by other means or open SQLite directly. Adding an ID column (or a short-hash prefix) closes the loop. Small CLI tweak, no spec impact.

## Verdict

**The implementation is faithful to the spec on every load-bearing decision.** No regressions, no scope creep, no surprise dependencies. Test suite is comprehensive and green. End-to-end run produces correct output in all three formats.

Slice 1 implementation is sign-off-ready, modulo the two polish items above.

## What this means for the wiki

- Slice 1 spec stays `active` (no spec changes needed except optional timestamp-granularity update).
- Phase 1 of the design roadmap is now fully done — the wiki has shifted from primary working surface to reference material alongside a build repo, exactly as the roadmap exit criteria predicted.
- Slice 2 design can begin. The strategic question (replace / augment / integrate reconFTW) was raised earlier this session but not yet decided.

## Related

- [[specs/slice-1|Slice 1 Spec]]
- [[architecture/overview|Architecture Overview]]
- [[synthesis/roadmap|Roadmap]]
- [[sessions/2026-04-22-slice-1-kickoff|Slice 1 Kickoff (2026-04-22)]]
