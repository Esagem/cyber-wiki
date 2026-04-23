---
title: "Leverage Analysis — DefectDojo and reconFTW"
category: competitive
tags: [leverage, feasibility, licensing, scope-fit]
status: draft
confidence: medium
owner: shared
created: 2026-04-23
updated: 2026-04-23
sources:
  - "[[competitive/defectdojo]]"
  - "[[competitive/reconftw]]"
---

# Leverage Analysis — DefectDojo and reconFTW

## Purpose

Answer three questions concretely, per tool:

1. **Can CSAK leverage this tool?** What are the available strategies?
2. **Do the licenses allow it?** What does each strategy require?
3. **Does this actually meet CSAK's scope, or are there gaps?**

This page is explicitly scoped to the two tools analyzed so far. It will expand as more competitive pages are written.

## Leverage strategies — definitions

There are four meaningful ways CSAK can "leverage" another tool, with very different legal, technical, and maintenance implications:

| Strategy | What it means | Legal weight |
|----------|---------------|--------------|
| **Fork / embed** | CSAK includes (some or all of) the tool's source code in its own repo. Derivative work. | High — triggers full license terms. |
| **Library import** | CSAK imports the tool as a package dependency (`pip install`, etc.). | Medium — depends on license; copyleft can propagate. |
| **Subprocess invocation** | CSAK runs the tool as an external binary/script (`subprocess.run(...)`). | Low — generally accepted as non-derivative for both MIT/BSD and GPL. |
| **Output parsing** | CSAK reads the tool's output files or API responses. No execution or inclusion. | Negligible — this is just "reading data." |

Strategies closer to the top require more from the tool's license. Strategies closer to the bottom are safe under virtually any open-source license.

---

## DefectDojo

**License: BSD 3-Clause** — permissive, well-understood, explicitly allows commercial use and proprietary modifications as long as the copyright notice and license text are preserved. No copyleft.

### Strategy 1: Fork / embed

**Legal:** Fully permitted. CSAK can copy DefectDojo source code into its own repo, modify it, and release CSAK under any license (including proprietary) as long as the BSD 3-Clause notice is preserved for the copied portions.

**Technical feasibility:** Low. DefectDojo is a ~100k+ LOC Django web application with hard dependencies on PostgreSQL, Redis, Celery, and a complex migration history. The code is tightly coupled to Django's ORM and the web framework lifecycle. Extracting useful standalone pieces would require substantial rewriting — at which point we've essentially rewritten them ourselves.

**What's actually useful to copy:**

- **Tool parsers.** DefectDojo has ~200 parser classes in `dojo/tools/`. Each parser handles one scanner's output format. The parsers themselves are reasonably self-contained Python classes. Nessus, Nuclei, and generic CSV parsers in particular could potentially be adapted.
- **Dedup logic.** DefectDojo has mature deduplication engines keyed on various fields per tool. The dedup philosophy is worth studying even if we don't copy code.
- **CWE-keyed finding templates.** Data rather than code — the template content has value.

**Recommendation:** **Don't fork, but study the parsers as reference implementations.** Parser logic for scanner output formats is roughly common-knowledge — the scanner's format is public, DefectDojo's parser is one correct interpretation of it, but CSAK writing its own parser for the same format isn't legally or technically constrained by DefectDojo's approach. Where DefectDojo's parser has solved a subtle edge case (XML encoding quirks, missing fields, version differences), use that as test-case material for CSAK's own implementation.

### Strategy 2: Library import

**Legal:** Permitted. BSD 3-Clause works fine as a Python dependency.

**Technical feasibility:** Very low. DefectDojo isn't packaged as a library — it's packaged as a Django application. Importing its modules standalone pulls in Django, Postgres drivers, Celery, and the full web stack. Not practical.

**Recommendation:** **No.** DefectDojo's architecture doesn't support this, and retrofitting it would be more work than writing CSAK's core features from scratch.

### Strategy 3: Subprocess invocation

**Legal:** Fully permitted, no question.

**Technical feasibility:** Not applicable in the useful sense. DefectDojo is a server, not a CLI. You don't "invoke" DefectDojo — you POST to its REST API. That's integration-via-API, a separate category.

**Adjacent option — API integration:** CSAK could push findings into a running DefectDojo instance via its REST API, or pull findings from one. This treats DefectDojo as the system of record and CSAK as a specialized analyst-side client. Legally fine. Architecturally, it **changes what CSAK is** — now CSAK depends on a DefectDojo instance existing somewhere, which undercuts the zero-deployment CLI positioning.

**Recommendation:** **Optional integration, not a core dependency.** An opt-in "push to DefectDojo" export adapter in slice 2+ would be valuable for users who already run DefectDojo. Requiring one would destroy CSAK's core value prop.

### Strategy 4: Output parsing

**Legal:** Negligible concern. Reading data files is not a derivative work.

