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

| Tool | Status | Verdict |
|------|--------|---------|
| [[competitive/defectdojo\|DefectDojo]] | active | Closest competitor to slice 1. Mature, widely adopted, heavy deployment. CSAK wins on zero-deployment CLI, real-time invocation, narrative fix-it reports, and open-source LLM use. |
| [[competitive/reconftw\|reconFTW]] | active | Competitor for slices 2–3, not 1. Covers tool orchestration + recursion + OSINT. Slice 1 could even accept reconFTW output as an input format. |

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

From the first two analyses:

1. **Slice 1 has a real competitor.** DefectDojo is mature, free, and widely adopted. CSAK's differentiation must be concrete (CLI, on-demand, narrative reports, open LLM use) — not "we built a better one."
2. **Slice 2 has a mature free competitor.** reconFTW covers most of what slice 2 proposes. Before slice 2 begins, we need an explicit answer: replace, augment, or integrate.
3. **Cross-slice opportunity.** CSAK could accept reconFTW output as a slice-1 input format, making CSAK immediately useful to reconFTW's existing user base without forcing them to switch.

## Related

- [[product/vision|Vision]]
- [[product/scope|Scope]]
- [[specs/slice-1|Slice 1 Spec]]
- [[research/README|Research process]]
