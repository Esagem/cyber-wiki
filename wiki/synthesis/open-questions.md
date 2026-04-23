---
title: "Open Questions"
category: synthesis
tags: [questions, unknowns, pre-design]
status: active
confidence: medium
owner: shared
created: 2026-04-21
updated: 2026-04-23
---

# Open Questions

> Every known unknown about CSAK, with an owner and a status. Updated after each working session and each piece of competitive research.

Questions are grouped by what they affect. When a question gets resolved, move it to the Answered section at the bottom and note which spec section carries the resolution.

## Columns

- **Q** — the question.
- **Owner** — who's driving an answer. `shared` means both contributors.
- **Status** — `open`, `in-progress`, `answered`, `dropped`.
- **Notes** — short context, or a pointer to the spec section that's carrying the discussion.

---

## Slice 1 — status

Closed. Every design question identified for slice 1 has been resolved in the [[specs/slice-1|slice 1 spec]] and the resolutions are recorded in the Answered section below. The spec remains `draft` pending Eli's final review; then `active`.

## Slice 2 (preview)

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Replace reconFTW, augment it, or integrate with it? | shared | open | Big scope-shaping question. If we integrate, slice 2 is much smaller; if we replace, much larger. See [[competitive/reconftw\|reconFTW analysis]]. |
| Tool selection — heuristic, config-driven, LLM-assisted, or all three? | shared | deferred | Slice 2 design. |
| Execution model — subprocess, container, mixed? | shared | deferred | Slice 2 design. |
| Parameter inference — how does CSAK know what to feed a tool given a target? | shared | deferred | Slice 2 design. |
| Long-running tools — how are slow scans handled without blocking the report flow? | shared | deferred | Slice 2 design. |
| Adaptive rate limiting (backoff on 429/503) — slice 2 requirement? | shared | open | reconFTW treats this as first-class; we should too. |
| Generic-CSV escape-hatch ingest — slice 2 or later? | shared | open | Deferred out of slice 1. The ingest architecture is parser-plugin-shaped so this adds without core surgery. |
| reconFTW `report/report.json` ingest — slice 2 or later? | shared | open | Same as CSV. |

## Slice 3 (preview)

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Recursion budget shape — time / depth / cost / token / all? | shared | deferred | Slice 3 design. |
| How does adding a new tool work as a user-facing operation? | shared | deferred | Slice 3 design. |
| Quick-rescan pattern — skip heavy stages when no new assets? | shared | open | reconFTW does this; smart pattern. |

## Slice 4+ (preview)

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Scheduled / automated report generation — what triggers, what windows? | shared | deferred | Slice 4+. |
| Period summaries that diff one report against another — ever a feature? | shared | deferred | Slice 4+ if at all; requires persistent state about past reports that slice 1 deliberately does not carry. |

## LLM layer (later slice, not yet numbered)

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Which deterministic outputs from slice 1 benefit most from an LLM rewrite? | shared | open | Candidates surfaced during slice 1 design: fix-it ticket impact sections, internal review confidence caveats, finding grouping, period summaries. Evaluate once slice 1 is producing real output. |
| Local LLM (Ollama-style) or hosted API as the default? | shared | open | Token economics and privacy posture both affect this. |
| How does the LLM layer attach — separate CLI command, flag on `csak report generate`, or external tool that consumes CSAK's JSON export? | shared | open | The JSON export is the interface regardless; the question is how it's invoked. |
| Token budget shape — hard cap per report, soft target, or unbounded? | shared | open | Relevant once LLM use is actually happening. |

