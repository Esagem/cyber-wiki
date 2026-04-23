---
title: "Build vs Adapt — DefectDojo and reconFTW"
category: competitive
tags: [build-vs-buy, decision-input, feasibility, slice-1]
status: draft
confidence: medium
owner: shared
created: 2026-04-23
updated: 2026-04-23
sources:
  - "[[competitive/defectdojo]]"
  - "[[competitive/reconftw]]"
  - "[[competitive/leverage-analysis]]"
---

# Build vs Adapt — DefectDojo and reconFTW

## Premise

For this analysis, assume the permissive interpretation of each license — DefectDojo is BSD 3-Clause (permissive, confirmed), and reconFTW is MIT per its `LICENSE` file. Under both, CSAK is legally free to copy, modify, and redistribute code with attribution.

The question is no longer "can we legally do this" — it's "is adapting their code actually better than writing our own?"

That decision is independent per component, not per tool. Some pieces are worth adapting; others aren't.

## How to decide — the framework

For any piece of existing code, adapting is better than writing fresh when **all four** of these are true:

1. **The code is self-contained.** It doesn't pull in half of the surrounding framework to be useful.
2. **The code solves a problem we'd otherwise have to solve from scratch.** Not "a problem we'd have to look up how to solve" — a problem where the gotchas and edge cases are real work, and the existing solution has paid that cost.
3. **The code's quality is at or above the bar we'd hold our own code to.** Not just "does it work" — does it match the testing, typing, and structural standards we want for CSAK?
4. **Adapting is genuinely cheaper than rewriting.** Once you factor in: reading their code to understand it, understanding the implicit contracts, stripping their dependencies, re-testing for our contexts, and maintaining whatever we keep — is it really less work than writing our own cleanly?

If any of those four fails, **write fresh and take inspiration from their design instead.**

## Per-component analysis

### DefectDojo

**Tool parsers** (e.g. the Nessus XML parser, the Nuclei JSON parser).
- Self-contained? Mostly. Each parser is a Python class in `dojo/tools/<toolname>/parser.py` with a defined interface (`get_findings(file, test)`). They do import from `dojo.models` for the Finding object, but the parsing logic itself is reasonably isolated.
- Solves a hard problem? **Yes.** Every real scanner format has landmines — Nessus XML has malformed entity references in the wild, Nuclei's JSON structure has changed across versions, and so on. DefectDojo's parsers have absorbed ten years of those edge cases.
- Quality bar? Variable. Some parsers are tight; others are first-draft-that-worked. All are reasonable Python.
- Cheaper than rewriting? **Probably not worth a literal copy.** Their parsers return DefectDojo's `Finding` object; ours needs to return CSAK's `Finding` entity with the four-axis scoring shape (severity × confidence × target_weight × probability_real). The parsing *logic* transfers, but the output shape doesn't.
- **Recommendation: study, don't copy.** Read each parser to understand the landmines. Write CSAK's own parser fresh. Where DefectDojo's parser has solved a subtle edge case (e.g. Nessus's optional `port` attribute, Nuclei's shifting field names), use that as a test case for CSAK's implementation. This is "inspiration" in the most concrete form — we get the decade of bug reports without inheriting the code.

**Dedup engine.**
- Self-contained? **No.** Dedup is distributed across Finding model methods, configuration, and the ORM. You can't extract just the dedup without dragging Django along.
- Solves a hard problem? Yes — dedup is subtle and the per-tool dedup keys matter.
- Quality bar? Good, but architecture-coupled.
- Cheaper than rewriting? **No.** By the time we untangle the ORM, we've rewritten it.
- **Recommendation: inspiration only.** Read their dedup-key choices per tool — that's transferable knowledge. Implement fresh against CSAK's data model.

**Severity normalization tables.**
- Self-contained? Yes — these are essentially data, not code. The mapping from "Nessus Critical" to DefectDojo's unified scale is a small table.
- Solves a hard problem? Modestly. The thinking is more valuable than the specific numbers.
- Quality bar? Fine for what it is.
- Cheaper than rewriting? These are small enough that copying the data isn't really "copying code." **It's reference data, and CSAK needs its own anyway** because we're adding the confidence, target_weight, and probability_real axes that DefectDojo doesn't have.
- **Recommendation: use as a starting point for CSAK's own tables.** Cite DefectDojo as the source in the front matter of the triage-model spec.

