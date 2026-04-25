---
title: "CSAK — Vision"
category: product
tags: [vision, what, why]
status: draft
confidence: medium
owner: shared
created: 2026-04-21
updated: 2026-04-25
---

# CSAK — Vision

> Draft. Rewritten 2026-04-22 (slice reframe), corrected 2026-04-23 (real-time vs. scheduled), and updated 2026-04-23 to match the finalized [[specs/slice-1|slice 1 spec]] (four-layer data model, stateless reports, no LLM in slice 1).

## What CSAK is

A **Cybersecurity Swiss Army Knife** — a unified system that orchestrates security tools against a target, ingests their output, triages what matters, and emits coherent reports organized per organization and time window.

CSAK does four things, in order:

1. **Target intake.** Accept a subject of investigation — an organization, a domain, an IP range, a host — optionally paired with pre-collected data (logs, scan output, documents).
2. **Collect.** Run the right tools against the target. The user picks which tools in early slices; the system picks in later slices.
3. **Triage.** Normalize findings across tools, score importance, deduplicate across tool runs and over time.
4. **Report.** Emit deliverables organized per organization and per time window: internal reviews for analysts and fix-it tickets for the teams being monitored.

The "Swiss Army Knife" framing matters: CSAK is *one* tool that covers many jobs, not a suite of point tools. It's a multi-tool, not a knife that accepts other people's cuts.

## Invocation model

CSAK is primarily **on-demand and real-time**. The analyst invokes it during active work — pulling fresh data, running a report, looking at current state — and expects output in seconds to minutes, not hours.

Three distinct modes worth naming explicitly:

