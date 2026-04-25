---
title: "Leverage Analysis — DefectDojo and reconFTW"
category: competitive
tags: [leverage, feasibility, licensing, scope-fit]
status: active
confidence: medium
owner: shared
created: 2026-04-23
updated: 2026-04-25
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

**Recommendation:** **Yes, but deferred.** Slice 1 stayed scoped to five tool formats. Slice 2 also deferred this — the native orchestrator removed the slice 2 motivation, and DefectDojo JSON ingest hasn't been requested by any real analyst. Re-evaluate if a real analyst actually wants to bring DefectDojo output into CSAK rather than running CSAK directly.

### DefectDojo scope fit

| CSAK need | DefectDojo covers? | Gap |
|-----------|-------------------|-----|
| Slice 1: ingest Nessus, Nuclei, Subfinder+httpx | ✅ native parsers | None directly, but parsers are embedded in Django, not extractable. |
| Slice 1: ingest Zeek network telemetry | ❌ | DefectDojo is vuln-focused, not network-telemetry-focused. |
| Slice 1: ingest osquery host telemetry | ❌ | Same — host telemetry is out of scope for DefectDojo. |
| Slice 1: dedup across tools and runs | ✅ mature | Dedup is one of DefectDojo's strongest features. |
| Slice 1: multi-axis triage (severity × confidence × target_weight) | ⚠️ partial | DefectDojo has severity normalization and risk ratings but not confidence or target_weight as independent axes. |
| Slice 1: narrative client-facing fix-it tickets | ❌ | DefectDojo reports are tool-output-grouped, not narrative. |
| Slice 1: Scan-level lineage (FindingScanOccurrence) | ⚠️ partial | DefectDojo's Engagement/Test layer provides similar grouping but with different semantics. |
| Slice 1: stateless reports with clean JSON export for future LLM | ❌ | DefectDojo persists reports; LLM features are behind the Pro paywall. |
| Slice 2: tool orchestration | ❌ | Out of DefectDojo's scope entirely. |
| Slice 3: recursion | ❌ | Out of DefectDojo's scope entirely. |

**Key gap:** DefectDojo covers roughly half of slice 1's ingest surface but nothing of the differentiating layer (three-axis triage, narrative reports, clean JSON export designed for future LLM use, zero-deployment CLI). Its architectural bulk makes it an unsuitable foundation to build the differentiators on top of.

---

## reconFTW

**License: AMBIGUOUS.** See the note in [[competitive/reconftw|reconFTW analysis]]. The repo's `LICENSE` file says MIT; the README and docs say GPL-3.0; third-party trackers disagree. **This ambiguity no longer affects any CSAK decision** — slice 2 builds its own orchestrator and adapts reconFTW recipes via documentation reading rather than code inclusion or invocation. Worth resolving as a courtesy via a GitHub issue, but doesn't block anything.

### Strategy 1: Fork / embed

**Legal:**

- If MIT: fully permitted, no copyleft.
- If GPL-3.0: CSAK must also be GPL-3.0 (or compatible). This is a significant constraint.

**Technical feasibility:** Low. reconFTW is thousands of lines of bash orchestration. Porting to Python/Go is essentially a rewrite — you'd keep the *logic* but none of the *code*.

**Recommendation:** **Don't fork.** Slice 2 implements its own typed Python orchestrator from scratch. The recipes (specific tool flag combinations) are adapted with attribution as documentation rather than code; that's the leverage with the highest ratio of value to risk. See [[competitive/build-vs-adapt|build-vs-adapt]].

### Strategy 2: Library import

**Legal/technical:** Not applicable. reconFTW is a bash script, not an importable library.

### Strategy 3: Subprocess invocation

**Legal:** Permitted under both MIT and GPL-3.0. GPL's viral clause applies to combining code, not to running separate programs.

**Technical feasibility:** High. reconFTW has a well-defined CLI (`./reconftw.sh -d target.com -r`), exits with status codes, and produces output in a known directory structure. CSAK could invoke it and wait for completion.

**Recommendation:** **Considered and rejected for slice 2.** Earlier framing proposed "optional mode, not a default — CSAK could shell out to reconFTW if installed." The slice 2 spec rejected this:
- The [[competitive/reconftw|reconFTW case study]] showed that the real value is the recipes (specific tool flag combinations), not the orchestration logic — and recipes can be adapted as documentation without runtime dependency.
- Subprocess invocation forces analysts to install reconFTW's heavy dependency stack (~80 external tools) for value they could get from CSAK directly.
- reconFTW scans take hours; blocking the CSAK CLI on reconFTW completion violates CSAK's on-demand real-time posture.

See [[specs/slice-2|slice 2 spec]] §"No reconFTW" and [[competitive/build-vs-adapt|build-vs-adapt]] for the full reasoning.

### Strategy 4: Output parsing

**Legal:** Negligible concern under either license. Reading `report/report.json` is not a derivative work.

**Technical feasibility:** High. reconFTW produces `report/report.json` as a consolidated structured output at the end of a scan.

**Recommendation:** **Deferred indefinitely.** Slice 1 stayed scoped to the five committed formats. Slice 2 also deferred — the native orchestrator means analysts don't need to bring reconFTW output to CSAK, they can use CSAK directly. May return as an optional adapter only if a real analyst needs it.

### reconFTW scope fit

