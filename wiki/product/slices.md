---
title: "CSAK — Slice Plan"
category: product
tags: [slices, roadmap, scope, planning]
status: draft
confidence: medium
owner: shared
created: 2026-04-22
updated: 2026-04-22
---

# Slice Plan

> How we're shipping CSAK. Each slice is independently useful. We don't skip ahead.

This page is deliberately short. Details for each slice live in `specs/slice-N.md`.

## Slice 1 — Ingest & Report

**What CSAK does:** accepts pre-collected data (scanner output, logs, OSINT dumps), plus optional target metadata. Normalizes findings, triages them, emits reports.

**What CSAK does NOT do in slice 1:** pick tools, run tools, recurse.

**Why first:** processing and reporting is the harder, more defensible part of the product. Tool orchestration is mechanically complex but not conceptually novel; plenty of tools (reconFTW, AttackForge) already do orchestration reasonably. Cross-tool synthesis done well is rarer and higher-leverage. Get the hard part right first.

**Concrete inputs supported:** output from the 5 starter tools (Nuclei, Nessus Essentials, Zeek, osquery, Subfinder+httpx). One per format. User brings the files.

**Concrete outputs:** one internal review per target (markdown, technical), one fix-it ticket bundle per target (markdown, per-finding or grouped).

**Exit criteria for slice 1 → 2:**
- Reports for each of the 5 tool formats are good enough to hand to a real analyst without embarrassment.
- Triage scoring is reproducible (same input → same findings → same scores).
- The target-centric data model survives contact with at least one multi-source run (e.g. Nessus + Zeek for the same org in one report).

Full spec: [[specs/slice-1|Slice 1 Spec]].

## Slice 2 — Tool Orchestration

**What's added:** CSAK runs tools itself. Given a target, CSAK knows which tools apply and invokes them with the right parameters, then hands output to the slice-1 pipeline.

**What's NOT added:** recursion. CSAK runs the tools it's told to run (or picks from heuristics), and that's it for one invocation.

**Open design questions for slice 2** — to be settled before the slice starts:

- Tool selection: heuristic rules, user config, LLM-assisted, or all three?
- Execution model: subprocess, container, remote API, or mixed?
- Parameter inference: how does CSAK know what to feed a tool given a target?
- Long-running tools: how are slow scans handled without blocking the report flow?

## Slice 3 — Recursion & Catalog Expansion

**What's added:**

- **Recursion.** Tool output can trigger further tool runs. Example: subfinder finds 40 subdomains → httpx confirms which are live → nuclei scans the live ones. Budgets (time, depth, cost) are first-class.
- **Tool catalog growth.** The 5 starter tools expand to a configurable set. Adding a new tool is a user-facing operation, not a code change.

**Deliberately not specced in detail yet.** Most of slice 3's design will only make sense once slice 2 has taught us what real orchestration patterns look like.

## Slices 4+

Undefined. We'll know what's next after slice 1 hits reality.

Candidates we're not committing to:

- Scheduled/continuous monitoring (vs. one-shot reports).
- Integration with ticketing systems (Jira, ServiceNow).
- Multi-tenant workspaces.
- Web UI beyond whatever minimal thing slice 1 needs.
- LLM-driven target intake ("investigate acmecorp" → figure out what that means).

## Related

- [[product/vision|Vision]]
- [[specs/slice-1|Slice 1 Spec]]
- [[synthesis/roadmap|Roadmap]] (the design-phase roadmap; this slice plan is the build-phase roadmap)
