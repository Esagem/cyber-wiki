---
title: "CSAK Design Wiki — Master Index"
category: synthesis
tags: [index, master, navigation]
status: active
confidence: high
created: 2026-04-21
updated: 2026-04-22
---

# CSAK Design Wiki — Master Index

## What this is

The collaborative design space for building the **Cybersecurity Swiss Army Knife (CSAK)** — a tool that orchestrates security tools against a target, ingests their output, triages what matters, and emits coherent reports.

**Phase: pre-design, actively converging.** First slice spec drafted 2026-04-22. See [[CYBER|CYBER.md]] for the operating schema.

---

## Product

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[product/vision\|Vision]] | draft | medium | what, who, why |
| [[product/scope\|Scope]] | seed | low | in-scope, out-of-scope |
| [[product/slices\|Slice Plan]] | draft | medium | slices, roadmap, scope |
| [[product/users-and-jobs\|Users & Jobs]] | **planned** | — | personas, jobs-to-be-done |
| [[product/glossary\|Glossary]] | seed | low | vocabulary, definitions |

## Architecture

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[architecture/overview\|Architecture Overview]] | **planned** | — | diagram, narrative |
| [[architecture/data-flow\|Data Flow]] | **planned** | — | ingest, triage, report |

## Specs

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[specs/slice-1\|Slice 1 — Ingest & Report]] | draft | medium | slice-1, ingest, triage, report |
| [[specs/ingestion-model\|Ingestion Model]] | **planned** | — | ingestors, adapters, sources |
| [[specs/triage-model\|Triage Model]] | **planned** | — | severity, confidence, importance |
| [[specs/report-formats\|Report Formats]] | **planned** | — | internal-reviews, fix-it-tickets |

## Research

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| _None yet. Drop sources into [[research/sources\|research/sources/]] and summary pages beside them._ | | | |

## Competitive

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| _None yet. One page per competing or adjacent tool as we research them._ | | | |

## Decisions (ADRs)

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[decisions/README\|ADR Format & Index]] | active | high | meta, process |

_No ADRs yet. The forecast list from decisions/README is still accurate; ADR-001 (scope boundary) and ADR-004 (storage) are the two most imminent once slice 1 review settles._

## Sessions

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[sessions/2026-04-22-slice-1-kickoff\|2026-04-22 — Slice 1 Kickoff]] | active | medium | slice-1, product-shape, tools |

## Synthesis

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[synthesis/open-questions\|Open Questions]] | active | medium | questions, unknowns |
| [[synthesis/roadmap\|Roadmap]] | seed | low | sequencing, priorities |
| [[synthesis/lint-report\|Lint Report]] | **planned** | — | maintenance |

## Reserved

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[engagements-RESERVED/README\|engagements-RESERVED/]] | seed | — | placeholder, future |

_Empty until an ADR activates it. See the README for what would change._

---

## Recent activity

- **2026-04-22** — First real working session. CSAK reframed from "downstream triager" to "orchestrator and triager." Slice plan drafted (slice 1: ingest & report; slice 2: orchestration; slice 3: recursion). Slice 1 spec drafted with 5 starter tools (Nuclei, Nessus Essentials, Zeek, osquery, Subfinder+httpx). Target-centric data model adopted. See [[sessions/2026-04-22-slice-1-kickoff|session notes]].
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
