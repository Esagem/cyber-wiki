---
title: "engagements-RESERVED (placeholder)"
category: synthesis
tags: [placeholder, future, reserved]
status: seed
confidence: high
owner: shared
created: 2026-04-21
updated: 2026-04-24
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

## Should this folder retire?

**Updated 2026-04-24:** slice 1 has shipped, and the `Org` entity exists in CSAK code. The product itself now provides engagement-shaped storage. The original justification for this folder — "the wiki may want to mirror what the product stores" — is now weaker, because the product can be queried directly for the structured engagement data, with the wiki holding only the unstructured notes-about-engagements that the product wouldn't naturally hold.

The question "should this folder retire?" is now **actionable** rather than deferred to "when slice 1 is close to build-ready." Awaiting Eli's call. Three reasonable outcomes:

1. **Retire entirely.** Remove the folder. Engagement-shaped data lives in CSAK; engagement-adjacent notes (anything that doesn't fit CSAK's data model — internal team commentary, client communication patterns, lessons learned) goes in a new `notes/` folder or under `sessions/`.
2. **Keep but rescope.** Folder stays as the home for notes-about-engagements that CSAK itself wouldn't hold (debriefs, client-relationship notes, lessons learned). Update this README to describe the rescoped purpose.
3. **Keep as-is.** Defensible if we anticipate the wiki being a useful place to dogfood CSAK output (rendered reports, copies of artifacts) for review and discussion. Lower-confidence option since CSAK's filesystem already does this.

No action without an explicit decision. If unaddressed by the time the first real engagement runs through CSAK, the default behavior is option 1 (retire) — but a deliberate choice between the three is preferred.

## Related

- [[CYBER|CYBER.md]]
- [[specs/slice-1|Slice 1 Spec]]
