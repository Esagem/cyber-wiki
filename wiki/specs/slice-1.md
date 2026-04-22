---
title: "Slice 1 — Ingest & Report"
category: specs
tags: [slice-1, ingestion, triage, reporting, spec]
status: draft
confidence: medium
owner: shared
created: 2026-04-22
updated: 2026-04-22
---

# Slice 1 — Ingest & Report

> Draft spec. Reviewed with Eli on 2026-04-22. Still needs convergence on several open items flagged inline.

## Goal

Take pre-collected security tool output, normalize it into target-centric findings, triage, and emit reports good enough to hand to a real analyst.

No tool orchestration. No recursion. No LLM-driven anything unless it demonstrably beats a deterministic alternative.

## Scope

### In scope

- Ingest from 5 tool formats (see below).
- Target-centric data model with one level of nesting (target → sub-targets).
- Deterministic triage scoring.
- Dedup within a single run and across runs against the same target.
- Two report formats: internal review and fix-it ticket bundle.
- Minimal CLI or single-page UI for invoking a run. (Pick one — see open questions.)

### Out of scope

- Tool execution (→ slice 2).
- Automatic tool selection (→ slice 2).
- Recursion (→ slice 3).
- Continuous monitoring or scheduled runs.
- Bidirectional integration with external systems (Jira, Slack, ticketing).
- Multi-user or multi-tenant features.
- Auth beyond "single user on their own machine."

## Supported inputs — the 5 starter tools

Each tool produces output in a specific format. Slice 1 must parse all five.

| Tool | Covers | Input format CSAK accepts | Why picked |
|------|--------|---------------------------|------------|
| **Nuclei** | Web vuln scanning (template-based) | JSON (`-json-export` / `-j`) | Clean JSON, high signal, ubiquitous. Good canary for "URL → known vulns." |
| **Nessus Essentials** | Classic vuln scanner | `.nessus` XML | Industry-baseline format. Realistic for McCrary-style work. |
| **Zeek** | Network telemetry | Zeek log files (TSV/JSON) | Rich structured network logs. Covers "I have traffic, tell me what matters." |
| **osquery** | Host telemetry | JSON (query results) | Clean JSON. Covers host state (processes, users, files, configs). |
| **Subfinder + httpx** (ProjectDiscovery) | External attack surface | JSON (both tools output JSON) | Attack-surface discovery: domain → subdomains → live hosts. OSINT slice. |

**Deliberately excluded from slice 1:**

- Exploit/attack frameworks (Metasploit, Burp, ZAP) — they produce session artifacts, not findings.
- Full SIEM platforms (Wazuh, ELK, Graylog) — too big; CSAK consumes SIEM output if anything.
- Container/SBOM scanners (trivy, grype) — narrow, add in slice 3.
- OSINT tools beyond subfinder (theHarvester, amass) — subfinder covers the high-value slice.

## Data model

### Core entities

```
Target
├── id                   UUID-ish identifier
├── name                 human-readable: "acmecorp"
├── type                 org | domain | ip-range | host | person
├── identifiers          list of concrete handles — domains, IPs, CIDRs, etc.
├── parent_target_id     optional; enables nesting
├── created              first time CSAK saw this target
└── updated              last time anything attached to this target

Finding
├── id                   UUID
├── target_id            which target this attaches to
├── source_tool          nuclei | nessus | zeek | osquery | subfinder | httpx | manual
├── source_artifact_id   pointer to the ingested artifact
├── title                one-line description
├── severity             critical | high | medium | low | info
├── confidence           high | medium | low
├── raw                  the tool's original representation, preserved
├── normalized           CSAK's internal representation
├── first_seen           when this finding first appeared
├── last_seen            when this finding was last observed
├── status               active | suppressed | accepted-risk | fixed
└── tags                 freeform

Artifact
├── id                   UUID
├── target_id            which target this belongs to
├── source_tool          which tool produced it
├── received_at          when CSAK ingested it
├── path                 on-disk location of the raw file
└── hash                 content hash, for dedup across identical uploads
```

### Why this shape

- **Target-centric** because of the 2026-04-22 decision: findings accumulate against the subject of investigation, not against the work-session.
- **Artifact table exists** because the same raw output might produce findings multiple times (re-triaging a past Nessus file against updated rules, for example). The artifact is the immutable input; findings are derived.
- **Severity and confidence are independent axes** because they answer different questions. CVSS conflates them and that's a longstanding pain point.
- **`first_seen` / `last_seen`** lets dedup across runs tell you "this vuln has been present for 6 weeks" without needing a separate time-series store.

### Open data-model questions

- Is there a separate **Engagement** or **Session** entity, or do we rely purely on `first_seen` / `last_seen` timestamps and source_tool to slice findings by time? Leaning toward *no engagement entity* in slice 1, revisit if pain emerges.
- How does target nesting handle the `*.acmecorp.com` case? Options: (a) each discovered subdomain becomes a child target; (b) subdomains are `identifiers` on one target; (c) hybrid — promote to child target only if findings attach to that subdomain specifically. Leaning toward (c) but this needs a decision before implementation.
- What happens to findings when a target is deleted? Probably soft-delete only, with the artifacts preserved separately.

## Triage

### Scoring

Slice 1 uses **deterministic scoring**. Each finding gets:

- **Severity**: taken from the source tool when provided, mapped onto CSAK's 5-point scale (critical/high/medium/low/info) via a per-tool translation table. For tools that don't emit severity (Zeek events, osquery results), CSAK applies a ruleset keyed on the finding shape.
- **Confidence**: heuristic. Tool-reported confidence when available; otherwise a CSAK default that reflects how much a given tool tends to hallucinate. (Nessus-reported "Medium confidence" is treated differently from osquery's objective query results.)
- **Priority**: derived. `priority = severity_weight * confidence_weight * target_weight`. Target weight defaults to 1.0; operator can bump it (e.g. public-facing infra = 1.5).

No LLM involvement in slice 1 triage. The scoring table and rules are explicit and versioned.

### Dedup

Two findings are the same if they match on: `target_id`, `source_tool`, and a **tool-specific dedup key**.

- **Nuclei**: `template-id + matched-at`
- **Nessus**: `plugin_id + host + port`
- **Zeek**: depends on event type — for `notice.log` it's `note + src + dst`
- **osquery**: query name + row hash
- **Subfinder**: subdomain
- **httpx**: URL

Dedup runs at ingest time. Re-ingesting the same artifact hits the Artifact hash first and is a no-op.

### Open triage questions

- Do we keep CSAK's severity scale at 5 points or add a 6th "unknown"? Leaning 5 + explicit `null` for un-triagable.
- Does triage re-run automatically if scoring rules change, or only on explicit re-triage command?
- How do we surface "this is probably a false positive" without fully suppressing it? Proposed: a separate `probability_real` field independent of confidence.

## Reports

### Two output families

**Internal Review** — for the analyst team.

- One per target per run.
- Markdown.
- Sections: target summary, methodology (what tools produced what), findings grouped by severity, notes on confidence and caveats, raw-data appendix (or pointer to artifacts).
- Technical language assumed. Cross-references between findings. Preserves ambiguity.

**Fix-it Tickets** — for the team being monitored.

- One markdown file per ticket. Whether a ticket is one finding or a group is a per-report choice (initially per-finding, group later if it earns it).
- Sections: title, affected asset(s), impact in plain language, reproduction steps if available, remediation, validation.
- Plain language. No internal chatter. No speculation.

### Template language

Not decided. Options:

- **Jinja2** — most flexible, most popular, Python-native.
- **Mustache / Handlebars** — logic-less, cleaner separation.
- **Pure markdown with front matter** — no templating engine, just string substitution. Simplest.

Leaning Jinja2 unless we find a reason not to. Marked as an ADR candidate (ADR-008 in the forecast list). [[synthesis/open-questions|Open Questions]] tracks.

### LLM's role in reports

**Under active consideration, case by case:**

- **Drafting the fix-it ticket's "impact in plain language" section** — LLM genuinely adds value here; translating CVE-speak into stakeholder-speak is tedious and LLMs are good at it.
- **Drafting the internal review's "notes on confidence and caveats"** — maybe. An LLM can articulate why a finding might be a false positive, but needs strong grounding to avoid fabrication.
- **Grouping findings into ticket bundles** — a good LLM use if done carefully. Probably worth trying in slice 1.
- **Explaining triage scores** — no. Scoring is deterministic; its explanation should be too.

These are worth prototyping in slice 1 to find out what actually works.

## Interface

Slice 1 ships with **one invocation surface**. Candidates:

- **CLI only.** `csak ingest --target acmecorp file1.nessus file2.json`. Fast to build, fits existing analyst workflows.
- **Minimal web UI.** One-page form: pick a target, upload files, get a report. Lower friction for non-CLI users.
- **Both.** Higher cost, obvious to delay.

**Open.** Leaning CLI-first because an analyst building up muscle memory is faster than an analyst clicking through a form, and slice 1 is targeted at analyst use.

## Storage

Slice 1 needs persistent storage for Targets, Findings, and Artifacts.

**Leaning sqlite + a flat-file artifact store.** Sqlite for structured data; artifacts as files on disk keyed by hash. This is ADR-004 in the forecast and should be decided before slice 1 coding begins.

Reasons for sqlite over postgres in slice 1: zero operational overhead, embeds in the product, handles anything short of millions of findings without complaint. Reasons to consider postgres: concurrent access (irrelevant at v0), richer query language (overkill at v0).

## What slice 1 explicitly does not solve

For clarity — these are real pain points, they just aren't slice 1's problem:

- Running tools against targets (slice 2).
- Figuring out which tools to run (slice 2).
- Recursive investigation (slice 3).
- Scheduling, watching for changes over time.
- Team collaboration features.
- Integrating with external trackers.

## Exit criteria

Slice 1 is "done" when:

- All 5 tool formats ingest cleanly, including real-world messy examples.
- A report generated from a mixed-tool run (e.g. Nessus + Zeek) is coherent, not a concatenation of tool outputs.
- Triage scores are reproducible and explainable.
- Dedup across runs against the same target actually works (re-ingesting last week's Nessus scan doesn't double-count).
- At least one analyst (Eli) has used it on a real piece of work and not hated it.

## Related

- [[product/vision|Vision]]
- [[product/slices|Slice Plan]]
- [[product/scope|Scope]]
- [[synthesis/open-questions|Open Questions]]
- [[decisions/README|ADR Index]]