| CSAK need | reconFTW covers? | Gap |
|-----------|-----------------|-----|
| Slice 1: ingest Nessus | ❌ | reconFTW doesn't touch Nessus. |
| Slice 1: ingest Nuclei, Subfinder+httpx | ✅ native | Produces output we could parse — but slice 2's native orchestrator removes the motivation. |
| Slice 1: ingest Zeek | ❌ | Out of reconFTW's scope. |
| Slice 1: ingest osquery | ❌ | Out of reconFTW's scope. |
| Slice 1: cross-tool dedup | ⚠️ partial | reconFTW dedups within its own pipeline but not across external tool outputs. |
| Slice 1: multi-axis triage | ❌ | reconFTW has a simpler "hotlist" scoring. |
| Slice 1: narrative fix-it tickets | ❌ | `reconftw_ai` attempts summaries but is early-stage and opt-in. |
| Slice 2: tool orchestration | ✅ runs all enabled tools in fixed pipeline | Per the [[competitive/reconftw\|case study]], not "intelligent" orchestration — it's a fixed pipeline with ~300 config knobs. |
| Slice 2: adaptive rate limiting | ✅ built-in | `--adaptive-rate` flag. CSAK adopted the pattern. |
| Slice 2: quick rescan pattern | ✅ built-in | `--quick-rescan` flag. CSAK considered and rejected for slice 2. |
| Slice 3: recursion | ✅ native (different shape) | reconFTW's pipeline is a fixed-order chain with config knobs; CSAK slice 3 specs deterministic recursion via output-to-input type matching. Same problem, different shape. See [[specs/slice-3\|slice 3 spec]]. |
| Slice 3: distributed execution | ✅ Ax Framework | Out of CSAK's current scope but proven by reconFTW. |

**Key gap:** reconFTW is offensive-only. An analyst doing both offensive (reconFTW) and defensive (osquery, Zeek) work still needs something to ingest the defensive side and unify triage across both. **That's CSAK.**

---

## Combined picture — actual CSAK position

**Neither tool is a runtime dependency or upstream-source for CSAK.** Both are reference points and (for non-code artifacts) sources of adapted content.

The shape that landed:

1. **Slice 1 is shipped.** Five committed tool formats, no foreign-JSON ingest. DefectDojo's CWE-keyed remediation templates and severity normalization tables were adapted with attribution. DefectDojo's parsers were studied as references but not copied.
2. **Slice 2 spec is approved.** CSAK's own typed Python orchestrator over Subfinder + httpx + Nuclei, with target-type-aware routing and three modes. reconFTW's specific tool invocation flag sets are adapted into the slice 2 tool catalog with `# source: reconFTW v4.0 modules/<file>.sh` attribution comments. Slice 2 does not subprocess-invoke reconFTW. Slice 2 does not ingest reconFTW JSON.
3. **Neither tool is a runtime dependency.** CSAK runs entirely on its own.
4. **The slice 2 orchestration question is closed.** The reconFTW case study reframed it: not "replace, augment, or integrate" but "what should we adapt and what should we build?" Answer: build the orchestration, adapt the recipes.

## Scope gaps that neither tool closes

Even with both tools fully leveraged (in the documentation-source sense, since neither is a runtime dependency), CSAK has built or will build:

- **Zeek and osquery ingest.** Neither DefectDojo nor reconFTW handles network or host telemetry. Slice 1 ships this.
- **Three-axis triage (severity × confidence × target_weight).** DefectDojo has severity; reconFTW has a thin hotlist. Slice 1 ships the three-axis model.
- **Narrative, client-facing fix-it ticket reports.** Slice 1 ships these.
- **Clean JSON export designed for future LLM consumption.** Slice 1 ships this.
- **The zero-deployment CLI experience.** Slice 1 delivered this; slice 2 preserves it (CSAK's only added dependencies are three Go binaries the analyst installs themselves, with `csak doctor` to help).
- **Target-type-aware tool routing.** Neither tool does this. reconFTW relies on user config; DefectDojo doesn't orchestrate tools at all. Slice 2 is the answer.

## Recommendations — status

All four numbered recommendations from the original analysis are now resolved, demoted, or deferred with a referral elsewhere. Kept here (with status annotations) for the audit trail; live items moved to [[synthesis/deferred-features|deferred-features]] which is the canonical home for cross-page deferral tracking.

1. ~~Resolve reconFTW license ambiguity.~~ **Demoted to courtesy/non-blocking.** No CSAK decision depends on the resolution since CSAK has no runtime dependency on reconFTW. Worth opening a GitHub issue at some point as a contribution back to the reconFTW community, but not on any CSAK critical path.
2. **Foreign-JSON ingest stays deferred indefinitely** for both DefectDojo and reconFTW. Re-evaluation tracked in [[synthesis/deferred-features|deferred-features §Slice 4+]].
3. ~~Defer the "fork vs integrate reconFTW" question.~~ **Resolved 2026-04-24** by the [[specs/slice-2|slice 2 spec]] and the [[competitive/reconftw|reconFTW case study]]. None of fork/integrate/replace; build our own and adapt recipes with attribution.
4. **Do not fork either project.** Settled. Both are architecturally unsuitable foundations for CSAK, even setting aside license concerns. See [[competitive/build-vs-adapt|build-vs-adapt]] for the full argument.

## Related

- [[competitive/defectdojo|DefectDojo]]
- [[competitive/reconftw|reconFTW]]
- [[competitive/build-vs-adapt|Build vs Adapt]]
- [[competitive/README|Competitive Analysis Index]]
- [[specs/slice-1|Slice 1 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[specs/slice-3|Slice 3 Spec]]
- [[synthesis/deferred-features|Deferred Features]]
- [[synthesis/open-questions|Open Questions]]
