---
title: "Competitive Analysis — Index & Format"
category: competitive
tags: [competitive, meta, process]
status: active
confidence: high
owner: shared
created: 2026-04-22
updated: 2026-04-25
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
| [[competitive/reconftw\|reconFTW]] | active | Reference, not dependency. Case study revealed reconFTW does not have intelligent tool selection — it runs all enabled tools in a fixed pipeline with ~300 config knobs. Real value is the recipes (specific tool flag combinations); slice 2 adapts these with attribution and ships its own simple typed orchestrator. License ambiguity (MIT vs GPL-3.0) no longer blocks anything since CSAK has no runtime dependency. |
| [[competitive/leverage-analysis\|Leverage Analysis]] | active | Per-tool, per-strategy feasibility. Bottom line: foreign-JSON ingest (DefectDojo and reconFTW) deferred indefinitely; don't fork either; slice 2 question resolved (build our own orchestrator, adapt recipes with attribution). |
| [[competitive/build-vs-adapt\|Build vs Adapt]] | active | Assuming permissive licenses, should we adapt code or write fresh? Verdict: build the code ourselves, adapt data/content/config with attribution, take design inspiration freely. The reconFTW recipes are slice 2's primary adaptation target. |

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

From the analyses, the leverage study, the build-vs-adapt decision, and the reconFTW case study:

1. **Slice 1 has a real competitor.** DefectDojo is mature, free, and widely adopted. CSAK's differentiation must be concrete (CLI, on-demand, narrative reports, clean JSON export designed for future LLM use) — not "we built a better one." Slice 1 has shipped on those differentiators.
2. **Slice 2's relationship to reconFTW is settled.** The [[competitive/reconftw|case study]] reframed it: reconFTW doesn't have intelligent runtime tool selection (it runs all enabled tools in a fixed pipeline with ~300 config knobs), so the choice isn't "replace, augment, or integrate" — it's "what should we adapt and what should we build?" Answer: build the orchestration ourselves, adapt the recipes from reconFTW with attribution. CSAK has no runtime dependency on reconFTW. See [[specs/slice-2|slice 2 spec]] and [[competitive/build-vs-adapt|build-vs-adapt]].
3. **Foreign-JSON ingest is deferred indefinitely.** Both DefectDojo and reconFTW JSON ingest were considered for slice 2 and dropped — slice 2's native orchestrator means analysts can use CSAK directly rather than bringing foreign JSON into CSAK. The parser architecture remains plugin-shaped so this can return if a real analyst needs it. Tracked in [[synthesis/deferred-features|deferred-features]].
4. **Build the code ourselves.** Both projects' code is architecturally coupled to decisions we've explicitly rejected (Django webapp, bash orchestration). Extraction costs more than rewriting. The valuable takings are data, content, and configuration — not code.
5. **Adapt non-code artifacts with attribution.** DefectDojo's severity tables and CWE remediation templates (adopted into slice 1); reconFTW's tool invocation flag sets (adopted into slice 2's tool catalog with `# source: reconFTW v4.0` comments). These are small, proven, and expensive to reproduce from scratch.
6. **reconFTW's license ambiguity no longer blocks anything.** LICENSE file says MIT, README says GPL-3.0. Worth resolving as a courtesy via a GitHub issue, but doesn't affect any CSAK decision since we have no runtime dependency. Demoted from "high priority resolution" to "courtesy / not blocking."

## Related

- [[product/vision|Vision]]
- [[product/scope|Scope]]
- [[specs/slice-1|Slice 1 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[research/README|Research process]]
