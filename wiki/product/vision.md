---
title: "CSAK — Vision"
category: product
tags: [vision, what, why]
status: draft
confidence: medium
owner: shared
created: 2026-04-21
updated: 2026-04-22
---

# CSAK — Vision

> Draft. This page replaces the initial framing after the 2026-04-22 working session. Expect further revision once slice 1 is specced and we've built against it.

## What CSAK is

A **Cybersecurity Swiss Army Knife** — a unified system that orchestrates security tools against a target, ingests their output, triages what matters, and emits coherent reports.

CSAK does four things, in order:

1. **Target intake.** Accept a subject of investigation — an organization, a domain, an IP range, a host — optionally paired with pre-collected data (logs, scan output, documents).
2. **Collect.** Run the right tools against the target. The user picks which tools in early slices; the system picks in later slices.
3. **Triage.** Normalize findings across tools, score importance, deduplicate across tool runs and over time.
4. **Report.** Emit two deliverable families: internal reviews for analysts and fix-it tickets for the teams being monitored.

The "Swiss Army Knife" framing matters: CSAK is *one* tool that covers many jobs, not a suite of point tools. It's a multi-tool, not a knife that accepts other people's cuts.

## Why it should exist

Security analysts waste large fractions of their time on mechanical work. The pain clusters in two places:

- **Tool orchestration.** Every open-source security tool has a different interface, output format, and operational model. Spinning up a varied toolkit for a new engagement is annoying, repetitive, and error-prone. Commercial alternatives (Splunk, Tenable, Pentera) solve this but cost enough that small and mid-sized teams default back to the grind.
- **Cross-tool synthesis.** Once output is collected, the hard work is turning a pile of tool-shaped artifacts into a single coherent picture of the target. Severity scores don't line up across tools. Findings duplicate. Context is lost between runs. The analyst's judgment still drives everything, but the bookkeeping burns their time.

CSAK targets both layers. The analyst's judgment still drives the investigation, but the orchestration, normalization, and formatting are automated. Deterministic at the core, LLM-assisted where LLMs do the job better.

## Data model — target-centric

CSAK is organized around **targets**, not engagements. A target is the subject of investigation: an organization, a domain, an IP range, a host, a person. Findings attach to targets and persist across time.

The target-centric choice has consequences worth naming:

- **Continuity across work sessions.** OSINT on `acmecorp.com` in Q1 and log review for the same org in Q2 accumulate against the same target. Trend analysis is cheap.
- **No clean "close the engagement" moment.** Findings don't auto-archive when a piece of work is done.
- **Target boundaries are fuzzy.** Is `*.acmecorp.com` one target or many? CSAK needs an explicit answer, probably a nestable target concept (parent org → child assets).
- **Multi-client confidentiality.** A target-centric model doesn't naturally separate client A from client B. Access control has to be layered on.

See [[product/scope|Scope]] and [[specs/slice-1|Slice 1 Spec]] for how this plays out in early work.

## Who it's for

Primary working guess: **a security analyst doing mixed offensive and defensive work for a handful of client orgs.** Someone running OSINT against new targets, reviewing logs for existing clients, and switching between the two weekly. The McCrary Institute analyst archetype fits — explicitly. Commercial consultancies and small blue teams are adjacent and probably also fit.

Explicitly *not* aimed at FAANG-scale SOCs with dedicated detection-engineering teams. That market buys Splunk or builds custom and isn't our problem.

## What CSAK is NOT

- Not a scanner. CSAK orchestrates scanners; it doesn't scan.
- Not an IR platform. Not a case-management tool.
- Not a GRC tool. Compliance mapping might be a feature, but it's not the core.
- Not an LLM wrapper. LLMs are evaluated case-by-case and used where they beat deterministic alternatives; they are not the product.
- Not a Splunk replacement for existing clients. CSAK may read Splunk's output, but replacing a full SIEM isn't on any slice.

## How we're building it — slice-based

We're shipping CSAK in slices, each of which is independently useful:

- **Slice 1 — Ingest & Report.** User brings data (scanner output, logs, OSINT dumps) and/or target context. CSAK processes, triages, reports. No tool orchestration. No recursion. See [[specs/slice-1|Slice 1 Spec]].
- **Slice 2 — Tool Orchestration.** CSAK picks and runs tools against targets itself. Adds the "collect" stage from the four-step model above.
- **Slice 3 — Recursion & Catalog Expansion.** Tool output can trigger further tool runs (exposed IPs → deeper recon). Tool catalog grows.

Later slices (4+) are deliberately undefined. We'll know more after slice 1 meets reality.

## What's settled vs. open

**Settled after the 2026-04-22 session:**

- Target-centric data model.
- Slice-based rollout, with slice 1 being ingest-and-report only.
- Deterministic core, LLMs evaluated case-by-case.
- Slice 1 tool set: Nuclei, Nessus Essentials, Zeek, osquery, Subfinder+httpx. See [[specs/slice-1|Slice 1 Spec]].

**Still open** — mirrored in [[synthesis/open-questions|Open Questions]]:

- Exact definition of a target's boundaries and nesting rules.
- Whether fix-it tickets are one format or many.
- Report template language.
- LLM's specific role in triage vs. report drafting.
- How targets, engagements, and clients relate (if "engagement" and "client" concepts exist at all in the data model).

## Related

- [[product/scope|Scope]]
- [[product/slices|Slice Plan]]
- [[specs/slice-1|Slice 1 Spec]]
- [[synthesis/open-questions|Open Questions]]
