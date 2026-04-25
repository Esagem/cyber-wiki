---
title: "Build vs Adapt — DefectDojo and reconFTW"
category: competitive
tags: [build-vs-buy, decision-input, feasibility, slice-1, slice-2]
status: active
confidence: high
owner: shared
created: 2026-04-23
updated: 2026-04-25
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
- Cheaper than rewriting? **Probably not worth a literal copy.** Their parsers return DefectDojo's `Finding` object; ours needs to return CSAK's `Finding` entity with the three-axis scoring shape (severity × confidence × target_weight). The parsing *logic* transfers, but the output shape doesn't.
- **Recommendation: study, don't copy.** Read each parser to understand the landmines. Write CSAK's own parser fresh. Where DefectDojo's parser has solved a subtle edge case (e.g. Nessus's optional `port` attribute, Nuclei's shifting field names), use that as a test case for CSAK's implementation.

**Dedup engine.**
- Self-contained? **No.** Dedup is distributed across Finding model methods, configuration, and the ORM.
- Solves a hard problem? Yes — dedup is subtle and the per-tool dedup keys matter.
- Cheaper than rewriting? **No.** By the time we untangle the ORM, we've rewritten it.
- **Recommendation: inspiration only.** Read their dedup-key choices per tool — that's transferable knowledge. Implement fresh against CSAK's data model. (Slice 1 already shipped this.)

**Severity normalization tables.**
- Self-contained? Yes — these are essentially data, not code.
- **Recommendation: use as a starting point for CSAK's own tables.** Cite DefectDojo as the source. (Slice 1 already shipped this for the five starter tools.)

**Django web application (views, URLs, admin, UI).**
- Irrelevant. CSAK is CLI. **Ignore entirely.**

**CWE-keyed remediation templates.**
- Self-contained text content, not code. Writing good remediation advice across hundreds of CWEs is a lot of work.
- **Recommendation: adapt the template content as a starting point for CSAK's fix-it ticket library, with attribution.** (Slice 1 ships ~10–15 high-frequency CWEs from the starter tools.)

### reconFTW

**The orchestration pipeline** (`reconftw.sh` and `modules/*.sh`).

The first version of this analysis (2026-04-23) framed reconFTW's orchestration as "valuable design we should learn from architecturally." The case study in [[competitive/reconftw|reconFTW]] (2026-04-24) corrected that framing. The honest reading of the source is:

- reconFTW does **not** have intelligent runtime tool selection. For each category (subdomain enumeration, web detection, vuln scanning) it runs **all enabled tools** in a fixed order and dedups the union.
- The "selection" is a config-file decision: ~300 boolean knobs in `reconftw.cfg`, with mode flags (`-r`, `-z`, `-a`) that flip pre-curated groups of those booleans.
- The pipeline ordering is hard-coded (subfinder → puredns → httpx → nuclei).
- The actual intellectual property is **the recipes** — the specific flag combinations for each tool — not the orchestration logic.

Updated assessment:

- Self-contained? No — bash with implicit environment assumptions.
- Solves a hard problem? **The recipes do; the orchestration logic is straightforward.** What looks like "complex orchestration" is mostly a long bash pipeline with dedup-on-merge.
- Quality bar? Below CSAK's target (bash, no types, no tests).
- Cheaper than rewriting? **The orchestration is cheap to write fresh; the recipes are expensive to reproduce from scratch.** Build the orchestrator, adapt the recipes.
- **Recommendation: build the orchestration ourselves, adapt the recipes with attribution.** Treat reconFTW's modules as a documentation source for "what flags to pass each tool in each context." Write CSAK's slice 2 orchestrator in Python from scratch — the pipeline shape is straightforward (subprocess runner + stage sequencer + dedup-on-merge, ~500-1000 LOC). Deliberately *do not* copy reconFTW's 300-knob config model; ship a small handful of curated modes with a sensible default instead.

**Tool invocation recipes** (the specific flags reconFTW passes to each tool).
- Self-contained? Yes — these are individual command strings.
- Solves a hard problem? **Yes, and underrated.** Knowing that Nuclei needs `-severity critical,high,medium -jsonl` for useful output, or that Subfinder wants `-all -silent`, or that httpx needs specific flags to behave well chained after Subfinder — this is accumulated knowledge that took six2dez years to settle.
- Cheaper than rewriting? **Yes, by a lot.** Documenting "CSAK invokes Nuclei with these flags" is cheap; figuring out the right flags from scratch is not.
- **Recommendation: adapt these as documented defaults in CSAK's slice 2 tool catalog with attribution.** This is the highest-leverage thing CSAK can take from reconFTW. Each tool entry in the slice 2 catalog should carry a `# source: reconFTW v4.0 modules/<file>.sh` comment.

