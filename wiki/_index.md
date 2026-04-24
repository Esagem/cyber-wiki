---
title: "CSAK Design Wiki — Master Index"
category: synthesis
tags: [index, master, navigation]
status: active
confidence: high
created: 2026-04-21
updated: 2026-04-24
---

# CSAK Design Wiki — Master Index

## What this is

The collaborative design space for building the **Cybersecurity Swiss Army Knife (CSAK)** — a tool that orchestrates security tools against a target, ingests their output, triages what matters, and emits coherent reports per organization.

**Phase: slice 1 shipped.** Spec is `active`, implementation is complete (83 tests pass, end-to-end verified 2026-04-24). The wiki is now the reference alongside the CSAK repo, not the primary working surface. Next focus: slice 2 design. See [[CYBER|CYBER.md]] for the operating schema. Rationale for every significant choice lives inline in the section that makes the choice — there are no separate decision records.

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
| [[specs/slice-2\|Slice 2 — Tool Orchestration]] | **planned (next)** | — | slice-2, orchestration |
| [[specs/ingestion-model\|Ingestion Model]] | **planned** | — | ingestors, adapters, sources |
| [[specs/triage-model\|Triage Model]] | **planned** | — | severity, confidence, importance |
| [[specs/report-formats\|Report Formats]] | **planned** | — | internal-reviews, fix-it-tickets |

## Research

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[research/README\|Research process]] | active | high | meta, process |

_No research pages yet. Drop sources into [[research/sources|research/sources/]] with summary pages beside them._

## Competitive

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[competitive/README\|Competitive Analysis Index]] | active | high | meta, format |
| [[competitive/defectdojo\|DefectDojo]] | active | medium | vuln-management, open-source |
| [[competitive/reconftw\|reconFTW]] | active | medium | recon-orchestration, open-source |
| [[competitive/leverage-analysis\|Leverage Analysis]] | draft | medium | licensing, feasibility |
| [[competitive/build-vs-adapt\|Build vs Adapt]] | draft | medium | decision-input, slice-1 |

_Still to write: Faraday, PlexTrac, AttackForge, Splunk, Wazuh, Tenable, n8n, one LLM-powered upstart. Non-blocking; can run in parallel with slice 2 work._

## Sessions

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[sessions/2026-04-22-slice-1-kickoff\|2026-04-22 — Slice 1 Kickoff]] | active | medium | slice-1, product-shape, tools |
| [[sessions/2026-04-24-slice-1-shipped\|2026-04-24 — Slice 1 Shipped & Reviewed]] | active | high | slice-1, implementation, review |

## Synthesis

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[synthesis/open-questions\|Open Questions]] | active | medium | questions, unknowns |
| [[synthesis/roadmap\|Roadmap]] | active | high | sequencing, priorities |
| [[synthesis/lint-report\|Lint Report]] | active | high | maintenance |

## Reserved

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[engagements-RESERVED/README\|engagements-RESERVED/]] | seed | — | placeholder, future |

_Empty until we choose to activate it. Note: the existence of an `Org` entity in slice 1 may make this folder less necessary than originally planned. Revisit once the first real client engagement runs through CSAK._

---

## Recent activity

- **2026-04-24 (slice 1 shipped)** — Slice 1 implementation delivered and reviewed. 83 tests pass, end-to-end run on a Nessus fixture verified: arithmetic correct, status-based suppression working, markdown/docx/JSON exports aligned, fit-bundle directory + zip + period-level JSON all produced. Two small deviations from the original spec text — millisecond timestamp precision and an `ID` column on `csak findings list` — were accepted and written back into [[specs/slice-1|the spec]] and [[architecture/overview|architecture overview]]. Spec status remains `active`, confidence bumped high. The wiki's role has shifted from design surface to reference. See [[sessions/2026-04-24-slice-1-shipped|session notes]]. **Next: slice 2 design.**
- **2026-04-23 (probability_real removed)** — Feature pulled from slice 1 per Eli after a clarification exchange. Priority formula is now `severity × confidence × target_weight` (three axes). Spec, glossary, architecture overview, users-and-jobs, open-questions, competitive pages, and session notes all updated to reflect the removal. Analyst doubt is now expressed via `status` (`active` / `suppressed` / `false-positive`) or `tags`.
- **2026-04-23 (slice 1 approved)** — Eli signed off on the finalized [[specs/slice-1|slice 1 spec]]. Status flipped `draft` → `active`; confidence bumped medium → high.
- **2026-04-23 (architecture overview written)** — [[architecture/overview|architecture/overview.md]] written as the five-minute map to the slice 1 spec. Mermaid system diagram, five module boundaries, one end-to-end walkthrough, extension points, explicit list of what's deferred. The planned `architecture/data-flow.md` was folded in.
- **2026-04-23 (second lint pass)** — Caught three remaining stale references in the competitive cluster (reconftw "Design changes" section, competitive/README item 3, build-vs-adapt's reconftw_ai recommendation). All fixed.
- **2026-04-23 (lint pass + fixes)** — First [[synthesis/lint-report|lint report]] after slice 1 finalization. Catalogued stale references, fixed the product pages (vision, scope, slices, users-and-jobs, glossary) to match the finalized spec, updated DefectDojo and leverage-analysis for the deferred foreign-JSON ingest and the resolved fourth-layer question, and cleaned up ADR-009 references.
- **2026-04-23 (slice 1 finalized)** — All open design questions for slice 1 resolved in [[specs/slice-1|the spec]]. Key decisions: four-layer data model (Org → Target → Scan → Finding + Artifact), no Report entity (reports are stateless pipeline exports, timestamp-prefixed files accumulate on disk), scoring is write-once at ingest (no retriage in slice 1), markdown/docx/JSON all first-class exports (python-docx for docx, no pandoc), no LLM use inside slice 1 (JSON export designed as the interface for a future LLM layer), folder-aware Zeek ingest, no generic-CSV or reconFTW JSON ingest in slice 1 (deferred, parser architecture supports adding them).
- **2026-04-23 (ADR scaffolding removed)** — Deleted `decisions/` folder. Rationale for every significant choice now lives inline in the section of the design document that makes the choice.
- **2026-04-23 (competitive deep dive)** — Wrote [[competitive/defectdojo|DefectDojo]] and [[competitive/reconftw|reconFTW]] analyses, [[competitive/leverage-analysis|leverage analysis]], and [[competitive/build-vs-adapt|build-vs-adapt]].
- **2026-04-23 (morning correction)** — Clarified that CSAK is primarily on-demand/real-time. Reports have time-window *structure* but invocation is not periodic.
- **2026-04-22 (evening rewrites)** — Late-evening clarification: reports are org+time-period scoped. Data model expanded from target-centric to a hierarchical model (subsequently refined to four-layer + Artifact on 2026-04-23).
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
