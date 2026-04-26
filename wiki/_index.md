---
title: "CSAK Design Wiki — Master Index"
category: synthesis
tags: [index, master, navigation]
status: active
confidence: high
created: 2026-04-21
updated: 2026-04-26
---

# CSAK Design Wiki — Master Index

## What this is

The collaborative design space for building the **Cybersecurity Swiss Army Knife (CSAK)** — a tool that orchestrates security tools against a target, ingests their output, triages what matters, and emits coherent reports per organization.

**Phase: slice 1 shipped, slice 2 shipped, slice 3 shipped.** Slice 1 spec is `active` and implementation complete (83 tests, end-to-end verified 2026-04-24). Slice 2 spec is `active` and implementation is on `origin/main` alongside slice 3 (built and under test 2026-04-25, exercised through slice 3's test infrastructure 2026-04-26). Slice 3 spec is `active` and implementation is on `origin/main` at commit `422b8ef` (shipped 2026-04-26 — 275 tests pass, end-to-end recursion verified with example plugin against local test target). The wiki is the reference alongside the CSAK repo.

See [[CYBER|CYBER.md]] for the operating schema. Rationale for every significant choice lives inline in the section that makes the choice — there are no separate decision records.

---

## Product

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[product/vision\|Vision]] | draft | medium | what, who, why |
| [[product/scope\|Scope]] | draft | medium | in-scope, out-of-scope, slices |
| [[product/slices\|Slice Plan]] | draft | medium | slices, roadmap |
| [[product/users-and-jobs\|Users & Jobs]] | draft | low | personas, jobs-to-be-done |
| [[product/glossary\|Glossary]] | draft | medium | vocabulary, definitions |

## Architecture

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[architecture/overview\|Architecture Overview]] | active | high | diagram, narrative, walkthrough |

_`architecture/data-flow.md` was planned but folded into the overview's walkthrough section — the two would have duplicated ~80% of each other._

## Specs

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[specs/slice-1\|Slice 1 — Ingest & Report]] | **active — shipped** | high | slice-1, ingest, triage, report |
| [[specs/slice-2\|Slice 2 — Tool Orchestration]] | **active — shipped** | high | slice-2, orchestration, collect |
| [[specs/slice-3\|Slice 3 — Recursion & Catalog]] | **active — shipped** | high | slice-3, recursion, catalog, plugins, types |
| [[specs/ingestion-model\|Ingestion Model]] | **planned** | — | ingestors, adapters, sources |
| [[specs/triage-model\|Triage Model]] | **planned** | — | severity, confidence, importance |
| [[specs/report-formats\|Report Formats]] | **planned** | — | internal-reviews, fix-it-tickets |

## Research

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[research/README\|Research process]] | active | high | meta, process |
| [[research/slice-2-tool-output-reference\|Tool Output Reference — Slice 2 Catalog]] | active | high | slice-2, subfinder, httpx, nuclei, reference |

## Competitive

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[competitive/README\|Competitive Analysis Index]] | active | high | meta, format |
| [[competitive/defectdojo\|DefectDojo]] | active | medium | vuln-management, open-source |
| [[competitive/reconftw\|reconFTW]] | active | high | recon-orchestration, open-source, case-study |
| [[competitive/leverage-analysis\|Leverage Analysis]] | active | medium | licensing, feasibility |
| [[competitive/build-vs-adapt\|Build vs Adapt]] | active | high | decision-input, slice-1, slice-2 |

_Still to write: Faraday, PlexTrac, AttackForge, Splunk, Wazuh, Tenable, n8n, one LLM-powered upstart. Non-blocking; can run in parallel with slice 2 work._

## Sessions

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[sessions/2026-04-22-slice-1-kickoff\|2026-04-22 — Slice 1 Kickoff]] | active | medium | slice-1, product-shape, tools |
| [[sessions/2026-04-24-slice-1-implementation-review\|2026-04-24 — Slice 1 Implementation Review]] | active | high | slice-1, implementation, review, verification |
| [[sessions/2026-04-24-slice-1-shipped\|2026-04-24 — Slice 1 Shipped]] | active | high | slice-1, implementation, ms-timestamps, id-column |
| [[sessions/2026-04-25-slice-3-design\|2026-04-25 — Slice 3 Design]] | active | high | slice-3, recursion, type-system, plugins, design |
| [[sessions/2026-04-26-slice-3-shipped\|2026-04-26 — Slice 3 Shipped]] | active | high | slice-3, slice-2, implementation, recursion, plugins, types, deviations, demo |

