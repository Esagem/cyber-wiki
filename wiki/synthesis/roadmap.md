---
title: "Roadmap"
category: synthesis
tags: [roadmap, sequencing, priorities]
status: active
confidence: high
owner: shared
created: 2026-04-21
updated: 2026-04-26
---

# Roadmap

> The design roadmap that sequenced slices 1, 2, and 3 from blank-page through design and into build. Slice 1 is implemented and shipped. Slice 2 is implemented and shipped (on `origin/main`; exercised directly by the slice 3 build). Slice 3 is implemented and shipped (commit `422b8ef` on `origin/main`, 2026-04-26). The wiki is now reference-only alongside the build; further design work happens in concentrated bursts when a new slice's strategic shape needs settling.

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

## Phase 1b — Slice 1 implementation (done)

**Goal:** slice 1 code exists, tests pass, end-to-end flow works on a real tool output file.

- [x] Repo scaffolded matching the architecture overview's module layout (`csak/cli`, `csak/ingest`, `csak/storage`, `csak/query`, `csak/render`, plus `templates/` and `tests/`). pyproject.toml with click, jinja2, python-docx (no pandoc, no SQLAlchemy). *(Shipped 2026-04-24.)*
- [x] All five starter parsers implemented (Nuclei, Nessus, Zeek folder-aware, osquery, Subfinder + httpx). *(Shipped 2026-04-24.)*
- [x] Three-axis scoring (`severity × confidence × target_weight`), write-once at ingest, recomputed only on `status`/`tags`/target-weight mutations. *(Shipped 2026-04-24.)*
- [x] Tool-specific dedup for all six sources, re-occurrences advance `last_seen` + add FindingScanOccurrence without re-scoring. *(Shipped 2026-04-24.)*
- [x] Stateless reports with markdown, docx, and JSON exports from a shared report context. *(Shipped 2026-04-24.)*
- [x] Fit bundle as directory + zip + period-level JSON. *(Shipped 2026-04-24.)*
- [x] CLI surface per the spec: org / ingest / findings (list/show/update) / target / scan / report. `findings list` exposes an `ID` column so mutations are self-contained; prefix lookup on downstream commands. *(Shipped 2026-04-24.)*
- [x] 83 tests passing in ~7 seconds. End-to-end run verified on a Nessus fixture: correct priorities, status-based suppression honored, millisecond-timestamped outputs accumulate without collision. *(Verified 2026-04-24.)*
- [x] Two small deviations from the original spec text (millisecond timestamp precision, `ID` column on `findings list`) accepted and written back into the spec.

**Slice 1 is complete.** The exit criteria in [[specs/slice-1|the spec]] are all met; the implementation faithfully follows every load-bearing spec decision.

## Phase 2 — Competitive grounding (ongoing, non-blocking)

**Goal:** we know what already exists so we don't reinvent.

