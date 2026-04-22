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

### 3. Target-centric data model

CSAK's primary container is the **target** (the subject of investigation) rather than the **engagement** (the work session). Findings attach to targets and accumulate over time. Engagements or sessions may emerge as a secondary concept later if pain demands it; slice 1 will not have them.

Tradeoffs acknowledged:

- Gains: continuity, trend analysis, natural dedup across time.
- Costs: no clean "engagement closed" moment, fuzzy target boundaries (`*.acmecorp.com` is one or many?), weaker multi-client confidentiality.

Target nesting (parent target → child targets) is in the data model but the specific rule for when to promote a discovered subdomain into its own child target is still open.

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
- Maybe explaining finding confidence caveats.

Explicitly NOT for: triage scoring (should be deterministic and explainable), ingest parsing (tool outputs are structured), tool selection (not a slice 1 feature anyway).

Token efficiency was called out as a design constraint.

## What's still open (from slice 1 spec)

These surfaced during the session and are now tracked:

- **Interface shape.** CLI vs minimal web UI vs both. Leaning CLI-first.
- **Storage backend.** Leaning sqlite + flat-file artifact store. ADR-004 candidate.
- **Template language for reports.** Jinja2, Mustache, or pure markdown substitution. ADR-008 candidate.
- **Target nesting rules.** When does a discovered subdomain become its own target?
- **Separate engagement entity?** Currently leaning no. Revisit if pain emerges.
- **Severity scale.** 5-point + null, or 6-point. Leaning 5 + null.
- **Auto re-triage on rule changes** or only on explicit command?

## What's still open (from original open-questions list, re-prioritized)

Many open questions now have context they didn't before:

- "Primary user of v0" — effectively answered: a McCrary-style analyst doing mixed offensive/defensive work for a handful of client orgs. Not FAANG SOCs.
- "Breadth vs depth" — answered: depth at v0 (5 tools, done excellently). Breadth comes in slice 3.
- "Plugin protocol for ingestors" — deferred to slice 2.
- "Fix-it ticket: one format or many" — still open, deferred to slice 1 implementation.
- "Is CSAK sold or OSS or internal" — deliberately not driving v0 design. Eli's posture: make the best tool possible, let distribution figure itself out.

Full list in [[synthesis/open-questions|Open Questions]] (needs updating to reflect this session — next task).

## Next steps

Priority order:

1. Eli reviews the three new pages: [[product/vision|vision]], [[product/slices|slices]], [[specs/slice-1|slice-1 spec]]. Push back on anything that feels wrong.
2. Update [[synthesis/open-questions|Open Questions]] to reflect which are answered, re-prioritized, or deferred.
3. Write ADR-001 (scope boundary for v0/slice-1) once the slice 1 spec settles — this is the first real ADR.
4. Write ADR-004 (storage backend) — needed before any implementation.
5. Write [[product/users-and-jobs|Users & Jobs]] to concretize the "McCrary-style analyst" user.
6. Competitive analysis: at minimum DefectDojo, reconFTW, and one of the LLM-powered upstarts. Enough to know what we're not rebuilding.

## Related

- [[product/vision|Vision (rewritten in this session)]]
- [[product/slices|Slice Plan (new in this session)]]
- [[specs/slice-1|Slice 1 Spec (new in this session)]]
- [[synthesis/open-questions|Open Questions (needs update)]]
