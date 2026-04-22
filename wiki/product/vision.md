---
title: "CSAK — Vision"
category: product
tags: [vision, what, why]
status: seed
confidence: low
owner: shared
created: 2026-04-21
updated: 2026-04-21
---

# CSAK — Vision

> One-page statement of what we're building and why. This page gets updated as our thinking sharpens — don't treat anything here as settled until it's backed by an ADR.

## What CSAK is (current working definition)

A **Cybersecurity Swiss Army Knife** — a unified system that replaces the manual, fragmented work of stitching together security-tool output by hand. CSAK does three things:

1. **Ingests** data from a wide, customizable range of security tools (scanners, SIEMs, EDRs, PCAPs, logs, advisories, etc.).
2. **Triages** what it ingests — extracts what matters and assigns each item a level of importance.
3. **Reports** in consistent formats, including internal reviews for analyst teams and external fix-it tickets for the groups being monitored.

The "Swiss Army Knife" framing matters: it's *one* tool that covers many jobs, not a suite of point tools. Customizability is a first-class property.

## Why it should exist (current hypothesis)

Security analysts waste large fractions of their time on mechanical work:
- Normalizing scanner output across vendors.
- Deciding which of 200 Nessus findings are actually worth escalating.
- Rewriting the same vulnerability description three times for three audiences.
- Tracking what got ticketed vs. accepted vs. punted.

CSAK targets that mechanical layer. The analyst's judgment still drives everything, but the bookkeeping, normalization, and formatting are automated.

## Who it's for (rough)

See [[product/users-and-jobs|Users & Jobs]] (planned).

Primary working guess: **small/mid security teams** doing a mix of vuln management, assessment work, and IR support — the people who feel the pain of tool fragmentation most acutely. Explicitly *not* aimed at FAANG-scale SOCs with dedicated detection-engineering teams.

## What CSAK is NOT (current)

- Not a scanner. CSAK consumes scanner output; it doesn't generate it.
- Not an IR platform. It can feed IR workflows but isn't a case management system.
- Not a GRC tool. Compliance mapping might be a feature, but it's not the core.
- Not an LLM wrapper. It uses LLMs where helpful but has deterministic logic at its core.

## Open questions

_This list is mirrored into [[synthesis/open-questions|Open Questions]] with more structure._

- Who exactly is the primary user? Pen-testers vs. blue-teamers vs. consultants have meaningfully different needs.
- How opinionated should the triage model be? A rigid model is easier to build but may not fit every team's risk framework.
- Local-first or cloud-first? Affects the entire architecture.
- Is "fix-it ticket" one format or many (different per-client conventions)?
- What's the v0 scope — how much of "ingest → triage → report" do we build before shipping anything?

## Related

- [[product/scope|Scope]] — in/out of scope for v0
- [[synthesis/open-questions|Open Questions]]
- [[synthesis/roadmap|Roadmap]]
