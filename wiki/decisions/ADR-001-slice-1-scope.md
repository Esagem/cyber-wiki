---
title: "ADR-001: Slice 1 scope — Ingest & Report"
category: decisions
tags: [adr, slice-1, scope]
status: proposed
confidence: medium
owner: shared
adr: ADR-001
created: 2026-04-23
updated: 2026-04-23
superseded_by: ""
---

# ADR-001: Slice 1 scope — Ingest & Report

## Context

CSAK's product is a four-step pipeline: target intake → collect → triage → report. That's more than one release can ship well. We need an explicit first slice so we can stop designing in the abstract and start building.

This ADR commits to the boundary. The concrete shape lives in [[specs/slice-1|slice 1 spec]] and will evolve; this ADR is the frozen commitment.

## Decision

> **Slice 1 is "Ingest & Report": CSAK consumes pre-collected tool output, triages deterministically, and emits on-demand reports scoped to (org, time window). Tool execution, recursion, scheduled generation, and streaming detection are out.**

## Options considered

- **A — Full pipeline before any release.** Years of work; no validation of the hardest design choices until the end. Rejected.
- **B — Ingest & Report first.** Selected.
- **C — Orchestration first.** reconFTW already does this, free. No differentiation. Rejected.
- **D — Triage only.** Too small to be useful; nobody has pre-normalized findings. Rejected.

## Rationale

1. Tests the hardest design decisions (data model, triage, reports) against real data first.
2. Carves out defensible positioning — DefectDojo doesn't do narrative fix-it tickets, confidence × target-weight triage, or open-source LLM.
3. Lets slice 2 orchestration be designed against a working downstream consumer.
4. On-demand invocation falls out naturally — the analyst already knows when they have new data.

**Revisit if:** real use reveals "BYO tool output" is unusable friction; DefectDojo neutralizes our differentiation; LLM in reports turns out substantially worse than hoped.

## Consequences

- **Positive:** downstream ADRs unblocked; implementation can begin; differentiation is explicit.
- **Negative:** users expecting "one command, scan my target" wait for slice 2; parser work is front-loaded.
- **Neutral:** three-layer data model commits for now; fourth layer (Scan/Run/Test) remains an open question.

## Follow-ups

- [[specs/slice-1|Slice 1 Spec]] — move `draft` → `active` after review.
- **ADR-004** (storage) and **ADR-008** (template language) — unblocked.
- Track in [[synthesis/open-questions|open-questions]]: target nesting, false-positive status, DefectDojo/reconFTW ingest formats, auto re-triage.

## Related

- [[specs/slice-1|Slice 1 Spec]]
- [[product/vision|Vision]]
- [[competitive/build-vs-adapt|Build vs Adapt]]
- [[sessions/2026-04-22-slice-1-kickoff|Slice 1 Kickoff]]
