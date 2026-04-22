---
title: "Architecture Decision Records — Format & Index"
category: decisions
tags: [adr, format, process, meta]
status: active
confidence: high
owner: shared
created: 2026-04-21
updated: 2026-04-21
---

# Architecture Decision Records (ADRs)

An ADR captures **one** design decision: what we chose, what we considered, and why. ADRs are the backbone of the wiki — every significant commitment ends up as one.

## When to write an ADR

Write an ADR when:
- We're about to make a decision that will be expensive to reverse later.
- We're choosing between two or more plausible approaches.
- We've found ourselves re-litigating a past choice in conversation.
- A spec or architecture page is about to lock in something non-obvious.

Don't write an ADR for:
- Small, cheap-to-change stylistic choices.
- Things already covered by an existing ADR (link to it instead).

## ADR format

Copy this template into a new file named `ADR-NNN-<short-slug>.md`. NNN is the next unused 3-digit number. ADR numbers never get reused.

```markdown
---
title: "ADR-NNN: <Short title>"
category: decisions
tags: [adr, <other tags>]
status: proposed          # proposed|accepted|superseded|retired
confidence: medium
owner: <eli|christopher|shared>
adr: ADR-NNN
created: YYYY-MM-DD
updated: YYYY-MM-DD
superseded_by: ""         # path to newer ADR if this one gets replaced
---

# ADR-NNN: <Short title>

## Context

The forces at play. Why this decision matters now. What we know, what we don't. Link to relevant research, competitive analysis, or prior ADRs.

## Decision

What we're deciding. Written as a single, clear statement. Present tense.

> We will <do X>.

## Options considered

### Option A — <name>
Short description, pros, cons.

### Option B — <name>
Short description, pros, cons.

### Option C — <name, if any>
Short description, pros, cons.

## Rationale

Why we picked what we picked. What trade-offs we accepted. What would have to change for us to revisit.

## Consequences

- **Positive:** what we gain.
- **Negative:** what we give up.
- **Neutral:** what changes that isn't clearly a win or loss.

## Follow-ups

Concrete next actions this ADR creates. Link to pages that will need updating.

## Related

- [[...]]
```

## Lifecycle

- **proposed** — drafted but not yet accepted. Both of us need to sign off before it goes `accepted`.
- **accepted** — in effect. Once accepted, an ADR is **immutable** — we edit only the `superseded_by` field if a later ADR replaces it.
- **superseded** — replaced by a newer ADR. The newer ADR's Context section should explain why.
- **retired** — the decision no longer applies and wasn't replaced (e.g. we dropped the feature entirely). Rare.

## Index

_No ADRs yet. The first few we expect to write (not a commitment, just a forecast):_

- **ADR-001** — Scope boundary for v0 (what's in, what's out).
- **ADR-002** — Primary user persona for v0.
- **ADR-003** — Architecture shape (monolith / modular / plugin host).
- **ADR-004** — Storage backend (sqlite / postgres / flat files / something else).
- **ADR-005** — Deployment model (CLI / self-hosted service / both).
- **ADR-006** — Ingestor plugin protocol.
- **ADR-007** — Triage model (rigid rules / configurable / LLM-assisted).
- **ADR-008** — Report format definition language (Jinja / markdown templates / something more structured).

Once written, each ADR gets a row in the table below:

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| _empty_ | | | |

## Related

- [[CYBER|CYBER.md §5.2 — Recording a decision]]
- [[synthesis/open-questions|Open Questions]] (the pipeline of potential ADRs)
