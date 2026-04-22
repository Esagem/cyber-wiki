---
title: "Open Questions"
category: synthesis
tags: [questions, unknowns, pre-design]
status: active
confidence: medium
owner: shared
created: 2026-04-21
updated: 2026-04-21
---

# Open Questions

> Every known unknown about CSAK, with an owner and a status. This page drives pre-design conversation — if it's growing, we're discovering; if it's shrinking, we're converging.

Questions are grouped by the wiki category they most affect. An `ADR:` link means a decision record is pending or in flight to resolve the question.

## Columns

- **Q** — the question.
- **Owner** — who's driving an answer. `shared` means both of us.
- **Status** — `open`, `in-progress`, `answered`, `dropped`.
- **Notes** — short context, or a pointer to the page/ADR that's carrying the discussion.

---

## Product

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Who is the primary user of v0 — pentester, blue-teamer, consultant, or security-lead? | shared | open | Drives almost everything downstream. Likely ADR-002. |
| Breadth (many shallow ingestors) vs. depth (few excellent ones) for v0? | shared | open | Tied to scope. Likely ADR-001. |
| Is CSAK sold, open-sourced, or kept internal to Surge Studios? | shared | open | Affects architecture and legal posture. |
| Does "fix-it ticket" mean one canonical format, or a family of per-client-customizable formats? | shared | open | Affects report engine complexity. |
| What's the v0 story for non-vulnerability findings (config drift, policy violations, anomalies)? | shared | open | Currently vuln-centric framing. |

## Architecture

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Monolith, modular monolith, or plugin host? | shared | open | ADR-003 candidate. |
| Local-first (laptop/CLI), service-first (self-hosted), or both? | shared | open | ADR-005 candidate. |
| Storage: sqlite, postgres, flat markdown, object store? | shared | open | ADR-004 candidate. |
| Where does the LLM live in the stack — optional enhancer, core dependency, or configurable per-step? | shared | open | Answer affects offline usability. |
| Do we build on top of an existing framework (DefectDojo, Faraday, Nuclei) or greenfield? | shared | open | Competitive analysis needed first. |

## Ingestion

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Plugin protocol — stdout JSON, Python entry point, WASM, HTTP microservice? | shared | open | ADR-006 candidate. |
| How does a user add a novel ingestor — write code, fill a YAML config, or describe it to the LLM? | shared | open | Huge UX implication. |
| Do we normalize all sources into one internal schema, or keep source-native representations and translate on demand? | shared | open | |
| Are we responsible for the scan, or only for consuming scan output? | shared | open | The former is a much bigger product. |

## Triage

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Severity model — use CVSS as-is, extend it, or invent our own? | shared | open | ADR-007 candidate. |
| Is "importance" (from the original framing) the same as severity, or severity × confidence × business-context? | shared | open | Needs glossary clarification. |
| Who is responsible for suppressing false positives — CSAK, the analyst, or both? | shared | open | UX-critical. |
| Do we support per-asset or per-client risk weighting? | shared | open | |
| Where do previously-seen findings get remembered — in CSAK's storage, in the engagement, or not at all? | shared | open | Affects dedup. |

## Reporting

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Template language for reports — Jinja, mustache, markdown-with-frontmatter, or something structured? | shared | open | ADR-008 candidate. |
| Are fix-it tickets individual files, rows in a tracker, or both? | shared | open | |
| Do we emit HTML/PDF, or only markdown? | shared | open | |
| Is there an "audit" or "attestation" report format beyond review + ticket? | shared | open | |

## Process / non-technical

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Cadence for collaborative working sessions? | shared | open | |
| Who writes / owns the first ADR? | shared | open | |
| When do we leave pre-design and commit to building? Trigger condition? | shared | open | Worth defining explicitly. |

---

## Answered / dropped questions

_Empty. When a question resolves, move its row here with a link to the ADR or page that answered it._

---

## Related

- [[CYBER|CYBER.md §5.3 — Logging a working session]]
- [[decisions/README|ADR Index]]
- [[product/scope|Scope]]
