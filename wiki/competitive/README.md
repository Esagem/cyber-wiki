---
title: "Competitive Analysis — Index & Format"
category: competitive
tags: [competitive, meta, process]
status: active
confidence: high
owner: shared
created: 2026-04-22
updated: 2026-04-22
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

## Initial target list

Pages to write, in rough priority order. None exist yet — these are the ones the slice 1 work surfaced as needing analysis before we lock in design choices.

### Direct overlap with CSAK's slice 1

- **DefectDojo** — open-source vuln management. Closest existing analog to CSAK's slice 1 scope. Inevitable to study.
- **Faraday** — open-source pentest collaboration platform. Closer to slice 2/3 territory but worth knowing.
- **PlexTrac** — commercial pentest reporting. Overlaps with slice 1's report layer specifically.

### Direct overlap with CSAK's slice 2 (orchestration)

- **reconFTW** — opinionated bash-based recon orchestrator. Open source. Direct competitor to slice 2's "automate the recon toolkit" job.
- **AttackForge** — commercial pentest management with workflow automation.

### Adjacent — what we're explicitly NOT building

- **Splunk** — what CSAK is not. But understanding why analysts use it (and what they hate about it) is informative.
- **Wazuh** — open-source SIEM. CSAK reads its output, doesn't replace it. Useful to articulate the boundary.
- **Tenable.io / Nessus Manager** — commercial vuln management. CSAK consumes Nessus output but isn't a Nessus replacement.

### LLM-powered upstarts

- At least one. Whatever the loudest "AI-powered security analyst" startup is right now. Useful as a check on what *not* to do (specifically, what over-LLM-ing looks like in this space).

## Index

| Tool | Status | Verdict |
|------|--------|---------|
| _empty — populate as pages are written_ | | |

## Related

- [[product/vision|Vision]]
- [[product/scope|Scope]]
- [[specs/slice-1|Slice 1 Spec]]
- [[research/README|Research process]]
