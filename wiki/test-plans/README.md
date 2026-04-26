---
title: "Test Plans"
category: test-plans
tags: [testing, plans, validation, test-targets]
status: active
confidence: high
owner: shared
created: 2026-04-26
updated: 2026-04-26
---

# Test Plans

Testing plans for CSAK. The prose-side complement to code-side `tests/` and the demo scaffolding under `scripts/`.

## Scope

This folder holds testing plans — the design notes, target descriptions, fixture rationales, and verification checklists that explain *what* a testing scenario is supposed to exercise and *why* the fixtures look the way they do. The code-side `tests/` directory in the CSAK repo is where the executable assertions live; this folder is where the human-readable plan lives.

The wiki will not be used to store real engagement data. CSAK's `Org` entity (slice 1) is the system of record for engagement-shaped data; testing plans here are about the *product*, not about *uses* of the product.

## What belongs here

A testing plan for a slice or a feature, with at minimum:

- **Goal.** What is this testing plan exercising? Which exit criteria from which spec does it map to?
- **Setup.** What fixtures or test targets are needed? Where do they live in the codebase?
- **Procedure.** Step-by-step what the plan looks like end to end — both the automated path (point at the test runner) and the live demo path (orchestrator scripts, manual verification points).
- **Expected observations.** What outputs, log lines, scan rows, dedup counts, etc. count as the plan succeeding.
- **Known limits.** What the plan doesn't exercise. The deliberate boundary of the scenario.

A testing plan should be readable by someone who has never run CSAK and gives them enough context to (a) understand why the test exists, (b) run it themselves, and (c) interpret the output.

## What does not belong here

- Real engagement data, real client targets, real findings from real work. CSAK's database holds engagement-shaped data; this folder is about exercising CSAK itself.
- Code-side test files. Those live under `tests/` in the CSAK repo.
- One-off test scripts. Those live under `scripts/` in the CSAK repo with their own short README if needed.
- Test results / output. Test plans describe *what to run and what to look for*; outputs of specific runs go in session notes if they're worth preserving.

## Current testing plans

| Plan | Status | Covers | Source artifacts |
|------|--------|--------|------------------|
| [[test-plans/slice-3-recursion-demo\|Slice 3 — Recursion Demo]] | planned | slice 3 exit criteria: end-to-end recursion, frontier dedup, prompt-to-continue, lineage columns, plugin discovery | `scripts/test_target_recurse.py`, `scripts/csak_plugins/linkfinder.py`, `scripts/run_slice3_demo.py` |

Backfilling the slice 3 plan is the natural first piece of work in this folder — the artifacts already exist in the repo from the slice 3 ship; a wiki-side plan describing them as a testing scenario hasn't been written yet.

## Why a folder, not a section under synthesis

Testing plans accumulate over time as the product grows — slice 4 will have its own plan, slice 5 will have its own, plus cross-cutting plans (regression suites, performance plans, end-to-end plans against real targets when those happen). Treating it as a top-level folder mirrors how `specs/`, `architecture/`, `competitive/`, and `sessions/` work — content that grows linearly with the project gets its own folder, content that's a fixed shape gets a single page under `synthesis/` or `product/`.

## History

This folder replaces `engagements-RESERVED/`, a placeholder created on 2026-04-21 to reserve the name for hypothetical future engagement data. Per Eli's call on 2026-04-26: the wiki will never be used to store real engagement data (CSAK's `Org` entity is the system of record for that), but a place for testing plans is useful. The folder was repurposed in place rather than rescoped into a "notes-about-engagements" home.

## Related

- [[CYBER|CYBER.md]] (operating schema)
- [[specs/slice-3|Slice 3 Spec]] (the first plan covers slice 3 exit criteria)
- [[sessions/2026-04-26-slice-3-shipped|2026-04-26 — Slice 3 Shipped]] (slice 3 ship session note; demo scaffolding referenced there)
