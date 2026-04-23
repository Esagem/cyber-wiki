---
title: "CSAK — Slice Plan"
category: product
tags: [slices, roadmap, scope, planning]
status: draft
confidence: medium
owner: shared
created: 2026-04-22
updated: 2026-04-23
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

**Exit criteria for slice 1 → 2:** see [[specs/slice-1|slice 1 spec §Exit criteria]] for the full list. Summary: all 5 formats ingest cleanly, mixed-tool reports are coherent, dedup works across runs, scan lineage is queryable, markdown and docx output match in content and section order, Eli uses it on real work without hating it.

Full spec: [[specs/slice-1|Slice 1 Spec]].

## Slice 2 — Tool Orchestration

**What's added:** CSAK runs tools itself. Given a target, CSAK knows which tools apply and invokes them with the right parameters, then hands output to the slice-1 pipeline.

**What's NOT added:** recursion. CSAK runs the tools it's told to run (or picks from heuristics), and that's it for one invocation.

**Open design questions for slice 2** — to be settled before the slice starts:

- Tool selection: heuristic rules, user config, LLM-assisted, or all three?
- Execution model: subprocess, container, remote API, or mixed?
- Parameter inference: how does CSAK know what to feed a tool given a target?
- Long-running tools: how are slow scans handled without blocking the report flow?
- Adaptive rate limiting (backoff on 429/503) — slice 2 requirement.
- Relationship to reconFTW (replace, augment, or integrate). See [[competitive/reconftw|reconFTW analysis]].
- Whether generic-CSV ingest and reconFTW JSON ingest land in slice 2.

## Slice 3 — Recursion & Catalog Expansion

**What's added:**

- **Recursion.** Tool output can trigger further tool runs. Example: subfinder finds 40 subdomains → httpx confirms which are live → nuclei scans the live ones. Budgets (time, depth, cost) are first-class.
- **Tool catalog growth.** The 5 starter tools expand to a configurable set. Adding a new tool is a user-facing operation, not a code change.

**Deliberately not specced in detail yet.** Most of slice 3's design will only make sense once slice 2 has taught us what real orchestration patterns look like.

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
- [[synthesis/roadmap|Roadmap]] (the design-phase roadmap; this slice plan is the build-phase roadmap)