## Synthesis

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[synthesis/open-questions\|Open Questions]] | active | medium | questions, unknowns |
| [[synthesis/roadmap\|Roadmap]] | active | high | sequencing, priorities |
| [[synthesis/lint-report\|Lint Report]] | active | high | maintenance |
| [[synthesis/deferred-features\|Deferred Features — Review Backlog]] | active | high | deferred, future, slice-3-plus, backlog |

## Test Plans

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[test-plans/README\|Test Plans index]] | active | high | testing, plans, validation, test-targets |
| [[test-plans/slice-3-recursion-demo\|Slice 3 — Recursion Demo]] | active | high | testing, slice-3, recursion, plugins, demo, end-to-end |
| [[test-plans/failure-modes\|Failure Modes — Adversarial Scenarios]] | seed | medium | testing, failure-modes, adversarial, robustness |
| [[test-plans/real-client-target\|Real-Client-Target Use]] | seed | medium | testing, real-target, slice-3, exit-criterion |

---

## Recent activity

- **2026-04-26 (Phase 6 scaffold and bookkeeping resolution)** — Per Eli, the new focus after the slice 3 ship is hardening: thorough testing plus growing the tool catalog, both running through the slice 3 plugin model rather than as new slice work. [[synthesis/roadmap|Roadmap]] gained Phase 6 — "Hardening and catalog growth (active)" — framing the dual focus across two threads (Thread A: thorough testing under [[test-plans/README|test-plans/]]; Thread B: new tools via plugins). Test-plans scaffold landed: [[test-plans/slice-3-recursion-demo|recursion demo plan]] written from the existing slice 3 ship demo artifacts, formalizing the exit criteria coverage and the verification checklist; [[test-plans/failure-modes|failure modes plan]] seeded as a placeholder for adversarial scenarios; [[test-plans/real-client-target|real-client-target plan]] seeded for Eli's first real-target run, deliberately written to be filled in at run time rather than backfilled. Bookkeeping closures: reconFTW license question resolved per Eli (the `LICENSE` file is the contractually-controlling document; the project is MIT; the README's GPLv3 mentions are documentation drift inside reconFTW's own repo, not a competing legal claim). [[competitive/reconftw|reconFTW page §Pricing / licensing model]] rewritten; [[competitive/leverage-analysis|leverage-analysis]] updated in three places (Strategy 1 license bullet, Strategy 3 license bullet, Recommendations §1); the carryover "file a GitHub issue as courtesy" item retired entirely. Christopher's onboarding complete — dropped from the [[synthesis/roadmap|roadmap]] outstanding-items list and the [[sessions/2026-04-26-slice-3-shipped|slice 3 ship session note]]'s carryover list (per Eli, do not mention again). Scoring-tables-to-YAML re-categorized in [[synthesis/deferred-features|deferred-features]] from open-ended polish to queued-behind-slice-3-testing with an explicit trigger (slice 3 testing wraps); will bundle with a post-testing architecture overview update. Wiki state: 32 pages, all internally consistent.
- **2026-04-26 (engagements-RESERVED/ retired, test-plans/ created)** — Per Eli's call: the wiki will never be used to store real engagement data — CSAK's `Org` entity is the system of record for that. The `engagements-RESERVED/` placeholder folder is retired; the slot is repurposed as `test-plans/` for testing plans. Rationale: the original justification for `engagements-RESERVED/` ("the wiki may want to mirror what the product stores") got weaker once slice 1 shipped with the `Org` entity; testing plans are a useful prose-side complement to code-side `tests/` and the demo scaffolding under `scripts/`. First plan to land is the slice 3 recursion demo — the artifacts already exist in the repo from the slice 3 ship (`scripts/test_target_recurse.py`, `scripts/csak_plugins/linkfinder.py`, `scripts/run_slice3_demo.py`); a wiki-side plan describing them as a testing scenario is the natural next piece. Updates landed: new [[test-plans/README|test-plans/README]] (commit `cec4907`); deleted `engagements-RESERVED/README.md` (commit `b17c73f`); index Reserved section replaced with Test Plans section (this commit); CYBER.md updated to drop the engagements-RESERVED reference; deferred-features.md entry removed since the question is resolved rather than deferred.

