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

> Draft. This page replaces the initial framing after the 2026-04-22 working session. Late-evening clarification on report shape (org + time window) is incorporated.

## What CSAK is

A **Cybersecurity Swiss Army Knife** — a unified system that orchestrates security tools against a target, ingests their output, triages what matters, and emits coherent periodic reports per organization.

CSAK does four things, in order:

1. **Target intake.** Accept a subject of investigation — an organization, a domain, an IP range, a host — optionally paired with pre-collected data (logs, scan output, documents).
2. **Collect.** Run the right tools against the target. The user picks which tools in early slices; the system picks in later slices.
3. **Triage.** Normalize findings across tools, score importance, deduplicate across tool runs and over time.
4. **Report.** Emit periodic deliverables per organization: internal reviews for analysts and fix-it tickets for the teams being monitored. Reports are scoped to (org, time window) — e.g. "acmecorp April 2026 update."

The "Swiss Army Knife" framing matters: CSAK is *one* tool that covers many jobs, not a suite of point tools. It's a multi-tool, not a knife that accepts other people's cuts.

## Why it should exist

Security analysts waste large fractions of their time on mechanical work. The pain clusters in two places:

- **Tool orchestration.** Every open-source security tool has a different interface, output format, and operational model. Spinning up a varied toolkit for a new engagement is annoying, repetitive, and error-prone. Commercial alternatives (Splunk, Tenable, Pentera) solve this but cost enough that small and mid-sized teams default back to the grind.
- **Cross-tool synthesis.** Once output is collected, the hard work is turning a pile of tool-shaped artifacts into a single coherent picture of the org. Severity scores don't line up across tools. Findings duplicate. Context is lost between runs and between reporting periods. The analyst's judgment still drives everything, but the bookkeeping burns their time.

CSAK targets both layers. The analyst's judgment still drives the investigation, but the orchestration, normalization, and formatting are automated. Deterministic at the core, LLM-assisted where LLMs do the job better.

## Data model — three layers, org at the top

CSAK is organized around three layers:

- **Organization (Org)** — the top-level container. The unit of reporting and the human-meaningful identity of who's being investigated. Reports are *per org per time window*.
- **Target** — assets owned by an Org. Domains, IPs, hosts, services, people. Tools produce findings against targets, not against orgs.
- **Finding** — a single observation about a target, attached to its parent org. Findings persist across reporting periods; their `first_seen` and `last_seen` timestamps drive what shows up in any given report.

A separate **Report** entity captures the time-bounded snapshot — frozen at generation time so "regenerate the April report" yields the same artifact even after May's findings land.

The three-layer choice has consequences worth naming:

- **Continuity across reporting periods.** A vuln found in March's scan, still present in April's, shows up correctly in both reports.
- **Reports are deliverables, not just queries.** A report's contents are frozen when generated, even though the underlying findings keep evolving.
- **Org boundaries are usually obvious; target boundaries are fuzzy.** "Is `*.acmecorp.com` one target or many?" is a real question. Slice 1 resolves it via target nesting (parent → children).
- **Multi-org confidentiality is built in at the data layer.** Every Target and Finding belongs to exactly one Org.

See [[specs/slice-1|Slice 1 Spec]] for the concrete table-by-table breakdown.

## Who it's for

Primary working guess: **a security analyst doing mixed offensive and defensive work for a handful of client orgs.** Someone running OSINT against new targets, reviewing logs for existing clients, and switching between the two weekly. The McCrary Institute analyst archetype fits — explicitly. Commercial consultancies and small blue teams are adjacent and probably also fit.

Explicitly *not* aimed at FAANG-scale SOCs with dedicated detection-engineering teams. That market buys Splunk or builds custom and isn't our problem.

See [[product/users-and-jobs|Users & Jobs]] for the persona detail.

## What CSAK is NOT

- Not a scanner. CSAK orchestrates scanners; it doesn't scan.
- Not an IR platform. Not a case-management tool.
- Not a GRC tool. Compliance mapping might be a feature, but it's not the core.
- Not an LLM wrapper. LLMs are evaluated case-by-case and used where they beat deterministic alternatives; they are not the product.
- Not a Splunk replacement. CSAK may read Splunk's output, but replacing a full SIEM isn't on any slice.
- Not a real-time alerting system. CSAK runs in periodic-report mode, not stream-processing mode.

## How we're building it — slice-based

We're shipping CSAK in slices, each of which is independently useful:

- **Slice 1 — Ingest & Report.** User brings data (scanner output, logs, OSINT dumps) and/or org context. CSAK processes, triages, generates org+period reports. No tool orchestration. No recursion. See [[specs/slice-1|Slice 1 Spec]].
- **Slice 2 — Tool Orchestration.** CSAK picks and runs tools against targets itself. Adds the "collect" stage from the four-step model above.
- **Slice 3 — Recursion & Catalog Expansion.** Tool output can trigger further tool runs (exposed IPs → deeper recon). Tool catalog grows.

Later slices (4+) are deliberately undefined. We'll know more after slice 1 meets reality.

## What's settled vs. open

**Settled after the 2026-04-22 session:**

- Three-layer data model: Org → Target → Finding, with a separate Report entity.
- Reports are scoped to (org, time window) and frozen at generation.
- Slice-based rollout, with slice 1 being ingest-and-report only.
- Deterministic core, LLMs evaluated case-by-case.
- Slice 1 tool set: Nuclei, Nessus Essentials, Zeek, osquery, Subfinder+httpx. See [[specs/slice-1|Slice 1 Spec]].
- CLI-first interface for slice 1.
- Storage default: SQLite + flat-file artifacts (pending ADR-004).

**Still open** — mirrored in [[synthesis/open-questions|Open Questions]]:

- Target nesting rules (when does a discovered subdomain become its own child target?).
- Whether fix-it tickets are one format or many per-client-customizable formats.
- Report template language (Jinja2, Mustache, plain string substitution).
- Specific LLM applications in slice 1 (drafting plain-language impact, period summaries, etc.) — needs prototyping.
- How org boundaries handle parent-company-with-subsidiaries cases.

## Related

- [[product/scope|Scope]]
- [[product/slices|Slice Plan]]
- [[product/users-and-jobs|Users & Jobs]]
- [[specs/slice-1|Slice 1 Spec]]
- [[synthesis/open-questions|Open Questions]]