**Django web application (views, URLs, admin, UI).**
- Irrelevant. CSAK is CLI. None of this transfers.
- **Recommendation: ignore entirely.**

**CWE-keyed remediation templates.**
- Self-contained? These are text content, not code.
- Solves a hard problem? Writing good remediation advice across hundreds of CWEs is a lot of work.
- Quality bar? Varies by template.
- Cheaper than rewriting? Yes — this is content, and the licensing allows redistribution with attribution.
- **Recommendation: adapt the template content as a starting point for CSAK's fix-it ticket library.** Attribute DefectDojo. Rewrite where our narrative style differs from theirs. Slice 1 ships with coverage for ~10–15 high-frequency CWEs from the starter tools, per the slice 1 spec.

### reconFTW

**The orchestration pipeline** (`reconftw.sh`'s stage-by-stage logic).
- Self-contained? No — it's thousands of lines of bash with implicit environment assumptions.
- Solves a hard problem? Yes — the *design* of the pipeline has absorbed a lot of real-world learning about what order to run tools, which flags actually work, and where things break.
- Quality bar? **Below CSAK's target.** It's bash. We've explicitly rejected bash as CSAK's implementation language for slice 2+ because we want typing, testing, and structural reliability.
- Cheaper than rewriting? No — porting bash to Python is not a mechanical translation; it's a redesign. The savings are in knowing the pipeline *shape*, not in reusing the code.
- **Recommendation: inspiration only, design-level.** Treat reconFTW as a reference architecture: study its module boundaries, its stage ordering, its rate-limiting behavior. Write CSAK's slice 2 orchestration fresh in the chosen typed language.

**Tool invocation recipes** (the specific flags reconFTW passes to each tool).
- Self-contained? Yes — these are individual command strings.
- Solves a hard problem? **Yes, and underrated.** Knowing that Nuclei needs `-severity critical,high,medium -jsonl` for useful output, or that Subfinder wants `-all -silent`, or that httpx needs specific flags to behave well chained after Subfinder — this is accumulated knowledge.
- Quality bar? Fine. They're just flag sets.
- Cheaper than rewriting? **Yes.** Documenting "CSAK invokes Nuclei with these flags" is cheap; figuring out the right flags from scratch is not.
- **Recommendation: adapt these as documented defaults in CSAK's slice 2 tool catalog.** These are closer to configuration than code, and only become relevant once CSAK runs tools itself.

**`report/report.json` schema** (the consolidated output structure).
- We aren't copying code here — we're reading their output. This is the output-parsing strategy from the leverage analysis, unchanged.
- **Recommendation: accept as an ingest format in slice 2.** Deferred out of slice 1, which stays scoped to the five committed tool formats. The slice 1 parser architecture is plugin-shaped so adding this later is not core surgery.

**`reconftw_ai` report generation** (local Ollama integration).
- Self-contained? Partially — it's a small module.
- Solves a hard problem? The problem is "how do you get useful narrative from structured findings without hallucination." reconFTW's approach is early-stage and, per their own documentation, not yet mature.
- Quality bar? Unproven.
- Cheaper than rewriting? No — we'd spend most of our time on prompt engineering anyway, and theirs isn't a finished product to build on.
- **Recommendation: ignore.** Slice 1 of CSAK explicitly contains no LLM use; it ships a clean JSON export designed as the interface for a future LLM layer. When that later slice opens, CSAK will prototype LLM use over its own structured output — not over reconFTW's. Their approach might become useful reference later but isn't load-bearing.

**Distributed scanning via Ax Framework.**
- Out of CSAK's scope for slice 1 and 2. Worth knowing exists. Not relevant to this decision.

## Summary matrix

| Component | Adapt code? | Take inspiration? | Ignore? |
|-----------|-------------|-------------------|---------|
| DefectDojo — tool parsers | | ✅ | |
| DefectDojo — dedup engine | | ✅ | |
| DefectDojo — severity tables | ✅ (data, not code) | | |
| DefectDojo — CWE remediation templates | ✅ (content, slice 1) | | |
| DefectDojo — Django web app | | | ✅ |
| reconFTW — orchestration pipeline | | ✅ | |
| reconFTW — tool invocation recipes | ✅ (config, slice 2) | | |
| reconFTW — `report/report.json` ingest | n/a (output parsing, slice 2) | | |
| reconFTW — `reconftw_ai` | | | ✅ |
| reconFTW — Ax Framework | | | ✅ |

## The honest recommendation

**Build the core ourselves. Adapt content and configuration where it's clearly data, not code. Take architectural inspiration freely.**

Specifically:

1. **Write CSAK's code fresh.** Parsers, triage, dedup, reporting — all of it. The architectural win (clean four-layer data model, four-axis scoring, narrative reports, CLI-first, stateless report exports with a clean JSON seam for a future LLM layer) requires a code structure that neither DefectDojo nor reconFTW is shaped for. Forking either means fighting their architecture forever.

2. **Adapt data and content with attribution.** DefectDojo's severity mapping tables and CWE remediation templates are content, not code. Use them as starting points for CSAK's equivalents, credit the source, and customize to match our voice and scoring model.

3. **Adapt configuration with attribution.** reconFTW's specific tool invocation flags (Nuclei, Subfinder, httpx) are small, proven, and hard to reproduce from scratch. Document them in CSAK's slice 2 tool catalog as defaults with a `# source: reconFTW v4.0` comment.

4. **Take design-level inspiration without any copying.** Both projects have made ten-ish years of mistakes we can skip. Read their code, read their issue trackers, understand the gotchas — then write CSAK's version knowing the landmines. This is the highest-leverage use of their existence.

5. **Don't try to extract code from either.** In both cases, the valuable code is entangled with architectural decisions we've chosen to make differently. Extraction costs more than rewriting, and the result would be a Frankenstein that doesn't fit CSAK's shape.

## Why not fork and evolve?

An alternative path — fork DefectDojo, rip out the Django shell, evolve it into CSAK — exists and is legally fine. Reasons this is still a bad idea:

- **The data model mismatch is fundamental.** DefectDojo is Product → Engagement → Test → Finding with Endpoints alongside. CSAK is Org → Target → Scan → Finding plus Artifact, with stateless (non-entity) reports. Reshaping DefectDojo to match would touch every file.
- **The architectural thesis is inverted.** DefectDojo is a persistent server with scheduled ingests. CSAK is a CLI with on-demand runs. These aren't adjustments of the same system; they're different systems.
- **Maintenance burden compounds.** Every DefectDojo release would force a rebase decision. We'd be maintaining two divergent codebases forever, or committing to tracking upstream.
- **The parts that matter most are the parts we'd rewrite anyway.** Triage (because we're adding confidence, target_weight, and probability_real as independent axes), reports (because narrative fix-it tickets and stateless exports aren't DefectDojo's output shape), CLI (because DefectDojo doesn't have one), the JSON seam for a future LLM layer (because DefectDojo gates LLM behind Pro).

The same reasoning applies to reconFTW — with the added problem that it's bash, which we've rejected as an implementation language.

## What this means for the slice 1 spec

This analysis supports (rather than challenges) the current slice 1 approach. Concrete outputs:

- **DefectDojo's severity mapping tables** will be cited as source material for CSAK's per-tool severity translation tables under `config/triage/severity/<tool>.yaml`, when those are built during slice 1 implementation.
- **DefectDojo's CWE remediation templates** will be cited as source material for CSAK's slice 1 fix-it ticket template library (~10–15 high-frequency CWEs).
- **reconFTW's tool invocation flag sets** will be cited when slice 2's tool catalog takes shape — not a slice 1 concern.
- **A central `research/references.md` page** should catalog which external projects have contributed ideas or data to CSAK, so attribution is in one place instead of scattered across spec sections. Low priority; add when the first piece of adapted content actually lands in the repo.

No existing decisions change. This is a "stay the course" recommendation with permission to borrow specific non-code artifacts along the way.

## Related

- [[competitive/defectdojo|DefectDojo]]
- [[competitive/reconftw|reconFTW]]
- [[competitive/leverage-analysis|Leverage Analysis]]
- [[competitive/README|Competitive Analysis Index]]
- [[specs/slice-1|Slice 1 Spec]]
- [[synthesis/open-questions|Open Questions]]
