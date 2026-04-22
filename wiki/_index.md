---
title: "CSAK Design Wiki — Master Index"
category: synthesis
tags: [index, master, navigation]
status: active
confidence: high
created: 2026-04-21
updated: 2026-04-21
---

# CSAK Design Wiki — Master Index

## What this is

The collaborative design space for building the **Cybersecurity Swiss Army Knife (CSAK)** — a tool that will ingest data from a customizable range of security tools, triage what matters, and emit consistent deliverables.

**Phase: pre-design.** Most pages are `seed` or `planned`. See [[CYBER|CYBER.md]] for the operating schema.

---

## Product

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| [[product/vision\|Vision]] | seed | low | what, who, why |
| [[product/scope\|Scope]] | seed | low | in-scope, out-of-scope |
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

_First real ADR pending. The two obvious early ADRs are: (1) scope boundaries for v0, (2) architecture shape (monolith / modular / plugin)._

## Sessions

| Page | Status | Confidence | Tags |
|------|--------|------------|------|
| _None yet. One page per collaborative working session._ | | | |

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
