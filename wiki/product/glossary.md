---
title: "CSAK — Glossary"
category: product
tags: [glossary, vocabulary, definitions]
status: draft
confidence: medium
owner: shared
created: 2026-04-21
updated: 2026-04-23
---

# Glossary

> Shared vocabulary for designing CSAK. Terms here are canonical — every page should use the same word for the same concept. Definitions below match the finalized [[specs/slice-1|slice 1 spec]] where applicable. Add a term the moment anyone hedges on what another contributor meant.

## CSAK itself

**CSAK** — the product. Cybersecurity Swiss Army Knife. The codename; the user-facing name is still to be determined.

## Data model entities (slice 1)

**Org** — the top-level container. A client company or equivalent. Reports are scoped per Org. Every Target, Scan, and Finding belongs to exactly one Org.

**Target** — an asset or asset class belonging to one Org. Domains, subdomains, IPs, hosts, URLs, services, or people. Tools produce findings against Targets, not against Orgs. Targets can nest via `parent_target_id`.

**Artifact** — an immutable raw input file. The bytes CSAK ingested from a tool, preserved on disk under a content-addressed path. Artifacts are evidence and are never deleted through CSAK.

**Scan** — one semantic tool execution that produced findings. "The April Nessus scan" or "yesterday's Nuclei sweep." A Scan can span multiple Artifacts (a single Zeek scan includes conn.log, dns.log, and so on), and one Artifact can participate in multiple Scans (re-ingesting the same bytes creates a new Scan event).

**Finding** — a single observation, deduplicated per `(org, source_tool, tool-specific dedup key)`. Attached to a Target. Has severity, confidence, and target_weight. Has a status: `active | suppressed | accepted-risk | false-positive | fixed`.

**FindingScanOccurrence** — the junction recording every Scan a given Finding has appeared in. The Finding is deduplicated; its history across Scans is preserved here.

## Triage and scoring

**Severity** — how bad a finding would be if real. CSAK's 5-point scale: `critical | high | medium | low | info`, plus `null` when unclassifiable. Per-tool translation tables map each tool's native severity onto this scale.

**Confidence** — how likely the finding is real, as reported by the source tool (or as set by a CSAK default that reflects how much a given tool tends to hallucinate). `high | medium | low`. Tool-assigned, not analyst-assigned.

**`target_weight`** — float on the Target row, default 1.0. Analyst-assigned. Lets the analyst express "public-facing infra matters more than staging."

**Priority** — derived at ingest time: `priority = severity_weight × confidence_weight × target_weight`. Stored on the Finding row. Re-computed only when an analyst mutates status or a Target's `target_weight` changes. Editing scoring-table files does not retroactively re-score existing Findings in slice 1.

**Dedup key** — the tool-specific key CSAK uses to decide whether two findings are the same. Nuclei: `template-id + matched-at`. Nessus: `plugin_id + host + port`. Zeek: event-type dependent. osquery: query name + row hash. Subfinder: subdomain. httpx: URL.

**Status** — the analyst's disposition of a Finding: `active | suppressed | accepted-risk | false-positive | fixed`. Analysts set `false-positive` when they're certain the Finding isn't real; partial doubt is not expressed via a score modifier in slice 1.

## Deliverables

**Report** — a deliverable produced by `csak report generate`, scoped to (Org, time window, kind). **Not a stored entity.** Each invocation is a stateless pipeline: query current state, render files, exit. The directory of timestamped output files is the history. A report is aware only of its own window.

**Internal Review** — the analyst-team-facing report kind. Technical, thorough, preserves ambiguity and caveats.

**Fix-it Ticket Bundle** — the client-facing report kind. Plain-language tickets ready to forward as-is. Packaged as a directory of files plus a `.zip`.

**Export formats** — slice 1 ships **markdown** (primary authoring format, Jinja2 templates), **docx** (python-docx, Word-native for clients), and **JSON** (machine-readable, stable schema, designed as the input for a future LLM layer). All three are first-class.

**Report context** — the Python object built from the current Finding/Scan/Target state, consumed by all renderers. The invariant that keeps markdown, docx, and JSON aligned: same content, same section order, same source.

## Components

**Ingestor** — a component that knows how to read one kind of input (Nessus XML, Nuclei JSONL, a Zeek log directory, etc.) and produce Scans, Artifacts, and Findings. "Parser" is used interchangeably in implementation language; "ingestor" is the preferred design-doc term.

**Renderer** — a format-specific component that turns a report context into output files. Slice 1 has three: markdown, docx, JSON. The rendering layer is designed as a plugin set so later formats (HTML, PDF, CSV) drop in without changing the query path.

**Scoring table** — a YAML file under `config/triage/severity/<tool>.yaml` that maps a tool's native severity values onto CSAK's 5-point scale. Versioned as files; editing them does not retroactively re-score existing Findings.

## Workflow and invocation

**On-demand / real-time invocation** — CSAK's default mode. Analyst runs `csak report generate` during active work and expects output in seconds to minutes. Slice 1's only invocation mode.

**Scheduled / automated invocation** — future work (slice 4+). Cron-style or event-triggered report generation. Not designed yet.

**Streaming / continuous detection** — indefinitely out of scope. SIEM territory.

## Terms we're deliberately not using (yet)

**Engagement** — DefectDojo's term for a scoped piece of work over a time window. CSAK doesn't use it as a first-class entity in slice 1 — the (Org, time window) pair scoping a report covers the same need. Could return later if it earns its place.

**Playbook** — speculative vocabulary from an earlier iteration. Would mean "a repeatable procedure CSAK follows to turn a kind of input into a kind of output." Not used anywhere in the slice 1 spec. Revisit only if a concrete need surfaces.

**Importance** — conflates severity and priority. Use the specific term. Severity is tool-assigned, priority is derived.

**Action class / disposition** — old term for Finding status. The canonical set is `active | suppressed | accepted-risk | false-positive | fixed`.

## Terms to avoid in user-facing copy

- "AI-powered" — too vague, too marketing. Say specifically what's deterministic and what's LLM-driven.
- "Swiss Army Knife" in user-facing copy. Internal codename only.
- "Periodic" or "scheduled" when describing slice 1. Slice 1 is on-demand.

## Related

- [[specs/slice-1|Slice 1 Spec]]
- [[product/vision|Vision]]
