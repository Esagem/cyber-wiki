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

The collaborative design space for building the **Cybersecurity Swiss Army Knife (CSAK)** — a tool that orchestrates security tools against a target, ingests their output, triages what matters, and emits coherent periodic reports per organization.

**Phase: pre-design, actively converging.** Slice 1 spec drafted 2026-04-22. See [[CYBER|CYBER.md]] for the operating schema.

---

## Product

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[product/vision\|Vision]] | draft | medium | what, who, why |
| [[product/scope\|Scope]] | draft | medium | in-scope, out-of-scope, slices |
| [[product/slices\|Slice Plan]] | draft | medium | slices, roadmap |
| [[product/users-and-jobs\|Users & Jobs]] | draft | low | personas, jobs-to-be-done |
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
| [[research/README\|Research process]] | active | high | meta, process |

_No research pages yet. Drop sources into [[research/sources|research/sources/]] with summary pages beside them._

## Competitive

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[competitive/README\|Competitive Analysis Index]] | active | high | meta, format |

_Targets to write: DefectDojo, Faraday, PlexTrac, reconFTW, AttackForge, Splunk, Wazuh, Tenable. Plus one LLM-powered upstart._

## Decisions (ADRs)

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[decisions/README\|ADR Format & Index]] | active | high | meta, process |

_No ADRs yet. ADR-001 (slice 1 scope) and ADR-004 (storage) are the two most imminent — both pending Eli's review of slice 1 spec._

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

_Empty until an ADR activates it. Note: the existence of an `Org` entity in slice 1 may make this folder less necessary than originally planned. Revisit once slice 1 implementation begins._

---

## Recent activity

- **2026-04-22 (evening rewrites)** — Late-evening clarification: reports are org+time-period scoped. Data model expanded from target-centric to three-layer (Org → Target → Finding) with a separate Report entity. Vision, scope, slices, users-and-jobs, slice-1 spec, competitive scaffold, and open-questions all updated. See [[sessions/2026-04-22-slice-1-kickoff|session notes]].
- **2026-04-22 (afternoon)** — First working session. CSAK reframed from "downstream triager" to "orchestrator and triager." Slice plan adopted. Five starter tools chosen: Nuclei, Nessus Essentials, Zeek, osquery, Subfinder+httpx.
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
