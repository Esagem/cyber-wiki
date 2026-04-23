---
title: "engagements-RESERVED (placeholder)"
category: synthesis
tags: [placeholder, future, reserved]
status: seed
confidence: high
owner: shared
created: 2026-04-21
updated: 2026-04-23
---

# engagements-RESERVED — placeholder folder

This folder is deliberately empty.

It exists as a visible reminder that **someday we might dogfood CSAK on real engagements** — and when that happens, the engagement data will live here in a shape that mirrors what the product itself produces.

## What would have to happen to activate this folder

1. CSAK reaches a usable v0.
2. We explicitly decide, in a working session, that we'll dogfood it on a real piece of work.
3. That session's notes define:
   - How engagements are named and separated.
   - What secrets/PII handling rules apply.
   - Whether real client-identifying data ever appears here, or if we use pseudonyms.
   - How access is restricted (core team only, or wider?).
4. [[CYBER|CYBER.md]] is updated to reflect the new rules.

Until all four happen, **no real engagement data goes in this folder**. The LLM should refuse to write into `engagements-RESERVED/` except to update this README.

## Why a placeholder at all

Leaving the name reserved prevents someone (human or LLM) from later creating `engagements/` with a different structure, discovering it conflicts with the product's own idea of an engagement, and having to migrate. A deliberate empty folder today is cheaper than a rename later.

There is one active question worth flagging: the presence of the `Org` entity in slice 1's data model may make this folder less necessary than originally planned. If CSAK's own database holds the engagement-shaped data, `engagements-RESERVED/` is redundant — the wiki doesn't need to mirror what the product already stores. Revisit when slice 1 is close to build-ready.

## Related

- [[CYBER|CYBER.md]]
- [[specs/slice-1|Slice 1 Spec]]
