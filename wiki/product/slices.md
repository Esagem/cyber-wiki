---
title: "CSAK — Slice Plan"
category: product
tags: [slices, roadmap, scope, planning]
status: draft
confidence: medium
owner: shared
created: 2026-04-22
updated: 2026-04-25
---

# Slice Plan

> How we're shipping CSAK. Each slice is independently useful. We don't skip ahead.

This page is deliberately short. Details for each slice live in `specs/slice-N.md`.

## Slice 1 — Ingest & Report

**What CSAK does:** accepts pre-collected data (scanner output from 5 starter tools), normalizes findings, scores them deterministically at ingest, and emits reports on demand scoped to (org, time window).

**What CSAK does NOT do in slice 1:** pick tools, run tools, recurse, schedule, or use any LLM.

**Why first:** processing and reporting is the harder, more defensible part of the product. Tool orchestration is mechanically complex but not conceptually novel; plenty of tools (reconFTW, AttackForge) already do orchestration reasonably. Cross-tool synthesis done well is rarer and higher-leverage. Get the hard part right first.

**Concrete inputs supported:** output from the 5 starter tools — Nuclei (JSON), Nessus Essentials (XML), Zeek (logs, folder-aware), osquery (JSON), Subfinder + httpx (JSON). User brings the files.

**Concrete outputs:** reports scoped to (org, time window), in two kinds:
- **Internal Review** — technical, analyst-team-facing.
- **Fix-it Ticket Bundle** — plain-language, client-facing, packaged as a directory and a zip.

Each kind exports to **markdown, docx, and JSON**. JSON is a first-class format designed as the clean interface for a future LLM layer.

**Status: shipped 2026-04-24.** 83 tests passing, end-to-end verified.

**Exit criteria for slice 1 → 2:** see [[specs/slice-1|slice 1 spec §Exit criteria]] for the full list. Summary: all 5 formats ingest cleanly, mixed-tool reports are coherent, dedup works across runs, scan lineage is queryable, markdown and docx output match in content and section order, Eli uses it on real work without hating it.

Full spec: [[specs/slice-1|Slice 1 Spec]].

## Slice 2 — Tool Orchestration

**What CSAK does:** runs Subfinder + httpx + Nuclei against a target. CSAK auto-detects the target type (`domain | subdomain | ip | cidr | url`) and routes to the appropriate subset of tools — a domain triggers the full pipeline; an IP skips Subfinder; a URL goes straight to Nuclei. Each stage produces an Artifact that flows through the slice 1 ingest pipeline, so collect-produced Findings are indistinguishable from analyst-uploaded Findings. Three modes (`quick | standard | deep`) control intensity within each running tool.

**What CSAK does NOT do in slice 2:** orchestrate Zeek or osquery (deployment-shaped, stay ingest-only); orchestrate Nessus (deferred to slice 2.5+ via REST API); recurse on tool output (slice 3); run async/background scans (slice 3 if needed); skip stages on a quick rescan (later slice if ever); use any LLM (deterministic only); ship a configuration-by-knob explosion (three modes plus per-tool overrides — not 300 booleans).

**Why this scope:** orchestrate the active on-demand tools that earn their keep from a CLI. Zeek and osquery are continuous-monitoring tools that don't fit a "run me now" model. The reconFTW case study (see [[competitive/reconftw|reconFTW]]) showed that the real value of orchestrators is the recipes (specific tool flag combinations), not the orchestration logic — slice 2 adapts those recipes with attribution and ships its own simple, typed orchestrator.

**Concrete additions:** two new commands (`csak collect`, `csak doctor`); a `csak/collect/` Python module with target-type detection, tool routing, subprocess runner with adaptive rate limiting, and per-tool catalog modules; live structured terminal output (per-stage progress bars, ETAs, rate-limit adjustment events, final summary).

**Exit criteria:** see [[specs/slice-2|slice 2 spec §Exit criteria]]. Summary: full pipeline runs against a real target; target type auto-detection routes correctly; modes behave per spec; adaptive rate limiting kicks in on real 429s; stage timeouts and Ctrl-C are graceful; `csak doctor` correctly identifies and offers to install missing binaries; Eli uses `csak collect` on a real client target without hating it.