**Technical feasibility:** High. DefectDojo can export findings as JSON, PDF, or AsciiDoc reports. The JSON export is well-structured and CSAK could ingest it as a foreign-format input alongside the native tool formats.

**Recommendation:** **Yes, but deferred out of slice 1.** Slice 1 commits to five tool formats (Nuclei, Nessus, Zeek, osquery, Subfinder + httpx) and deliberately excludes broader ingest coverage until the pipeline is proven end-to-end. DefectDojo's JSON export is a natural early slice 2 add. The slice 1 spec's parser architecture is plugin-shaped so adding this later is not core surgery.

### DefectDojo scope fit

| CSAK need | DefectDojo covers? | Gap |
|-----------|-------------------|-----|
| Slice 1: ingest Nessus, Nuclei, Subfinder+httpx | ✅ native parsers | None directly, but parsers are embedded in Django, not extractable. |
| Slice 1: ingest Zeek network telemetry | ❌ | DefectDojo is vuln-focused, not network-telemetry-focused. |
| Slice 1: ingest osquery host telemetry | ❌ | Same — host telemetry is out of scope for DefectDojo. |
| Slice 1: dedup across tools and runs | ✅ mature | Dedup is one of DefectDojo's strongest features. |
| Slice 1: multi-axis triage (severity × confidence × target_weight × probability_real) | ⚠️ partial | DefectDojo has severity normalization and risk ratings but not confidence, target_weight, or probability_real as independent axes. |
| Slice 1: narrative client-facing fix-it tickets | ❌ | DefectDojo reports are tool-output-grouped, not narrative. |
| Slice 1: Scan-level lineage (FindingScanOccurrence) | ⚠️ partial | DefectDojo's Engagement/Test layer provides similar grouping but with different semantics. |
| Slice 1: stateless reports with clean JSON export for future LLM | ❌ | DefectDojo persists reports; LLM features are behind the Pro paywall. |
| Slice 2: tool orchestration | ❌ | Out of DefectDojo's scope entirely. |
| Slice 3: recursion with budgets | ❌ | Out of DefectDojo's scope entirely. |

**Key gap:** DefectDojo covers roughly half of slice 1's ingest surface but nothing of the differentiating layer (four-axis triage, narrative reports, clean JSON export designed for future LLM use, zero-deployment CLI). Its architectural bulk makes it an unsuitable foundation to build the differentiators on top of.

---

## reconFTW

**License: AMBIGUOUS.** See the note in [[competitive/reconftw|reconFTW analysis]]. The repo's `LICENSE` file says MIT; the README and docs say GPL-3.0; third-party trackers disagree. This ambiguity must be resolved before any strategy that requires including reconFTW code. Strategies that don't require code inclusion are safe under either interpretation.

### Strategy 1: Fork / embed

**Legal:**

- If MIT: fully permitted, no copyleft.
- If GPL-3.0: CSAK must also be GPL-3.0 (or compatible). This is a significant constraint — it forecloses proprietary licensing and affects dependency compatibility.

**Technical feasibility:** Low. reconFTW is thousands of lines of bash orchestration. Porting to Python/Go is essentially a rewrite — you'd keep the *logic* but none of the *code*. And rewriting based on reading GPL'd code is a gray area that conservative legal interpretations treat as derivative work.

**Recommendation:** **Don't fork.** Even if MIT turns out to be the correct license, the bash code isn't what we'd want in CSAK — the *design* is interesting, the implementation is an architecture we've explicitly rejected (bash vs typed language).

### Strategy 2: Library import

**Legal/technical:** Not applicable. reconFTW is a bash script, not an importable library.

### Strategy 3: Subprocess invocation

**Legal:** Permitted under both MIT and GPL-3.0. GPL's viral clause applies to combining code, not to running separate programs. Shelling out to `reconftw.sh` is the canonical "allowed" pattern.

**Technical feasibility:** High. reconFTW has a well-defined CLI (`./reconftw.sh -d target.com -r`), exits with status codes, and produces output in a known directory structure. CSAK can invoke it and wait for completion.

**Constraints:**

- reconFTW requires its installer to have run (`./install.sh`) — ~80 external tools must be present. This is a heavy dependency that CSAK users may not have installed.
- reconFTW scans can take hours. Blocking the CSAK CLI waiting for reconFTW completion violates CSAK's on-demand real-time posture.
- reconFTW assumes network access and target permission — CSAK invoking it must carry the user's scan authorization forward cleanly.

**Recommendation:** **Optional mode, not a default.** CSAK slice 2 could support "if reconFTW is installed, you can delegate recon to it." Users who already have reconFTW get an easy upgrade path; users who don't aren't forced to install it.

### Strategy 4: Output parsing

**Legal:** Negligible concern under either license. Reading `report/report.json` is not a derivative work.

**Technical feasibility:** High. reconFTW produces `report/report.json` as a consolidated structured output at the end of a scan. CSAK could parse it as a foreign-format input.