- **On-demand / real-time** (in scope from slice 1). Analyst runs CSAK when they need output *now*. Latency matters. This is the default usage pattern.
- **Streaming / continuous detection** (not CSAK's job, any slice). Watching a data source and emitting alerts on events as they flow in. That's SIEM territory; CSAK reads SIEM output but doesn't replace a SIEM.
- **Scheduled / automated report generation** (slice 4+, not yet designed). "Every Monday regenerate the weekly reports for all active orgs." Useful eventually, but not urgent and not part of the current slice plan.

The distinction between report *structure* and invocation *cadence* matters: a report is scoped to (org, time window) because that's the useful way to organize findings, not because CSAK only runs on a schedule.

## Why it should exist

Security analysts waste large fractions of their time on mechanical work. The pain clusters in two places:

- **Tool orchestration.** Every open-source security tool has a different interface, output format, and operational model. Spinning up a varied toolkit for a new engagement is annoying, repetitive, and error-prone. Commercial alternatives (Splunk, Tenable, Pentera) solve this but cost enough that small and mid-sized teams default back to the grind.
- **Cross-tool synthesis.** Once output is collected, the hard work is turning a pile of tool-shaped artifacts into a single coherent picture of the org. Severity scores don't line up across tools. Findings duplicate. Context is lost between runs and between reporting periods. The analyst's judgment still drives everything, but the bookkeeping burns their time.

CSAK targets both layers. The analyst's judgment still drives the investigation, but the orchestration, normalization, and formatting are automated.

## Data model — four layers, org at the top

CSAK is organized around four entity layers plus an immutable raw-input layer:

- **Organization (Org)** — the top-level container. The unit of reporting and the human-meaningful identity of who's being investigated. Reports are *per org per time window*.
- **Target** — assets owned by an Org. Domains, IPs, hosts, services, people. Tools produce findings against targets, not against orgs.
- **Scan** — one semantic tool execution ("the April Nessus scan," "yesterday's Nuclei sweep"). Bridges raw input and structured findings. Multiple artifacts can belong to one scan; one artifact can participate in multiple scans.
- **Finding** — a single observation about a target, deduplicated per (org, tool, tool-specific key). Findings persist across reporting periods; their `first_seen` and `last_seen` timestamps drive what shows up in any given report.
- **Artifact** (beside the hierarchy) — the immutable raw input file. Bytes on disk. The byte-level record of what CSAK was given.

**Reports are not stored entities.** Each `csak report generate` invocation is a stateless pipeline — query current state, render files to disk, exit. The directory of timestamped output files is the history; CSAK holds no record of past reports. A report is aware only of its own window and is not aware of any other report.

The shape has consequences worth naming:

- **Continuity across runs.** A vuln found in March's scan, still present in April's, shows up correctly in both reports via `first_seen` / `last_seen` bounds.
- **Scan lineage.** "Which scans have caught this finding?" is queryable via the FindingScanOccurrence junction — useful both for internal-review methodology sections and for future automation.
- **Multi-org confidentiality is built in at the data layer.** Every Target, Scan, and Finding belongs to exactly one Org.
- **Reports are outputs, not state.** They can't drift, can't be silently mutated, and can't hold stale scores — because there's nothing to mutate.

See [[specs/slice-1|Slice 1 Spec]] for the full table-by-table breakdown.

## Who it's for

Primary working guess: **a security analyst doing mixed offensive and defensive work for a handful of client orgs.** Someone running OSINT against new targets, reviewing logs for existing clients, and switching between the two weekly. The McCrary Institute analyst archetype fits — explicitly. Commercial consultancies and small blue teams are adjacent and probably also fit.

Explicitly *not* aimed at FAANG-scale SOCs with dedicated detection-engineering teams. That market buys Splunk or builds custom and isn't our problem.

See [[product/users-and-jobs|Users & Jobs]] for the persona detail.

## What CSAK is NOT

- Not a scanner. CSAK orchestrates scanners; it doesn't scan.
- Not an IR platform. Not a case-management tool.
- Not a GRC tool. Compliance mapping might be a feature, but it's not the core.
- Not a Splunk replacement. CSAK may read Splunk's output, but replacing a full SIEM isn't on any slice.
- Not a real-time *alerting* system. CSAK doesn't watch data streams and fire alerts on events — that's SIEM territory. CSAK is invoked by the analyst (on-demand, usually real-time during active work), not triggered by data arrival.

## How LLMs fit in (or don't, yet)

**Slice 1 does not use LLMs at all.** The core pipeline — ingest, score, render — is deterministic end-to-end. That's deliberate: scoring has to be consistent and auditable, and the first job is proving the deterministic layer works.

Slice 1 produces a clean, structured JSON export of every report as a first-class output format. That JSON is designed specifically to be the input for a future LLM layer — drafting plain-language impact sections, summarizing periods, grouping tickets narratively, explaining caveats. An LLM layer attaches over slice 1's deterministic outputs; it does not replace them.

Whether and when the LLM layer ships is a later-slice decision. Slice 1's commitment is that the architecture makes it easy.

## How we're building it — slice-based

We're shipping CSAK in slices, each of which is independently useful:

- **Slice 1 — Ingest & Report.** User brings data (scanner output, logs, OSINT dumps) and/or org context. CSAK normalizes findings, scores them deterministically at ingest, and generates reports on demand for any (org, period) the analyst specifies. No tool orchestration. No recursion. No LLM. **Shipped 2026-04-24.** See [[specs/slice-1|Slice 1 Spec]].
- **Slice 2 — Tool Orchestration.** CSAK picks and runs tools against targets itself. Adds the "collect" stage from the four-step model above. **Spec approved 2026-04-24; implementation built and under test as of 2026-04-25.** See [[specs/slice-2|Slice 2 Spec]].
- **Slice 3 — Recursion & Catalog Expansion.** Opt-in recursion on `csak collect`: each tool's output is scanned for typed values that another tool accepts; those become inputs for the next depth. Termination by structural dedup, with `--max-depth` as the analyst's brake. Tool catalog becomes pluggable via Python files in `~/.csak/tools/`. **Spec drafted 2026-04-25, status `draft`, awaiting sign-off.** See [[specs/slice-3|Slice 3 Spec]].
- **LLM layer** (future slice, not yet numbered). Wraps LLM features over the structured outputs produced by slices 1–3.
- **Slice 4+.** Deliberately undefined. Scheduled/automated report generation is a likely candidate.

## What's settled

Slice 1 is shipped. Slice 2 spec is approved and implementation is built and under test as of 2026-04-25. Slice 3 spec is drafted (`draft`, confidence medium), awaiting Eli's sign-off review. Open questions tracked in [[synthesis/open-questions|open-questions]] are now scoped to the LLM layer, slice 2.5+ extensions (Nessus API integration is the leading candidate), and cross-cutting product positioning — none block slice 3 implementation once the spec is approved. Cross-page deferral tracking lives in [[synthesis/deferred-features|deferred-features]] for post-slice-3 review.

## Related

- [[product/scope|Scope]]
- [[product/slices|Slice Plan]]
- [[product/users-and-jobs|Users & Jobs]]
- [[product/glossary|Glossary]]
- [[specs/slice-1|Slice 1 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[specs/slice-3|Slice 3 Spec]]
- [[synthesis/open-questions|Open Questions]]