- **2026-04-26 (slice 3 shipped)** — Slice 3 implementation landed on `origin/main` at commit `422b8ef`. The hand-off prompt was sent to Claude Code; Claude Code read the spec end-to-end, built the slice in roughly the order the spec's module-by-module diff suggested, ran the existing slice 1/2 test suite to catch regressions during the migration, then wrote slice 3-specific tests for the new surface area. End state: 275 tests pass (1 pre-existing skip), every slice 3 exit criterion exercised. New code: `csak/collect/types/__init__.py` and `csak/collect/types/builtin.py` for the runtime type registry and seven core types; `csak/collect/recursion.py` for the recursion runner with frontier dedup, depth loop, prompt-to-continue, and depth-1+ independent task semantics; `csak/collect/plugins.py` for fail-soft plugin discovery from `~/.csak/tools/` (with `CSAK_PLUGIN_DIR` env override); `csak/cli/tools.py` for `csak tools list` / `csak tools show <name>`. Modified: `tool.py` extended with `accepts`/`produces`/`extract_outputs`/`origin`/`source_path` (`applies_to` becomes a thin wrapper over `matches(t, self.accepts)` for backward-compat); each of subfinder/httpx/nuclei gains its `extract_outputs`; `tools/__init__.py` becomes the runtime registry; `router.py` calls `matches()` directly per spec; `pipeline.py` chains stages via `extract_outputs` plus the type matcher and threads `parent_scan_id` / `depth` / `triggered_by_finding_id` into Scan creation; CLI `collect` gains `--recurse` / `--max-depth` / `--no-plugins`; `ProgressReporter` extended with depth headers, frontier counts, prompt-to-continue, recursion summary; `csak doctor` validates type registry plus recursion graph plus lists plugins. Removed: `csak/collect/detect.py` (replaced by `classify()`), and `_prepare_input_for_next_stage` plus `_extract_field_to_list` from `pipeline.py` (subsumed by `extract_outputs`). Storage: `SCHEMA_VERSION` 1→2 with idempotent `ALTER TABLE` adding three nullable columns to `scans`; idempotent on re-open; tested against an existing slice 1/2 database. Six post-implementation deviations surfaced by Claude Code and written back into the spec via `wiki_edit` (commit 2f02e87): (1) `httpx.accepts = ["host", "network_block"]` and `nuclei.accepts = ["host", "url", "network_block"]`, preserving slice 2 CIDR routing; (2) `_recognizes_host` rejects no-alpha-TLD strings so bare IPs don't classify as subdomain; (3) depth-0 dedup interaction (`dedup_set=None` for the root pass, dedup applies depth 1+); (4) dedup-set seeding before depth 0 so a depth-0 finding pointing at the root doesn't re-queue at depth 1; (5) doctor's orphan-output check considers same-tool feedback (nuclei → nuclei) as valid; only `finding_ref` flags as orphan in the built-in catalog; (6) registry validation gates `csak collect` startup with non-zero exit and a `ClickException` pointing at `csak doctor`. Plus one gap surfaced that wasn't in the original spec: every plugin tool that produces an artifact must register an ingest parser (no-op acceptable) with `csak.ingest.pipeline.register_parser` or the slice 1 ingest pipeline raises "no parser registered for tool 'X'". Now documented as a contract bullet under §Plugin discovery. Live demo: `scripts/run_slice3_demo.py` orchestrates a 3-port test target (`scripts/test_target_recurse.py`, app/admin/api roles with tier-0 / tier-1 / tier-2 disclosure fixtures), the example `linkfinder` plugin (a real working plugin under `scripts/csak_plugins/`), and a `csak collect --recurse` run that completes in 1.9 seconds with 16 scans across two depths. Lineage columns persist correctly. Per CYBER.md special-handling rule, the slice 3 ship session note is the next thing to land. Slice 2 implementation status also flipped — it's been on main alongside slice 3 since the slice 2 build landed and slice 3 directly exercises it; the slice 2 row in the Specs table flips from "in implementation" to "shipped" alongside slice 3.
- **2026-04-26 (slice 3 spec approved)** — Eli signed off on the [[specs/slice-3|slice 3 spec]]. Status flipped `draft` → `active`, confidence bumped medium → high. The spec is reconciled against shipped slice 2 code (per the same-day reconciliation pass) and ready for implementation hand-off to Claude Code. Strategic shape unchanged from the 2026-04-25 draft: deterministic recursion via output→input type matching, structural in-memory frontier dedup as the natural termination mechanism, `--max-depth N` flag (default 3, 0 = infinite, 1 = no recursion) with prompt-to-continue, sync-only, pluggable third-party tools in `~/.csak/tools/` joining the same toolbox as built-ins, `csak tools list/show` for catalog introspection, depth-aware live output, three additive nullable columns on `Scan` (`parent_scan_id`, `depth`, `triggered_by_finding_id`), seven core types with subtype hierarchy and metadata dict on `TypedTarget` values, `classify()` as the dispatcher consulting the runtime registry. Implementation slice (Phase 5) trigger condition met; ready to start when Eli kicks it off.
- **2026-04-26 (slice 3 spec reconciled against shipped slice 2 code)** — Eli uploaded the slice 2 codebase; the slice 3 spec was diff'd against it and seven corrections applied. (1) `httpx.accepts` corrected to `["host"]` only — URL-typed targets skip httpx in the shipped slice 2 router (already-known endpoint), and slice 3 inherits this. (2) `Tool` interface "slice 2 fields" expanded to match the actually-shipped surface (`output_filename`, `rate_limit`, `version_args`, `override_flags`, `is_skipped_by_mode`, `parse_version`); slice 3's diff stays additive. (3) Acknowledged that `extract_outputs` formalizes existing logic in `pipeline._prepare_input_for_next_stage` / `_extract_field_to_list` rather than introducing a new operation; those helpers can be deleted in the slice 3 migration. (4) `InvalidTargetError` handling spelled out for both CLI and `extract_outputs` callers (mirrors slice 2's `"invalid"` literal). (5) Failure-cascade behavior clarified: depth 0 keeps the slice 2 cascade rule (subfinder fail → httpx falls back, httpx fail → nuclei aborts); depth 1+ each `(tool, target, mode)` is independent. (6) Recursion-spawned scans go through the existing `csak.ingest.targets` promotion path — the recursion runner doesn't pre-create Target rows. (7) New §Module changes against current source section maps every existing file in `csak/collect/` to its slice 3 delta and lists the new files (`types/__init__.py`, `types/builtin.py`, `recursion.py`, `plugins.py`, `cli/tools.py`) plus the `SCHEMA_VERSION 1→2` migration. Implication: slice 3 implementation can hand off to Claude Code cleanly once Eli signs off on the `draft` spec; the spec is now grounded against shipped code rather than design intent. Spec stays `draft` / confidence `medium` until sign-off. Fifth lint pass caught two follow-on issues from this reconciliation (architecture overview's §7 had the same `types.py` vs `types/builtin.py` Python-invalid layout, and referenced a non-existent `csak/collect/output.py` for the live output extension); both fixed.
- **2026-04-25 (slice 3 spec drafted)** — Wrote [[specs/slice-3|specs/slice-3.md]] capturing the strategic decisions from the slice 3 design session. Covers: deterministic recursion via output-to-input type matching; structural in-memory frontier dedup as termination mechanism; `--max-depth N` flag (default 3, 0 = infinite, 1 = no recursion) with prompt-to-continue; sync-only execution; runtime type registry with toolbox-driven type registration; `classify()` as dispatcher unifying `--target` resolution and `extract_outputs`; pluggable third-party tools in `~/.csak/tools/` joining the same toolbox as built-ins; `csak tools list/show` for catalog introspection; depth-aware live output with frontier counts; data model adds `Scan.parent_scan_id`, `Scan.depth`, `Scan.triggered_by_finding_id`. Bookkeeping: [[product/slices|slice plan]] slice 3 section rewritten to mirror slice 1/2 pattern; [[product/glossary|glossary]] gained 11 slice 3 vocabulary terms; [[synthesis/open-questions|open-questions]] moved 6 slice 3 questions to Answered; [[synthesis/roadmap|roadmap]] reshaped with Phase 3 (slice 2 done) and Phase 4 (slice 3 design draft-complete); [[synthesis/deferred-features|deferred-features]] source pointers updated to reference the spec instead of the design discussion. Spec status `draft`, confidence medium; awaiting Eli's review and sign-off.
- **2026-04-25 (deferred-features consolidation page)** — Wrote [[synthesis/deferred-features|deferred-features.md]] consolidating every "later slice / slice 4+ / future work" item from across the wiki into one review backlog. Created during slice 3 design as the post-slice-3 review surface. The page is a view, not a relocation — source pages keep their deferred-item language; this page points at them. Headline new entry is plugin sandboxing for third-party tools (slice 3 ships unsandboxed, sandboxing is a later-slice question if/when third-party plugin distribution becomes common). Other consolidated items: async/background collect, recursion budgets beyond `--max-depth`, Nessus REST API, scoring tables to YAML, references page, engagements-RESERVED resolution, the LLM-layer slice in full, scheduled reports, period diffs, ticketing integrations, multi-user, web UI, distributed scanning, generic CSV ingest, reconFTW JSON ingest, DefectDojo bidirectional, quick rescan, additional export formats, additional target types, concurrent-collect soft warning, plus cross-cutting product questions and the definitively-declined list.
- **2026-04-25 (slice 3 design strategic decisions)** — Slice 3 strategic shape settled: deterministic recursion via output→input type matching (no LLM); structural in-memory frontier dedup (no DB-backed history) as the natural termination mechanism; `--max-depth N` flag, default 3, 0 = infinite, 1 = no recursion, prompt-to-continue at depth limit; sync-only (async deferred); pluggable third-party tools in `~/.csak/tools/` joining the same toolbox as built-ins; `csak tools list/show` for catalog introspection; depth-aware live output; data model adds `parent_scan_id`, `depth`, `triggered_by_finding_id`. Type system extended: `network_block | host | domain | subdomain | url | service | finding_ref` with subtype hierarchy and metadata dict on `TypedTarget` values. Critical refinement: types are part of the toolbox (each tool can register types it brings), `classify()` is a dispatcher that consults the registry rather than hardcoded logic — this is what makes catalog expansion genuinely cheap. Spec drafting next.
- **2026-04-24 (CYBER.md §9 rewritten for new MCP tools)** — CYBER.md §9 (working with the MCP tools) rewritten end-to-end to document five new tools the MCP server is being extended with: `wiki_edit` (patch primitive), `wiki_read` with `section=` filter, `wiki_read_many` (batched reads), `wiki_status_set` (front matter mutations with schema validation), `wiki_log_tail` (recent log entries as structured data). Includes decision rules and patterns the LLM should internalize for using the right tool for the job. The full design spec for these tools lives with the MCP server's implementation, not in this wiki.
- **2026-04-24 (lint pass three executed)** — Third [[synthesis/lint-report|lint pass]] catalogued twelve issues caused by slice 2 spec finalization making forward-looking sections stale. All eight high/medium fixes executed in this pass: open-questions slice 2 section moved to Answered, scope and slices product pages updated to mirror slice 1 pattern, leverage-analysis slice 2 recommendations updated and status bumped to active, competitive/README index Verdict and Key takeaways updated, vision and users-and-jobs reconFTW framing corrected, glossary expanded with slice 2 vocabulary, engagements-RESERVED revisit-trigger updated. Plus one low fix (delete empty `sessions.md` at top level) and missing session row added to the index. Wiki at 25 pages, all internally consistent.
- **2026-04-24 (tool output reference for slice 2)** — Wrote [[research/slice-2-tool-output-reference|tool output reference page]] documenting verified flag names, output formats, stderr patterns, and rate-limit signal heuristics for Subfinder, httpx, and Nuclei. Compiled from official ProjectDiscovery docs and verified GitHub issues. Key finding: nuclei does not emit a clean "429" signal — it surfaces target rate-limiting as `[WRN] context deadline exceeded` lines, which the catalog's `detect_rate_limit_signal` must heuristically detect. Avoiding a half-day discovery during build by surfacing this up front. Page is the reference Code reads to write the per-tool catalog modules in `csak/collect/tools/<tool>.py`.
- **2026-04-24 (slice 2 spec approved)** — Eli signed off on the [[specs/slice-2|slice 2 spec]]. Status flipped `draft` → `active`, confidence bumped medium → high. Spec is ready for implementation alongside the existing CSAK repo. Strategic shape: orchestrate Subfinder + httpx + Nuclei (the on-demand active tools that earn their keep from a CLI), with target-type auto-detection driving tool routing, three modes, adaptive rate limiting default-on, sync-only, no quick rescan, no LLM, no Nessus API yet, no reconFTW JSON ingest.
- **2026-04-24 (reconFTW case study)** — Direct reading of reconFTW's source corrected an earlier framing. reconFTW does not have intelligent runtime tool selection — it runs all enabled tools in a fixed pipeline and dedups the union. The "selection" is config-file knobs (~300 of them). Real value is the recipes (tool-flag combinations), not the orchestration logic. [[competitive/reconftw|reconFTW page]] and [[competitive/build-vs-adapt|build-vs-adapt]] both updated; informs slice 2 design directly (adapt recipes, build orchestration, no runtime dependency on reconFTW).
- **2026-04-24 (slice 1 shipped)** — Slice 1 implementation delivered and reviewed. 83 tests pass, end-to-end run on a Nessus fixture verified. Two small deviations from the original spec text — millisecond timestamp precision and an `ID` column on `csak findings list` — were accepted and written back into [[specs/slice-1|the spec]] and [[architecture/overview|architecture overview]]. See [[sessions/2026-04-24-slice-1-implementation-review|implementation review session]] and [[sessions/2026-04-24-slice-1-shipped|shipped session]].
- **2026-04-23 (probability_real removed)** — Feature pulled from slice 1 per Eli after a clarification exchange. Priority formula is now `severity × confidence × target_weight` (three axes). Spec, glossary, architecture overview, users-and-jobs, open-questions, competitive pages, and session notes all updated to reflect the removal. Analyst doubt is now expressed via `status` (`active` / `suppressed` / `false-positive`) or `tags`.
- **2026-04-23 (slice 1 approved)** — Eli signed off on the finalized [[specs/slice-1|slice 1 spec]]. Status flipped `draft` → `active`; confidence bumped medium → high.
- **2026-04-23 (architecture overview written)** — [[architecture/overview|architecture/overview.md]] written as the five-minute map to the slice 1 spec. Mermaid system diagram, five module boundaries, one end-to-end walkthrough, extension points, explicit list of what's deferred. The planned `architecture/data-flow.md` was folded in.
- **2026-04-23 (second lint pass)** — Caught three remaining stale references in the competitive cluster. All fixed.
- **2026-04-23 (lint pass + fixes)** — First [[synthesis/lint-report|lint report]] after slice 1 finalization. Catalogued stale references, fixed the product pages, updated DefectDojo and leverage-analysis for the deferred foreign-JSON ingest and the resolved fourth-layer question, and cleaned up ADR-009 references.
- **2026-04-23 (slice 1 finalized)** — All open design questions for slice 1 resolved in [[specs/slice-1|the spec]]. Key decisions: four-layer data model (Org → Target → Scan → Finding + Artifact), no Report entity, scoring write-once at ingest, markdown/docx/JSON all first-class exports, no LLM use inside slice 1, folder-aware Zeek ingest.
- **2026-04-23 (ADR scaffolding removed)** — Deleted `decisions/` folder. Rationale for every significant choice now lives inline in the section of the design document that makes the choice.
- **2026-04-23 (competitive deep dive)** — Wrote [[competitive/defectdojo|DefectDojo]] and [[competitive/reconftw|reconFTW]] analyses, [[competitive/leverage-analysis|leverage analysis]], and [[competitive/build-vs-adapt|build-vs-adapt]].
- **2026-04-23 (morning correction)** — Clarified that CSAK is primarily on-demand/real-time. Reports have time-window *structure* but invocation is not periodic.
- **2026-04-22 (evening rewrites)** — Late-evening clarification: reports are org+time-period scoped. Data model expanded from target-centric to a hierarchical model.
- **2026-04-22 (afternoon)** — First working session. CSAK reframed from "downstream triager" to "orchestrator and triager." Slice plan adopted.
- **2026-04-21** — Initial scaffold.

---

## Status legend

- **seed** — stub with open questions, no real content yet
- **draft** — partial content, in flight
- **active** — useful and maintained
- **mature** — comprehensive and stable (rare pre-design)
- **planned** — referenced elsewhere but not yet written
- **retired** — abandoned; kept for history
- **superseded** — replaced; `superseded_by` points to the newer page

## Link format

Explicit-path pipe syntax everywhere: `[[path/to/file|Display Text]]`. See [[CYBER|CYBER.md §4]].