## Cross-cutting product questions

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Is CSAK kept internal, open-sourced, or sold? | shared | open | Eli's posture: don't let this drive design. |
| How does the analyst's client-org relationship vary across clients (paid scans, log access, etc.)? | shared | open | Affects what a "complete" ingest looks like per org. |
| Is "the analyst" really one persona, or are there meaningfully different sub-personas (consultant vs. blue-team-lead vs. researcher)? | shared | open | Slice 1 treats them as one. [[product/users-and-jobs\|users-and-jobs]] sketches the persona. |
| Do we need a "team-of-few" mode in slice 1, or strictly single-user? | shared | open | Default: strict single-user. |
| Positioning vs. DefectDojo — "analyst CLI" complement or direct competitor? | shared | open | DefectDojo is too strong to ignore. See [[competitive/defectdojo\|DefectDojo analysis]]. |

## Process / non-technical

| Q | Owner | Status | Notes |
|---|-------|--------|-------|
| Cadence for collaborative working sessions? | shared | open | First session held 2026-04-22; cadence TBD. |
| When do we leave pre-design and start implementation? Trigger condition? | shared | open | Proposed: slice 1 spec moves `draft` → `active` after Eli's sign-off review. |

---

## Answered / dropped questions

### Slice 1 (closed)

All resolutions land in the [[specs/slice-1|slice 1 spec]]. Dates are when the resolution was recorded in the spec.

