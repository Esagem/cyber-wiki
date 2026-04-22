---
title: "Open Questions"
category: synthesis
tags: [questions, unknowns, pre-design]
status: active
confidence: medium
owner: shared
created: 2026-04-21
updated: 2026-04-22
---

# Open Questions

> Every known unknown about CSAK, with an owner and a status. Updated after the 2026-04-22 slice 1 kickoff session.

Questions are grouped by what they affect. An `ADR:` link means a decision record is pending or in flight to resolve the question.

## Columns

- **Q** — the question.
- **Owner** — who's driving an answer. `shared` means both contributors.
- **Status** — `open`, `in-progress`, `answered`, `dropped`.
- **Notes** — short context, or a pointer to the page/ADR that's carrying the discussion.

---

## Slice 1 — Data model

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| When does a discovered subdomain become its own child Target vs. an identifier on an existing Target? | shared | open | Three options laid out in [[specs/slice-1\|slice-1 spec]]. Leaning hybrid. |
| Are parent-company-and-subsidiaries one Org or multiple Orgs? | shared | open | Probably one Org with parent/child Targets. Revisit if pain emerges. |
| How do Findings spanning multiple Targets get represented? | shared | open | Leaning one Finding per (target, dedup-key). |
| Should Finding deletion be soft only, hard only, or configurable? | shared | open | Leaning soft only with separate Artifact preservation. |
| Can a Finding appear in multiple Reports for the same Org? | shared | open | Yes — overlapping report periods are intentional. |

## Slice 1 — Triage

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Auto re-triage when scoring rules change, or explicit only? | shared | open | Leaning explicit only — auto breaks reproducibility. |
| Separate `probability_real` field for "probably FP"? | shared | open | Proposed in slice 1 spec. |
| 5-point severity scale + `null`, or 6-point with explicit "unknown"? | shared | open | Leaning 5 + `null`. |
| How do tool-specific severity translation tables get versioned and surfaced in reports? | shared | open | Slice 1 spec says "explicit and versioned"; mechanism TBD. |

## Slice 1 — Reports

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Template language: Jinja2, Mustache, or pure markdown substitution? | shared | open | Leaning Jinja2. ADR-008 candidate. |
| Are fix-it tickets always one-finding-per-ticket, or grouped? | shared | open | Default per-finding; grouping later if it earns it. |
| Do we emit HTML/PDF in slice 1, or only markdown? | shared | open | Leaning markdown only. PDF/HTML can come later via separate rendering. |
| Period summary section ("what changed since March") — LLM-drafted or template-driven? | shared | open | Worth prototyping LLM here. |

## Slice 1 — Interface and storage

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Storage: SQLite + flat-file artifacts (current default), Postgres, or pure flat files? | shared | open | ADR-004 candidate. SQLite leaning is documented in [[specs/slice-1\|slice 1 spec]]. |
| CLI command shape — is the sketched command structure right? | eli | open | Sketch in slice 1 spec; needs Eli's review. |
| Where do report outputs land on disk? | shared | open | Default proposed: `reports/<org-slug>/<period>/...` |

## Slice 1 — LLM applications

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Drafting fix-it ticket "impact in plain language" — LLM yes/no? | shared | open | Leaning yes; prototype during slice 1. |
| Grouping findings into ticket bundles — LLM yes/no? | shared | open | Worth trying. |
| Period summary — LLM yes/no? | shared | open | Worth trying with structured input. |
| Token budget — what's "efficient"? Hard cap per report, or soft target? | shared | open | Eli flagged efficiency as a design constraint; needs concrete number. |

## Slice 2 (preview)

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Tool selection — heuristic, config-driven, LLM-assisted, or all three? | shared | deferred | Slice 2 design. |
| Execution model — subprocess, container, mixed? | shared | deferred | Slice 2 design. |
| Parameter inference — how does CSAK know what to feed a tool given a target? | shared | deferred | Slice 2 design. |
| Long-running tools — how are slow scans handled without blocking the report flow? | shared | deferred | Slice 2 design. |

## Slice 3 (preview)

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Recursion budget shape — time / depth / cost / token / all? | shared | deferred | Slice 3 design. |
| How does adding a new tool work as a user-facing operation? | shared | deferred | Slice 3 design. |

## Cross-cutting product questions

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Is CSAK kept internal, open-sourced, or sold? | shared | open | Eli's posture: don't let this drive design. |
| How does the analyst's client-org relationship vary across clients (paid scans, log access, etc.)? | shared | open | Affects what a "complete" ingest looks like per org. |
| Is "the analyst" really one persona, or are there meaningfully different sub-personas (consultant vs. blue-team-lead vs. researcher)? | shared | open | Slice 1 treats them as one. [[product/users-and-jobs\|users-and-jobs]] sketches the persona. |
| Do we need a "team-of-few" mode in slice 1, or strictly single-user? | shared | open | Default: strict single-user. |

## Process / non-technical

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Cadence for collaborative working sessions? | shared | open | First session held 2026-04-22; cadence TBD. |
| When do we leave pre-design and start implementation? Trigger condition? | shared | open | Proposed: when ADR-001 (slice 1 scope) and ADR-004 (storage) are accepted, plus slice 1 spec is `active` (not `draft`). |

---

## Answered / dropped questions

These were answered during the 2026-04-22 session. Moved here for history.

| Q | Resolved by | Outcome |
|---|-------------|---------|
| Who is the primary user of v0 — pentester, blue-teamer, consultant, security-lead? | 2026-04-22 session | Answer: a McCrary-style analyst doing mixed offensive and defensive work for a handful of client orgs. Documented in [[product/users-and-jobs\|users-and-jobs]]. |
| Breadth (many shallow ingestors) vs. depth (few excellent ones)? | 2026-04-22 session | Depth at slice 1 (5 tools, done excellently). Breadth comes in slice 3. |
| What's the v0 scope — how much of "ingest → triage → report" do we build before shipping anything? | 2026-04-22 session | All of "ingest → triage → report" in slice 1. Tool execution moves to slice 2; recursion to slice 3. |
| Plugin protocol — stdout JSON, Python entry point, WASM, HTTP microservice? | 2026-04-22 session | Deferred to slice 2 — irrelevant in slice 1 (no tool execution). |
| Are we responsible for the scan, or only for consuming scan output? | 2026-04-22 session | Slice 1: only consuming. Slice 2: also responsible. |
| Is "importance" the same as severity? | 2026-04-22 session | No. Severity, confidence, and target weight are independent. Priority is derived: `severity × confidence × target weight`. Documented in [[specs/slice-1\|slice 1 spec]]. |
| Where do previously-seen findings get remembered? | 2026-04-22 session | In CSAK's own storage, scoped to the Org. Drives both dedup and cross-period continuity. |
| Where does the LLM live — optional enhancer, core dependency, configurable per-step? | 2026-04-22 session | Optional enhancer, evaluated case-by-case per feature. Core is deterministic. |
| Local-first or service-first? | 2026-04-22 session | Local-first (CLI on the analyst's machine) for slices 1 and 2. Service mode is undefined and not on any planned slice. |

---

## Related

- [[CYBER\|CYBER.md §5.3 — Logging a working session]]
- [[decisions/README\|ADR Index]]
- [[specs/slice-1\|Slice 1 Spec]]
- [[product/users-and-jobs\|Users & Jobs]]
- [[sessions/2026-04-22-slice-1-kickoff\|2026-04-22 Session Notes]]