Full spec: [[specs/slice-2|Slice 2 Spec]].

## Slice 3 — Recursion & Catalog Expansion

**What CSAK does:** opt-in recursion on `csak collect` via `--recurse`. Each tool's output is scanned for typed values (subdomains, live hosts, URLs, etc.) that another registered tool accepts as input; those become inputs for the next depth. The recursion frontier is structurally deduplicated within a single invocation — a `(tool, target, mode)` tuple already run is never queued again — so termination happens by exhaustion. `--max-depth N` (default 3, 0 = infinite, 1 = no recursion) is the analyst's emergency brake; when the depth limit is reached and the frontier is non-empty, CSAK prompts to continue. Slice 3 also makes the tool catalog pluggable: any `*.py` file dropped in `~/.csak/tools/` is loaded into the same toolbox as built-ins, can register its own target types, and participates in routing identically. `csak tools list` / `csak tools show <tool>` introspect the catalog including the live recursion graph.

**What CSAK does NOT do in slice 3:** use any LLM (deterministic only); add wall-clock / cost / token budgets (depth + structural dedup is the termination story); ship async / background `csak collect` (sync-only, live status compensates); add new built-in tools (catalog stays at subfinder + httpx + nuclei, now recursion-aware); sandbox plugins (full Python under analyst's permissions; sandboxing deferred); persist recursion state across invocations (every `csak collect` is fresh); ship a recursion-rules YAML (the graph comes from `accepts`/`produces` declarations); recurse Zeek or osquery (stay ingest-only).

**Why this scope:** recursion is the slice that turns CSAK from "runs the tools you tell it to" into "runs the tools that fit, in the order they fit, until there's nothing left to do." The deterministic type-matching shape generalizes naturally as the catalog grows, and the plugin surface is the user-facing answer to "how do I add a new tool" without reaching for LLMs or a config-file explosion.

**Concrete additions:** new `--recurse` and `--max-depth N` flags on `csak collect`; new `csak tools list` and `csak tools show` commands; extended `Tool` interface with `accepts`, `produces`, and `extract_outputs`; runtime type registry with `classify()` as dispatcher; plugin discovery from `~/.csak/tools/`; `csak doctor` extension for plugin and registry validation; depth-aware live output with frontier counts and prompt-to-continue; data model adds `Scan.parent_scan_id`, `Scan.depth`, `Scan.triggered_by_finding_id`.

**Exit criteria:** see [[specs/slice-3|slice 3 spec §Exit criteria]]. Summary: recursion runs end-to-end against a real target; structural dedup prevents redundant scans verifiably; type registry handles built-ins and at least one example plugin; `csak tools list/show` produce documented output; data model migration runs cleanly; live output is depth-aware; Eli uses `csak collect --recurse` on a real client target without hating it.

Full spec: [[specs/slice-3|Slice 3 Spec]].

## LLM layer (future, not yet numbered)

A later slice adds LLM features that wrap slice 1's deterministic outputs. The JSON export format committed in slice 1 is the interface. Candidate applications:

- Drafting fix-it ticket plain-language impact sections.
- Internal review confidence caveats.
- Narrative ticket grouping beyond the dedup-key rule.
- Period summaries.

The LLM layer attaches over the deterministic core; it does not replace it. Whether and when this slice ships is a later decision.

## Slices 4+

Undefined. We'll know what's next after slice 1 hits reality.

Candidates we're not committing to:

- **Scheduled / automated report generation** — likely the first slice 4 feature.
- Integration with ticketing systems (Jira, ServiceNow).
- Multi-tenant workspaces.
- Web UI beyond whatever minimal thing slice 1 needs.
- LLM-driven target intake ("investigate acmecorp" → figure out what that means).

## Related

- [[product/vision|Vision]]
- [[specs/slice-1|Slice 1 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[specs/slice-3|Slice 3 Spec]]
- [[synthesis/roadmap|Roadmap]] (the design-phase roadmap; this slice plan is the build-phase roadmap)
- [[synthesis/deferred-features|Deferred Features]]