**`report/report.json` schema** (the consolidated output structure).
- We aren't copying code here — we're reading their output. License-safe under any interpretation.
- **Recommendation: optional, not on the slice 2 critical path.** The 2026-04-23 leverage analysis framed reconFTW JSON ingest as a natural slice 2 add. The case study changes that: if CSAK has its own orchestrator that produces native CSAK Findings via the slice 1 ingest pipeline, the analyst doesn't need to bring reconFTW JSON to CSAK — they just use CSAK directly. reconFTW JSON ingest stays viable as an optional adapter for analysts who already run reconFTW and want to point CSAK at their existing output, but it's no longer the load-bearing slice 2 deliverable. Defer indefinitely; revisit if a real analyst needs it.

**`reconftw_ai` report generation** (local Ollama integration).
- The problem is "how do you get useful narrative from structured findings without hallucination." reconFTW's approach is early-stage and not yet mature.
- **Recommendation: ignore.** Slice 1 of CSAK explicitly contains no LLM use; it ships a clean JSON export designed as the interface for a future LLM layer. When that later slice opens, CSAK will prototype LLM use over its own structured output — not over reconFTW's.

**Distributed scanning via Ax Framework.**
- Out of CSAK's scope for slice 1 and 2. Worth knowing exists. **Ignore for now.**

## Summary matrix

| Component | Adapt code? | Take inspiration? | Ignore? |
|-----------|-------------|-------------------|---------|
| DefectDojo — tool parsers | | ✅ | |
| DefectDojo — dedup engine | | ✅ | |
| DefectDojo — severity tables | ✅ (data, not code) | | |
| DefectDojo — CWE remediation templates | ✅ (content, slice 1) | | |
| DefectDojo — Django web app | | | ✅ |
| reconFTW — orchestration pipeline | | (limited — pipeline shape only) | |
| reconFTW — **tool invocation recipes** | ✅ (config, slice 2 — **highest-leverage adaptation**) | | |
| reconFTW — `report/report.json` ingest | optional, low priority | | |
| reconFTW — `reconftw_ai` | | | ✅ |
| reconFTW — Ax Framework | | | ✅ |
| reconFTW — 300-knob config model | | | ✅ (deliberately reject) |

## The honest recommendation

**Build the core ourselves. Adapt content and configuration where it's clearly data, not code. Take architectural inspiration freely.**

Specifically:

1. **Write CSAK's code fresh.** Parsers, triage, dedup, reporting, orchestration — all of it. The architectural win (clean four-layer data model, three-axis scoring, narrative reports, CLI-first, stateless report exports with a clean JSON seam for a future LLM layer) requires a code structure that neither DefectDojo nor reconFTW is shaped for.

2. **Adapt data and content with attribution.** DefectDojo's severity mapping tables and CWE remediation templates are content, not code. Slice 1 already shipped this.

3. **Adapt configuration with attribution.** reconFTW's specific tool invocation flags (Nuclei, Subfinder, httpx) are small, proven, and hard to reproduce from scratch. Document them in CSAK's slice 2 tool catalog as defaults with a `# source: reconFTW v4.0 modules/<file>.sh` comment. **This is now the primary thing CSAK takes from reconFTW.**

4. **Take design-level inspiration without any copying.** Both projects have made years of mistakes we can skip. Read their code, read their issue trackers, understand the gotchas — then write CSAK's version knowing the landmines.

5. **Don't try to extract code from either.** In both cases, the valuable code is entangled with architectural decisions we've chosen to make differently. Extraction costs more than rewriting.

6. **Deliberately reject the 300-knob config model.** reconFTW's "intelligence-by-knob" approach overwhelms non-power-users. CSAK ships with a small handful of curated modes plus a single sensible default; adds knobs only when they earn their place.

## Why not fork and evolve?

An alternative path — fork DefectDojo, rip out the Django shell, evolve it into CSAK — exists and is legally fine. Reasons this is still a bad idea:

- **The data model mismatch is fundamental.** DefectDojo is Product → Engagement → Test → Finding with Endpoints alongside. CSAK is Org → Target → Scan → Finding plus Artifact, with stateless (non-entity) reports. Reshaping DefectDojo to match would touch every file.
- **The architectural thesis is inverted.** DefectDojo is a persistent server with scheduled ingests. CSAK is a CLI with on-demand runs.
- **Maintenance burden compounds.** Every DefectDojo release would force a rebase decision.
- **The parts that matter most are the parts we'd rewrite anyway.** Triage (because we're adding confidence and target_weight as independent axes alongside severity), reports (because narrative fix-it tickets and stateless exports aren't DefectDojo's output shape), CLI (because DefectDojo doesn't have one), the JSON seam for a future LLM layer (because DefectDojo gates LLM behind Pro).

The same reasoning applies to reconFTW with two added problems: (1) it's bash, which we've rejected as an implementation language, and (2) the orchestration logic itself isn't worth porting — only the recipes are.

## What slice 2 actually adopted from this analysis

This section was originally written as forward-looking guidance to a slice-2-designer. With slice 2 now built (per Eli, 2026-04-25), it's been rewritten as a retrospective. The authoritative record is the [[specs/slice-2|slice 2 spec]] and the slice 2 implementation; this is the build-vs-adapt page's view of what actually got adopted.

- **Tool catalog as Python module per tool.** The original guidance proposed `config/tools/<tool>.yaml`. Slice 2 chose Python modules under `csak/collect/tools/<tool>.py` instead — each tool needs real logic (`applies_to(target_type)` predicates, conditional flag building, tool-specific stderr pattern matching) that YAML can't express without growing an ugly schema. Reversal to YAML stays cheap if the catalog grows past ~10 tools.
- **Three orchestrated tools, not four.** The original guidance proposed "Nuclei, Subfinder, httpx, possibly Nessus via API." Slice 2 shipped with Subfinder + httpx + Nuclei. Nessus via API was deferred to slice 2.5+ (meaningful integration work; value not proven until slice 2 is in real use). Tracked in [[synthesis/deferred-features|deferred-features]].
- **Three modes (`quick`, `standard`, `deep`).** The original guidance proposed "a small set (probably 2-4 modes — something like `quick`, `standard`, `deep`)." The exact prediction shipped: three modes plus per-tool overrides at the CLI, no 300-knob config. `quick` mode skips Nuclei entirely (the only case where mode affects which tools run rather than how they run).
- **Adaptive rate limiting default-on.** Adopted from reconFTW's pattern as predicted. Floor 1 req/s, ceiling per-tool starting rate, ~100-200 LOC wrapper. Tool-specific signal detection (e.g. Nuclei surfaces target rate-limiting as `[WRN] context deadline exceeded` rather than a clean 429).
- **reconFTW recipes adapted with attribution.** The slice 2 catalog modules carry `# source: reconFTW v4.0 modules/<file>.sh` comments where recipes were adapted. CSAK has no runtime dependency on reconFTW.
- **Quick rescan pattern — deliberately rejected.** The original guidance proposed adopting reconFTW's quick-rescan pattern (skip heavy stages when no new assets are discovered). Slice 2 rejected it: every `csak collect` invocation runs the full pipeline fresh, and the slice 1 dedup layer prevents data pollution from re-running. May revisit in a later slice if it earns its place — tracked in [[synthesis/deferred-features|deferred-features]].

The build-vs-adapt thesis held up well in retrospect: the recipes (data) were the high-leverage adaptation, the orchestration code (logic) was straightforward to write fresh, and the 300-knob config model was correctly rejected.

## A central references page

A `research/references.md` page should catalog which external projects have contributed ideas or data to CSAK, so attribution is in one place instead of scattered across spec sections. The trigger condition ("add when the first reconFTW recipe lands in the slice 2 tool catalog") has fired — slice 2 catalog modules carry reconFTW recipe attributions per the spec. Tracked as a polish item in [[synthesis/deferred-features|deferred-features]] which is now the canonical home for this kind of cross-page deferral.

## Related

- [[competitive/defectdojo|DefectDojo]]
- [[competitive/reconftw|reconFTW]]
- [[competitive/leverage-analysis|Leverage Analysis]]
- [[competitive/README|Competitive Analysis Index]]
- [[specs/slice-1|Slice 1 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[specs/slice-3|Slice 3 Spec]]
- [[synthesis/deferred-features|Deferred Features]]
- [[synthesis/open-questions|Open Questions]]