| Q | Resolved | Outcome |
|---|----------|---------|
| Who is the primary user of v0? | 2026-04-22 | A McCrary-style analyst doing mixed offensive and defensive work for a handful of client orgs. [[product/users-and-jobs\|users-and-jobs]]. |
| Breadth (many shallow ingestors) vs. depth (few excellent ones)? | 2026-04-22 | Depth. 5 tools, done excellently. Breadth comes in slice 3. |
| What's the v0 scope — how much of "ingest → triage → report" do we build before shipping anything? | 2026-04-22 | All of "ingest → triage → report" in slice 1. Tool execution moves to slice 2; recursion to slice 3. |
| Plugin protocol — stdout JSON, Python entry point, WASM, HTTP microservice? | 2026-04-22 | Deferred to slice 2. Irrelevant in slice 1. |
| Are we responsible for the scan, or only for consuming scan output? | 2026-04-22 | Slice 1: only consuming. Slice 2: also responsible. |
| Is "importance" the same as severity? | 2026-04-22 | No. Severity, confidence, target weight, and probability_real are independent. Priority is derived. |
| Where do previously-seen findings get remembered? | 2026-04-22 | In CSAK's own storage, scoped to the Org. |
| Where does the LLM live — optional enhancer, core dependency, configurable per-step? | 2026-04-23 | **Not in slice 1 at all.** Slice 1 is deterministic end-to-end. A later slice can layer LLM features over slice 1's structured outputs (specifically the JSON export), which is why slice 1 commits to a clean, stable JSON export shape. |
| Local-first or service-first? | 2026-04-22 | Local-first (CLI on the analyst's machine) for slices 1 and 2. |
| Real-time vs. periodic invocation? | 2026-04-23 | On-demand / real-time is the primary mode. Scheduled/automated is slice 4+. Streaming is indefinitely out of scope. |
| Template language for reports? | 2026-04-23 | Jinja2 for markdown. [[specs/slice-1\|slice 1 spec §Renderer implementation notes]]. |
| Storage backend? | 2026-04-23 | SQLite + flat-file artifacts. [[specs/slice-1\|slice 1 spec §Storage]]. |
| Target nesting rules? | 2026-04-23 | Hybrid. Promoted to child Target when a Finding attaches or when the analyst assigns a distinct `target_weight`. [[specs/slice-1\|slice 1 spec §Target nesting]]. |
| Parent company + subsidiaries — one Org or many? | 2026-04-23 | One Org. Subsidiaries are top-level Targets under that Org. [[specs/slice-1\|slice 1 spec §Org boundaries]]. |
| Findings spanning multiple Targets — one shared Finding or one per Target? | 2026-04-23 | One per (Target, dedup-key). [[specs/slice-1\|slice 1 spec §Multi-Target findings]]. |
| Soft vs. hard delete for Targets and Orgs? | 2026-04-23 | Soft delete everywhere except Artifacts. [[specs/slice-1\|slice 1 spec §Why this shape]]. |
| Fourth data-model layer (Scan/Run/Test)? | 2026-04-23 | Yes — Scan entity between Artifact and Finding, with FindingScanOccurrence junction. Timestamps best-effort per tool; `timestamp_source` labels fallbacks. [[specs/slice-1\|slice 1 spec §Data model]]. |
| `false-positive` as a Finding status distinct from `suppressed`? | 2026-04-23 | Yes. |
| Report entity — database row or stateless export? | 2026-04-23 | Stateless export. No Report entity. Each `csak report generate` is a pipeline from query to file; the directory of timestamped files is the history. [[specs/slice-1\|slice 1 spec §Reports]]. |
| Export formats? | 2026-04-23 | Markdown, docx, and JSON. JSON is first-class (for future LLM and automation consumers), not a debug option. Other formats deferred. [[specs/slice-1\|slice 1 spec §Export formats]]. |
| Docx rendering — pandoc or python-docx? | 2026-04-23 | python-docx. Toolchain stays Python-only. [[specs/slice-1\|slice 1 spec §Renderer implementation notes]]. |
| File overwriting behavior for repeat report generation? | 2026-04-23 | No overwriting. Timestamp-prefixed filenames; invocations accumulate. [[specs/slice-1\|slice 1 spec §Output layout]]. |
| `probability_real` as a separate analyst-assigned axis? | 2026-04-23 | Yes. Float 0.0–1.0, default 1.0. Fourth factor in priority. [[specs/slice-1\|slice 1 spec §Scoring]]. |
| Auto-retriage when scoring rules change? | 2026-04-23 | No retriage in slice 1 at all. Scores are write-once at ingest. To get fresh scores after editing tables, analyst re-ingests the source artifact; comparison is manual. [[specs/slice-1\|slice 1 spec §Scoring]]. |
| 5-point severity scale + null, or 6-point with explicit unknown? | 2026-04-23 | 5-point + null. |
| How do scoring tables get versioned and surfaced in reports? | 2026-04-23 | Per-tool YAML files under `config/triage/severity/`. The specific versioning mechanism (manifest rollup vs. per-tool version on Finding) is an implementation detail settled during build; scoring is write-once at ingest so version-drift doesn't affect stored scores. |
| Remediation templates keyed on CWE/CVE — slice 1 or later? | 2026-04-23 | Slice 1, adapted from DefectDojo with attribution (per build-vs-adapt analysis). Covers 10–15 high-frequency CWEs from the 5 starter tools. |
| Fix-it tickets — always per-finding or grouped? | 2026-04-23 | Per-finding by default; multi-Target findings sharing a dedup-key collapse into one ticket. No analyst-initiated grouping in slice 1. |
| HTML/PDF in slice 1? | 2026-04-23 | No. Markdown + docx + JSON only. Other formats deferred; architecture supports adding them. |
| Period summary ("what changed since March")? | 2026-04-23 | Not in slice 1. Reports are per-window snapshots, unaware of other reports. Cross-report comparison is slice 4+ if ever — requires persistent state about past reports that slice 1 deliberately does not carry. |
| LLM use inside CSAK for slice 1? | 2026-04-23 | None. Slice 1 is deterministic end-to-end. LLM features attach in a later slice, consuming slice 1's JSON export. |
| Folder-of-logs for Zeek ingest? | 2026-04-23 | Yes. Directory or single-file paths both accepted. [[specs/slice-1\|slice 1 spec §Folder-aware Zeek ingest]]. |

---

## Related

- [[CYBER\|CYBER.md §5.2 — Logging a working session]]
- [[specs/slice-1\|Slice 1 Spec]]
- [[product/users-and-jobs\|Users & Jobs]]
- [[competitive/defectdojo\|DefectDojo]]
- [[competitive/reconftw\|reconFTW]]
- [[sessions/2026-04-22-slice-1-kickoff\|2026-04-22 Session Notes]]