- [x] [[competitive/defectdojo|DefectDojo]].
- [x] [[competitive/reconftw|reconFTW]].
- [x] [[competitive/leverage-analysis|leverage analysis]] and [[competitive/build-vs-adapt|build-vs-adapt]] — what we can borrow, what we build fresh.
- [ ] Faraday, PlexTrac, AttackForge.
- [ ] Splunk, Wazuh, Tenable (boundary documentation — what CSAK is explicitly not).
- [ ] n8n (workflow-automation adjacent to slice 2's orchestration question).
- [ ] One LLM-powered upstart (XBOW or NodeZero).
- [ ] Synthesis page: what's missing from the market that CSAK fills.

Phase 2 runs in parallel with the build; none of it is load-bearing.

## Phase 3 — Slice 2 design and build (done)

**Goal:** slice 2 spec is detailed and approved; slice 2 implementation runs end-to-end.

- [x] **Strategic shape settled.** reconFTW relationship resolved: build CSAK's own typed orchestrator, adapt recipes from reconFTW with attribution. *(Closed via [[competitive/reconftw|case study]] 2026-04-24.)*
- [x] [[specs/slice-2|slice 2 spec]] approved by Eli, status `draft` → `active`, confidence medium → high. *(Approved 2026-04-24.)*
- [x] [[research/slice-2-tool-output-reference|tool output reference]] written before build to lock down flag names, output formats, and rate-limit signal heuristics for subfinder, httpx, nuclei. *(Written 2026-04-24.)*
- [x] [[architecture/overview|architecture overview]] extended with the collect module section, slice 2 walkthrough, and slice 2 extension points. *(Updated 2026-04-24.)*
- [x] Slice 2 implementation built, tested, and shipped to `origin/main`. *(Built and under test per Eli 2026-04-25; status flipped to fully shipped 2026-04-26 after the slice 3 build extended the slice 2 catalog modules with `accepts`/`produces`/`extract_outputs` and the slice 2 single-pass behavior was verified preserved at depth 0 of the slice 3 recursion runner. The slice 2 implementation review session note is folded into the slice 3 ship session note rather than written separately, since slice 2 was exercised through slice 3's test surface.)*

## Phase 4 — Slice 3 design (done)

**Goal:** slice 3 spec is detailed enough that implementation can start; strategic decisions captured; deferred items consolidated for post-slice-3 review.

- [x] **Strategic shape settled in conversation 2026-04-25.** Deterministic recursion via output-to-input type matching; structural in-memory frontier dedup (no DB-backed history); `--max-depth N` flag default 3 with prompt-to-continue; sync-only; pluggable third-party tools in `~/.csak/tools/`; `csak tools list/show`; depth-aware live output; data model adds `parent_scan_id`, `depth`, `triggered_by_finding_id`; type registry with toolbox-driven type registration; `classify()` as dispatcher.
- [x] [[synthesis/deferred-features|deferred-features.md]] written to consolidate every "later slice / future work" item across the wiki for post-slice-3 review. *(Written 2026-04-25.)*
- [x] [[specs/slice-3|slice 3 spec]] drafted, status `draft`, confidence medium. *(Drafted 2026-04-25.)*
- [x] [[specs/slice-3|slice 3 spec]] reviewed and approved by Eli; status flips `draft` → `active`, confidence medium → high. *(Approved 2026-04-26.)*
- [x] [[architecture/overview|architecture overview]] extended with the slice 3 module work (recursion runner, type registry, plugin discovery), slice 3 walkthrough, updated extension points. *(Slice 3 module section added 2026-04-25; reconciled against shipped slice 2 code and corrected 2026-04-26 — walkthrough still pending and will follow when slice 3 implementation lands.)*
- [x] [[product/glossary|glossary]] extended with slice 3 vocabulary (`TypedTarget`, target type registry, recursion frontier, depth, plugin tool, classify, extract_outputs). *(Updated 2026-04-25.)*
- [x] [[product/slices|slice plan]] slice 3 section rewritten to mirror the slice 1 / slice 2 pattern (summary + spec link, drop the "deliberately not specced in detail yet" framing). *(Updated 2026-04-25.)*

## Phase 5 — Slice 3 implementation (done)

**Trigger:** slice 3 spec approved. *(Trigger satisfied 2026-04-26.)*

- [x] **Implementation hand-off prompt sent to Claude Code.** Spec referenced as authoritative source; load-bearing constraints flagged up front (httpx accepts, types/ as package, ProgressReporter location, extract_outputs lineage, depth-0 cascade, InvalidTargetError, backward compat, ingest target promotion, applies_to wrapper survival, fail-soft plugins). *(Sent 2026-04-26.)*
- [x] **Build sequence followed the spec's module-by-module diff.** Storage migration first (`SCHEMA_VERSION` 1→2 with three nullable columns; idempotent against existing slice 1/2 DB), then types package (`types/__init__.py` registry plus `types/builtin.py` for the seven core types), then `Tool` interface extension, then router via `matches()`, then recursion runner with frontier dedup and prompt-to-continue, then CLI surface (`--recurse`, `--max-depth`, `--no-plugins`, depth-aware `ProgressReporter`, `csak tools list`/`show`), then plugin discovery, then `csak doctor` extensions for type registry plus recursion graph plus plugin status. *(Built 2026-04-26.)*
- [x] **All slice 3 exit criteria met** (see [[specs/slice-3|spec exit criteria]]) except real-client-target use by Eli, which is expected to follow as slice 3 is exercised in normal cybersecurity work. *(Verified 2026-04-26.)*
- [x] **275 tests pass.** Slice 1/2 suite migrated cleanly through type-name renames (`cidr` → `network_block`, IP → host); slice 3-specific tests added for type registry, classify, extract_outputs, recursion runner, plugin discovery, schema migration, and the new CLI surface. *(Verified 2026-04-26.)*
- [x] **End-to-end demo wired.** `scripts/run_slice3_demo.py` orchestrates `scripts/test_target_recurse.py` (3-port test target with tier-0 / tier-1 / tier-2 disclosure fixtures across app/admin/api roles) plus the example `linkfinder` plugin (real working plugin under `scripts/csak_plugins/`). Recursion completes in 1.9 seconds with 16 scans across two depths; lineage columns persist correctly. *(Verified 2026-04-26.)*
- [x] **Six post-implementation deviations written back into the spec.** `httpx`/`nuclei` accepts include `network_block`; conservative host recognizer; depth-0 dedup interaction (`dedup_set=None` for root pass); dedup-set seeding before depth 0; doctor's same-tool-feedback handling; registry validation gating `csak collect` startup. *(Spec edit committed 2026-04-26 as commit `2f02e87`.)*
- [x] **Plugin parser registration contract surfaced as a new spec bullet.** Every plugin tool that produces an artifact must register an ingest parser (no-op acceptable) with `csak.ingest.pipeline.register_parser` or the slice 1 ingest pipeline raises "no parser registered for tool 'X'". Now documented under §Plugin discovery. *(Spec edit committed 2026-04-26 as commit `2f02e87`.)*
- [x] **Slice 3 spec status closed with "Status: all criteria met as of 2026-04-26."** Mirrors slice 1's pattern. *(Closed 2026-04-26 as commit `18406d3`.)*
- [x] Slice 3 ship session note written. *(Written 2026-04-26 — [[sessions/2026-04-26-slice-3-shipped|2026-04-26-slice-3-shipped]]; covers Claude Code's implementation, the six deviations, the parser-registration gap, the demo scaffolding, and folds in the slice 2 implementation review since slice 2 was exercised directly through the slice 3 build.)*
- [ ] Real-client-target use by Eli on slice 3's `csak collect --recurse`. *(Expected to follow naturally during normal cybersecurity work.)*

**Slice 3 is complete pending the ship session note and real-target use.** The implementation faithfully follows every load-bearing spec decision; deviations were captured back into the spec; the demo verifies the full surface end-to-end against a local test target with a real working plugin.

## Pre-design → build transition

The transition completed 2026-04-24. Pre-design exit criteria:

- [x] Slice 1 spec is `active` (sign-off complete 2026-04-23).
- [x] [[architecture/overview|architecture overview]] is written so a newcomer can understand the pipeline shape without reading the full spec.
- [x] Competitive grounding is deep enough we're not surprised by obvious prior art during implementation. DefectDojo and reconFTW covered; the rest runs in parallel.
- [x] Eli has reviewed and signed off (2026-04-23).
- [x] Slice 1 is implemented and verified (2026-04-24).

The wiki's role has shifted: it is now the reference alongside the CSAK repo, not the primary working surface.

## Outstanding non-blocking items

Tracked so they don't get lost:

- More competitive pages (Faraday, PlexTrac, AttackForge, Splunk, Wazuh, Tenable, n8n, an LLM-powered upstart).
- reconFTW GitHub issue on the MIT/GPL-3.0 license ambiguity. Only matters before code-level leverage, which is slice 2 territory.
- Canva pitch deck slides 4 and 8 — periodic-mode language fix. External to this wiki.
- Christopher's onboarding (repo collaborator access, Claude connector setup, Obsidian+Git sync).
- Move scoring tables from inline Python (`csak/ingest/scoring.py`) to YAML config files under `config/triage/severity/<tool>.yaml`. Low priority polish; noted in the architecture overview.

## Related

- [[product/scope|Scope]]
- [[specs/slice-1|Slice 1 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[specs/slice-3|Slice 3 Spec]]
- [[architecture/overview|Architecture Overview]]
- [[synthesis/open-questions|Open Questions]]
- [[synthesis/deferred-features|Deferred Features]]
- [[synthesis/lint-report|Lint Report]]
