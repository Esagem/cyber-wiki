---
title: "2026-04-22 — Slice 1 Kickoff"
category: sessions
tags: [slice-1, product-shape, tools, data-model]
status: active
confidence: medium
owner: shared
created: 2026-04-22
updated: 2026-04-22
---

# 2026-04-22 — Slice 1 Kickoff

First real working session on CSAK's shape. Participants: Eli + Claude.

## What we decided

### 1. Product reframe

CSAK was originally framed as a downstream triage-and-report tool consuming pre-collected data. The actual product Eli wants is an **orchestrator and triager** — picks tools, runs them against a target, ingests their output, triages, reports. Swiss Army Knife is the right metaphor for the second framing, not the first.

The original vision page ([[product/vision|product/vision.md]]) was rewritten to reflect this.

### 2. Slice-based build plan

Three slices, each independently useful:

- **Slice 1 — Ingest & Report.** User brings data. CSAK processes, triages, reports. No tool execution. No recursion. [[specs/slice-1|Full spec.]]
- **Slice 2 — Tool Orchestration.** CSAK runs tools itself.
- **Slice 3 — Recursion & Catalog Expansion.** Tool output triggers further tool runs, with budgets. Tool catalog grows beyond the starter 5.

Slice 1 was deliberately chosen over slice 2 because cross-tool synthesis is the harder and more defensible part of the product. Plenty of existing orchestrators exist; good synthesis is rarer.

### 3. Data model — three layers, org at the top

Late in the session Eli clarified that **reports are organization+time-period scoped** ("April update for acmecorp"). This reshaped the data model.

The model is now three layers with a separate Report entity:

- **Org** — the top-level container. Reports are per-org per-period.
- **Target** — assets owned by an Org (domains, IPs, hosts). Tools produce findings against Targets.
- **Finding** — a single observation about a Target, denormalized to its Org for query speed.
- **Artifact** — immutable raw input file.
- **Report** — frozen snapshot of (org, time window, kind). Generated, not derived on read.

This replaces the simpler "target-centric" framing earlier in the session. Tradeoffs:

- Gains: continuity across reporting periods, dedup at the org level, multi-org confidentiality at the data layer.
- Costs: more entities, more edges. Open questions around target nesting and org boundaries.

### 4. Five starter tools for slice 1

| Tool | Covers |
|------|--------|
| Nuclei | Web vuln scanning |
| Nessus Essentials | Classic vuln scanner |
| Zeek | Network telemetry |
| osquery | Host telemetry |
| Subfinder + httpx | External attack surface |

Selection criteria: parseable output (prefer JSON), real tools an analyst would actually use, covers a genuinely varied set of input shapes to stress-test the report layer.

Explicitly deferred: Metasploit/Burp/ZAP (wrong layer), Wazuh/ELK (too big), trivy/grype (too narrow), theHarvester/amass (subfinder covers the high-value slice).

### 5. LLM posture

Deterministic core. LLMs evaluated case-by-case per feature. For slice 1, likely useful for:

- Drafting fix-it ticket "impact in plain language" sections.
- Grouping findings into ticket bundles.
- Period summaries ("what changed since the March update").
- Maybe explaining finding confidence caveats.

Explicitly NOT for: triage scoring (deterministic and explainable), ingest parsing (tool outputs are structured), tool selection (not slice 1 anyway).

Token efficiency was called out as a design constraint.

### 6. CLI-first interface

Slice 1 ships with CLI only. Web UI is slice-3-or-later. Reasoning: fits existing analyst workflow, fastest to build, doesn't constrain a future UI (CLI can be wrapped; the inverse is harder).

### 7. Storage — SQLite + flat-file artifacts

Default leaning, pending ADR-004. SQLite for structured data, content-addressed flat files for artifacts. Reports rendered to `reports/<org-slug>/<period>/...` on disk.

## What was written this session

- [[product/vision|product/vision.md]] — rewritten end-to-end.
- [[product/scope|product/scope.md]] — reframed around slices.
- [[product/slices|product/slices.md]] — new. Slice plan.
- [[product/users-and-jobs|product/users-and-jobs.md]] — new. First persona sketch.
- [[specs/slice-1|specs/slice-1.md]] — new. Detailed spec.
- [[competitive/README|competitive/README.md]] — new. Format and target list.
- [[synthesis/open-questions|synthesis/open-questions.md]] — re-prioritized; answered questions moved to history.
- [[_index|_index.md]] — updated.

## Outstanding for Eli's review (morning)

In rough priority order:

1. **Read [[product/vision|vision]] and [[specs/slice-1|slice 1 spec]] end-to-end.** These are the most consequential pages. Push back on anything that puts words in your mouth, especially around the data model and the LLM posture.
2. **Sanity-check the [[product/users-and-jobs|persona sketch]].** Claude wrote it from inference; correct anything wrong.
3. **Skim the [[synthesis/open-questions|open questions]].** Look for anything Claude moved to "answered" that you don't actually consider settled.
4. **Note any tool you'd swap** in the slice 1 starter set.
5. **Decide whether [[competitive/README|competitive analysis]] should be the next session's focus**, or whether we should go straight to drafting ADR-001 and ADR-004.

## Outstanding for Claude (next session)

- Draft **ADR-001 (slice 1 scope boundary)** — only after Eli's review settles slice 1 spec to `active`.
- Draft **ADR-004 (storage backend)** — needed before any implementation.
- Begin competitive analysis with DefectDojo, reconFTW, and one LLM-powered upstart.
- Build out at least one of `architecture/overview.md` or `architecture/data-flow.md` to make the spec concrete.

## Related

- [[product/vision|Vision]]
- [[product/slices|Slice Plan]]
- [[product/users-and-jobs|Users & Jobs]]
- [[specs/slice-1|Slice 1 Spec]]
- [[product/scope|Scope]]
- [[synthesis/open-questions|Open Questions]]
- [[competitive/README|Competitive Analysis]]