**Recommendation:** **Yes, but deferred out of slice 1.** Same reasoning as DefectDojo JSON. Slice 1 sticks to the five committed formats; reconFTW JSON is a natural early slice 2 add, particularly if slice 2 ends up integrating with reconFTW as an orchestration backend.

### reconFTW scope fit

| CSAK need | reconFTW covers? | Gap |
|-----------|-----------------|-----|
| Slice 1: ingest Nessus | ❌ | reconFTW doesn't touch Nessus. |
| Slice 1: ingest Nuclei, Subfinder+httpx | ✅ native | Produces output we could parse. |
| Slice 1: ingest Zeek | ❌ | Out of reconFTW's scope. |
| Slice 1: ingest osquery | ❌ | Out of reconFTW's scope. |
| Slice 1: cross-tool dedup | ⚠️ partial | reconFTW dedups within its own pipeline but not across external tool outputs. |
| Slice 1: multi-axis triage | ❌ | reconFTW has a simpler "hotlist" scoring. |
| Slice 1: narrative fix-it tickets | ❌ | `reconftw_ai` attempts summaries but is early-stage and opt-in. |
| Slice 2: tool orchestration | ✅ mature | reconFTW is the reference implementation for this. |
| Slice 2: adaptive rate limiting | ✅ built-in | `--adaptive-rate` flag. |
| Slice 2: quick rescan pattern | ✅ built-in | `--quick-rescan` flag. |
| Slice 3: recursion | ✅ native | This is what reconFTW's pipeline is. |
| Slice 3: distributed execution | ✅ Ax Framework | Out of CSAK's current scope but proven by reconFTW. |

**Key gap:** reconFTW is offensive-only. An analyst doing both offensive (reconFTW) and defensive (osquery, Zeek) work still needs something to ingest the defensive side and unify triage across both. **That's CSAK.**

---

## Combined picture — can CSAK leverage both?

**Yes, and they're complementary.** The shape:

1. **Slice 1 stays tightly scoped.** Five committed tool formats, no foreign-JSON ingest, no subprocess integration. Proves the pipeline end to end.
2. **Slice 2 is where both tools become directly relevant.** DefectDojo JSON ingest and reconFTW `report/report.json` ingest are natural early slice 2 adds — each one's a new parser consuming the slice 1 pipeline. Subprocess invocation of reconFTW becomes a candidate orchestration backend. Push-integration with a running DefectDojo server becomes a candidate export path.
3. **Neither tool should ever be a runtime dependency.** CSAK runs on its own; the integrations are opt-in escape hatches.
4. **The slice 2 orchestration question is open.** Whether slice 2 builds its own orchestrator, delegates to reconFTW, or supports both is not yet decided — it's tracked in [[synthesis/open-questions|open-questions]] as a slice 2 question and settled when slice 2 design opens.

## Scope gaps that neither tool closes

Even with both tools fully leveraged, CSAK still has to build:

- **Zeek and osquery ingest.** Neither DefectDojo nor reconFTW handles network or host telemetry. This is CSAK-native work and a slice 1 commitment.
- **Four-axis triage (severity × confidence × target_weight × probability_real).** DefectDojo has severity; reconFTW has a thin hotlist. Neither has confidence, target_weight, or probability_real as independent axes.
- **Narrative, client-facing fix-it ticket reports.** Both tools produce data-dump reports. The narrative format is CSAK's differentiation and must be built from scratch.
- **Clean JSON export designed for future LLM consumption.** DefectDojo gates LLM behind Pro; reconFTW's `reconftw_ai` is early and opt-in. Slice 1's first-class JSON export is the architectural seam for the LLM layer; neither competitor offers something equivalent.
- **The zero-deployment CLI experience.** Neither tool delivers this. DefectDojo requires a server stack; reconFTW requires its dependency installer to succeed. CSAK's single-binary CLI story is not available to inherit.

## Recommendations — what to do next

1. **Resolve reconFTW license ambiguity.** Open a GitHub issue on the reconFTW repo (or email six2dez) asking for clarification. Until resolved, treat reconFTW as GPL-3.0 for any strategy beyond subprocess-invocation or output-parsing.
2. **Do not add foreign-JSON ingest to slice 1.** DefectDojo JSON and reconFTW JSON are slice 2 material — the slice 1 parser architecture is plugin-shaped so adding them later is straightforward.
3. **Defer the "fork vs integrate reconFTW" question.** It becomes active when slice 2 design opens. Tracked in [[synthesis/open-questions|open-questions]].
4. **Do not fork either project.** Both are architecturally unsuitable foundations for CSAK, even setting aside license concerns. See [[competitive/build-vs-adapt|build-vs-adapt]] for the full argument.

## Related

- [[competitive/defectdojo|DefectDojo]]
- [[competitive/reconftw|reconFTW]]
- [[competitive/build-vs-adapt|Build vs Adapt]]
- [[competitive/README|Competitive Analysis Index]]
- [[synthesis/open-questions|Open Questions]]
- [[specs/slice-1|Slice 1 Spec]]
