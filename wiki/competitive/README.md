---
title: "Competitive Analysis — Index & Format"
category: competitive
tags: [competitive, meta, process]
status: active
confidence: high
owner: shared
created: 2026-04-22
updated: 2026-04-23
---

# Competitive Analysis

This category holds research on **tools, products, and frameworks adjacent to or competing with CSAK**. Each entry answers two questions:

1. What does this tool do that overlaps with CSAK?
2. What can we learn from it (positive or negative)?

The point isn't to track every security product on the market — it's to keep us honest about what already exists so we don't accidentally rebuild it badly.

## Page format

One page per tool/product. Suggested template:

```markdown
---
title: "<Tool Name>"
category: competitive
tags: [<tool-name>, <category like vuln-mgmt or recon-orchestration>]
status: <seed|draft|active>
confidence: <low|medium|high>
owner: <eli|christopher|shared>
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources:
  - "https://example.com/the-tool"
  - "research/sources/local-copy.pdf"
---

# <Tool Name>

## What it is

One paragraph in our own words.

## What it does that overlaps with CSAK

Concrete list. Where does its functionality intersect ours?

## What it does that we explicitly don't want to do

Equally important. What's it for that we're not for?

## Strengths to learn from

What does it do well? What design choices did it get right?

## Weaknesses / gaps

Where does it fall short? What does it do badly that we could do better?

## Pricing / licensing model

OSS / commercial / freemium / something exotic. Affects what we can borrow.

## Verdict for CSAK design

One sentence: does this make us rethink anything? Does it validate a choice? Does it suggest a feature?

## Notes / quotes

Freeform. Quotes with sources.
```

## Index

| Page | Status | Verdict |
|------|--------|---------|
| [[competitive/defectdojo\|DefectDojo]] | active | Closest competitor to slice 1. Mature, widely adopted, heavy deployment. CSAK wins on zero-deployment CLI, real-time invocation, narrative fix-it reports, clean JSON export for future LLM layer. |
| [[competitive/reconftw\|reconFTW]] | active | Competitor for slices 2–3, not 1. Covers tool orchestration + recursion + OSINT. License status is ambiguous (MIT vs GPL-3.0 contradiction in the repo itself) — resolve before any code-level leverage. |
| [[competitive/leverage-analysis\|Leverage Analysis]] | draft | Per-tool, per-strategy feasibility under both licenses. Bottom line: foreign-JSON ingest (DefectDojo and reconFTW) deferred out of slice 1; don't fork either; defer the slice 2 fork-vs-integrate question until slice 2 design begins. |
| [[competitive/build-vs-adapt\|Build vs Adapt]] | draft | Assuming permissive licenses, should we adapt code or write fresh? Verdict: build the code ourselves, adapt data/content/config with attribution, take design inspiration freely. |

## Target list — not yet written

### Direct overlap with CSAK's slice 1

- **Faraday** — open-source pentest collaboration platform. Closer to slice 2/3 territory but worth knowing. reconFTW integrates with Faraday for reporting, which is a data point.
- **PlexTrac** — commercial pentest reporting. Overlaps with slice 1's report layer specifically.

### Direct overlap with CSAK's slice 2 (orchestration)

- **AttackForge** — commercial pentest management with workflow automation.
- **Nemesis** (SpecterOps) — post-exploitation data platform, worth knowing if it has any slice-2 overlap.

### Adjacent — what we're explicitly NOT building

- **Splunk** — what CSAK is not. But understanding why analysts use it (and what they hate about it) is informative.
- **Wazuh** — open-source SIEM. CSAK reads its output, doesn't replace it. Useful to articulate the boundary.
- **Tenable.io / Nessus Manager** — commercial vuln management. CSAK consumes Nessus output but isn't a Nessus replacement.

### LLM-powered upstarts

- At least one. Whatever the loudest "AI-powered security analyst" startup is right now. Useful as a check on what *not* to do (specifically, what over-LLM-ing looks like in this space). Horizon3's NodeZero and XBOW are candidates to study.

## Key takeaways so far

From the first two analyses, the leverage study, and the build-vs-adapt decision:

1. **Slice 1 has a real competitor.** DefectDojo is mature, free, and widely adopted. CSAK's differentiation must be concrete (CLI, on-demand, narrative reports, clean JSON export designed for future LLM use) — not "we built a better one."
2. **Slice 2 has a mature free competitor.** reconFTW covers most of what slice 2 proposes. Before slice 2 begins, we need an explicit answer: replace, augment, or integrate.
3. **Foreign-JSON ingest is a slice 2 opportunity, not slice 1.** DefectDojo JSON and reconFTW `report/report.json` are both natural ingest formats CSAK could accept — license-safe under any interpretation — but slice 1 stays scoped to the five committed tool formats. The parser architecture is plugin-shaped so these add without core surgery when slice 2 design opens.
4. **Build the code ourselves.** Both projects' code is architecturally coupled to decisions we've explicitly rejected (Django webapp, bash orchestration). Extraction costs more than rewriting. The valuable takings are data, content, and configuration — not code.
5. **Adapt non-code artifacts with attribution.** DefectDojo's severity tables and CWE remediation templates (adopted into slice 1); reconFTW's tool invocation flag sets (slice 2 material). These are small, proven, and expensive to reproduce from scratch.
6. **reconFTW's license is ambiguous in the repo.** LICENSE file says MIT, README says GPL-3.0. Worth resolving before shipping anything that depends on the interpretation, but doesn't affect the build-vs-adapt recommendation (we're not forking either way).

## Related

- [[product/vision|Vision]]
- [[product/scope|Scope]]
- [[specs/slice-1|Slice 1 Spec]]
- [[research/README|Research process]]
