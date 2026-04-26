---
title: "reconFTW"
category: competitive
tags: [reconftw, recon-orchestration, osint, bash, open-source]
status: active
confidence: high
owner: shared
created: 2026-04-23
updated: 2026-04-26
sources:
  - "https://github.com/six2dez/reconftw"
  - "https://github.com/six2dez/reconftw/blob/main/reconftw.sh"
  - "https://github.com/six2dez/reconftw/blob/main/LICENSE"
  - "https://docs.reconftw.com/"
  - "https://github.com/six2dez/reconftw/wiki/2.-Usage-Guide"
  - "https://github.com/six2dez/reconftw/wiki/1.-Post-Installation-Guide"
---

# reconFTW

## What it is

reconFTW is an open-source automated reconnaissance framework targeting bug bounty hunters, pentesters, and security researchers. Created by six2dez. Written almost entirely in bash. The main script (`reconftw.sh`, ~854 lines) sources 8 specialized modules (`modules/osint.sh`, `subdomains.sh`, `web.sh`, `vulns.sh`, `core.sh`, `utils.sh`, `axiom.sh`, `modes.sh`) and runs an 80+ tool pipeline in a fixed order. ~7,400 GitHub stars as of early 2026. Installs via `./install.sh`, runs via `./reconftw.sh -d target.com`. Docker image available. Distributed scanning via the Ax Framework (cloud VPS fleet orchestration).

## Case study (2026-04-24): how does reconFTW actually decide which tools to run?

This question matters for CSAK slice 2, which is meant to do "tool orchestration." Earlier framings of slice 2 assumed reconFTW had clever runtime tool selection logic worth learning from. Direct reading of the source says **it does not.** What follows is the corrected, honest reading.

**reconFTW does not "select" tools at runtime. It runs all of them in a fixed pipeline and dedups the union.**

For subdomain enumeration alone, reconFTW runs ~14 tools in parallel categories:

- **Passive** (10): subfinder, assetfinder, amass, findomain, crobat, waybackurls, github-subdomains, Anubis, gauplus, mildew.
- **Certificate transparency** (3): ctfr, tls.bufferover, dns.bufferover.
- **Bruteforce** (1): puredns + wordlist.
- **Permutations** (2): alterx + dnsx.

For each domain, **all of those run.** Outputs are concatenated, deduplicated with `sort -u`, and resolved with `puredns`. The same shape repeats in `modules/web.sh` (web detection), `modules/vulns.sh` (vuln scanning), and `modules/osint.sh` (OSINT).

**The "selection" is not a runtime decision. It's a config-file decision the user makes once.** `reconftw.cfg` exposes ~300 boolean knobs (`SUBDOMAINS_GENERAL=true`, `SUB_PASSIVE=true`, `SUB_CRT=true`, `SUB_BRUTE=true`, etc.). The script runs whatever's enabled.

**The mode flags are preset profiles.** `-r recon`, `-s subdomains`, `-p passive`, `-a all`, `-z zen`, `-w web`, `-n osint` each flip a different pre-curated group of those booleans on or off. `modules/modes.sh` is essentially a switch statement that toggles flag groups. There is no logic about "which mode fits this target" — the analyst picks the mode.

**Specifically, reconFTW does not:**

- Adapt to target shape (single domain vs CIDR vs list).
- Reason about cost vs coverage at runtime.
- Skip the slow tools when the fast ones already returned plenty of results.
- Pick the "best tool for the job" — there is no such concept; jobs run all the tools in their category.
- Have any data-driven decision logic between tools.

**reconFTW does:**

- Hard-code stage ordering (subfinder → puredns resolution → httpx live-host probe → nuclei vuln scan).
- Treat each tool's output file as the next stage's input file (file-based pipeline, not in-process data passing).
- Encode rate limiting as a single global knob (`NUCLEI_RATELIMIT`, `FFUF_RATELIMIT`, `HTTPX_RATELIMIT`) shared across everything, with `--adaptive-rate` backing off on 429/503.
- Tolerate long-running runs rather than avoid them — full mode runs for hours; the `-z zen` mode is the only "shorter" option.
- Provide `--quick-rescan` that skips heavy stages when no new assets are discovered (this *is* a runtime decision, but it's only one decision and it's a simple "did the cheap stage produce new data?" check).

### What reconFTW actually provides as value

Three things, in honest priority order:

1. **The catalog of tool-invocation recipes.** Knowing that `subfinder -all -silent` is the right invocation, that `httpx` after subfinder needs specific flags, that `puredns` between them needs specific resolvers — that's accumulated knowledge worth hundreds of debugging hours. This is the real intellectual property of reconFTW.
2. **The pipeline shape.** subfinder → puredns → httpx → nuclei (with bruteforce + permutations + CT injected as side feeds into the dedup step) is a proven design pattern. Anyone could re-derive it; reconFTW shows the production-tested version.
3. **The exhaustive config booleans.** ~300 knobs covering every individual technique with sensible defaults. The "intelligence" is shifted entirely to the user — if you want "everything except wayback URL extraction," flip one boolean. CSAK should deliberately *not* copy this. 300 knobs is a config burden; the right answer for CSAK is a small handful of well-curated modes plus a single sensible default.

## What this case study means for CSAK slice 2

Three concrete updates to the slice 2 framing, all corrections of earlier assumptions:

**1. "Tool selection logic" was the wrong question to ask reconFTW.** reconFTW does not have intelligent runtime tool selection. The thing CSAK might want to learn is **how to compose a multi-stage pipeline of recon tools where each stage's output drives the next** — pipeline orchestration, not tool selection. These are different problems, and the latter is the one reconFTW actually solves.

**2. The 300-knob config burden is something to deliberately reject.** reconFTW shifts adaptive intelligence to the user via boolean flags. CSAK's analyst persona doesn't want to maintain a 300-line config file. CSAK should ship with a small handful of well-chosen modes (or a single sensible default) and add knobs only when they earn their place.

**3. The recipes — reconFTW's real value — are best consumed as documentation, not subprocess invocation.** Reading reconFTW's modules and lifting the specific tool flag combinations into CSAK's own tool catalog (with attribution) is much higher leverage than shelling out to `reconftw.sh`. We get the institutional knowledge without the bash dependency, the install footprint, the license ambiguity, or the assumption that the analyst already runs reconFTW.

This shifts the slice 2 reconFTW question. The earlier framing was "replace, augment, or integrate." The case study suggests a fourth, better answer: **adapt the recipes, write our own orchestrator, don't depend on reconFTW at all.** This is what [[competitive/build-vs-adapt|build-vs-adapt]] originally recommended at the code-vs-data layer; the case study makes it concrete.

## What it does that overlaps with CSAK

Most of this is **slice 2 and slice 3 territory**, not slice 1:

- **Tool execution + pipeline orchestration (slice 2 core).** reconFTW solves "given a target, invoke the right tools in the right order." CSAK slice 2 will do the same for a smaller, curated tool set.
- **Recursive/chained tool runs (slice 3 core).** reconFTW's pipeline has the "subfinder → httpx → nuclei" flow we named as the canonical slice 3 example. Output of each stage feeds the next, with live-host filtering.
- **Module system.** 8 specialized modules. Maps loosely to CSAK's tool catalog model.
- **Ingestion surface** — partial overlap with CSAK slice 1. reconFTW uses Nuclei, Subfinder, and httpx natively (3 of CSAK's 5). It does not use Nessus, Zeek, or osquery.
- **Reporting.** Auto-generates `report/index.html` and `report/report.json`. Also has `reconftw_ai` — an AI report generator using local Ollama models. Faraday integration for vuln management.
- **Incremental mode.** `--incremental` skips work for findings already seen. Same problem CSAK's `first_seen`/`last_seen` dedup is solving, approached differently.

## What it does that we explicitly don't want to do

- **Bash as the primary implementation language.** Thousands of lines of bash. It works, but it's fragile when tools update their output formats, and extending it without breaking things is hard. CSAK is Python.
- **Bug bounty / offensive-only posture.** reconFTW is "active recon + vuln scanning on a target domain." CSAK spans offensive *and* defensive (host telemetry via osquery, network telemetry via Zeek). reconFTW users are looking for exploitable vulns; CSAK's analyst is doing mixed work.
- **Single-monolith orchestration.** reconFTW is one script that does everything. CSAK's slice plan keeps ingest, orchestration, and recursion in separate slices.
- **Cloud-scale fleet orchestration.** Ax Framework distributes scans across VPS fleets. CSAK is single-machine.
- **300-knob config file.** See case study above.

## Strengths to learn from

- **Pipeline-as-data-model.** reconFTW treats recon as a data pipeline problem. Subfinder output is a file of subdomains; httpx consumes that file and produces a file of live hosts; nuclei consumes *that* and produces findings. File-based stage output is rough but reliable. CSAK slice 2 should adopt this pattern in some form: each tool's output is a first-class artifact that can be inspected after the fact, not transient in-memory data.
- **Quick Rescan Mode.** "Skips heavy stages automatically when no new assets are discovered." Operationally smart — and notably, it *is* one of the few runtime decisions reconFTW makes. Worth copying for CSAK slice 2.
- **Adaptive rate limiting.** Backs off on 429/503 errors automatically. CSAK slice 2 will hit this; worth designing in from the start.
- **Failed tools logged rather than halting the pipeline.** Good production posture. CSAK's tool orchestration should do the same.
- **`--health-check` command.** Built-in self-diagnostic. Worth copying.
- **The recipes themselves.** Specific flag combinations for each tool, in the right order. The thing to adapt with attribution.

## Weaknesses / gaps

- **Bash fragility.** Updating a tool's flags can break reconFTW silently.
- **Dependency management is painful.** 80+ tools across Go, Python, Ruby, native binaries. Installer failures common.
- **Resource consumption.** Full-mode scans take hours. CSAK's on-demand real-time posture means we cannot be this slow — we need fast default modes.
- **Reporting quality.** HTML reports are data dumps, not narrative. `reconftw_ai` is opt-in and early-stage.
- **Triage is thin.** reconFTW categorizes findings by tool but doesn't have CSAK's three-axis (severity × confidence × target_weight) deterministic scoring.
- **Offensive-only scope.** Cannot ingest Nessus output, Zeek logs, or osquery results. An analyst doing both offensive and defensive work has to use reconFTW for one half and something else for the other.
- **Config burden shifts intelligence to the user.** 300 booleans. Overwhelming for non-power-users.

## Pricing / licensing model

**License: MIT.** The repository's `LICENSE` file contains the MIT License, Copyright (c) 2023 six2dez. The README and some documentation pages mention GPLv3 — this is documentation drift inside reconFTW's own repo, not a competing legal claim. The `LICENSE` file is the contractually-controlling document under standard interpretation; README/docs are descriptive prose. Third-party trackers occasionally surface the GPL string because they read the README rather than the LICENSE file.

**Moot for CSAK's chosen approach regardless.** Reading the modules to learn the recipes (then writing CSAK's own orchestrator that uses similar flags) isn't derivative work — it's learning from public source. We're not forking, not embedding, not subprocess-invoking. The MIT-on-the-LICENSE-file reading would permit even those approaches; the documentation drift would constrain only the GPL-incompatible ones, which we aren't doing anyway.

## Verdict for CSAK design

**reconFTW is a reference, not a dependency.** Slice 2 of CSAK builds its own small orchestration pipeline (subprocess runner + stage sequencer + dedup-on-merge) using reconFTW's modules as a documentation source for tool invocation flags. We do not shell out to reconFTW. We do not list it as a dependency. The recipes go into our tool catalog with attribution; the orchestrator is ours.

This is the build-vs-adapt page's recommendation in concrete form: adapt the configuration knowledge (data), build the orchestration code ourselves.

**Differentiation for CSAK slice 2:**

1. **Typed language, real tests.** reconFTW is bash; CSAK is Python with tests and types.
2. **Defensive + offensive scope.** reconFTW is recon-only; CSAK orchestrates the on-demand active tools (Nuclei, Subfinder, httpx, possibly Nessus via API) while continuing to ingest defensive-mode telemetry (Zeek, osquery) from out-of-band collection.
3. **Tight integration with slice 1's triage and narrative reporting.** reconFTW's reports are data dumps; CSAK's are scoped, scored, and narrative.
4. **On-demand real-time posture.** reconFTW is "run a full scan, come back hours later." CSAK is "run this now, get an answer in seconds-to-minutes."
5. **Curated modes, not 300 booleans.** A small handful of well-chosen profiles, sensible defaults, knobs only when they earn their place.

## How this research influenced the spec

Slice 1 closures (settled 2026-04-23):

- **reconFTW `report/report.json` as a CSAK ingest format?** Deferred out of slice 1. Slice 1 stayed scoped to five tool formats; the parser architecture is plugin-shaped so foreign-JSON ingest can be added in slice 2 without core surgery. *Update 2026-04-24: with the corrected case study, foreign-JSON ingest of reconFTW output is no longer the natural slice 2 path either — adapting the recipes is. Foreign-JSON ingest may stay deferred indefinitely, depending on whether any analyst actually wants to bring reconFTW output to CSAK rather than running CSAK directly.*
- **Quick Rescan Mode pattern.** Adopt for slice 2.
- **Adaptive rate limiting.** Slice 2 requirement, not a nice-to-have.
- **Replace, augment, or integrate reconFTW?** Resolved by the case study: **none of the three.** Adapt recipes, build orchestration, no runtime dependency on reconFTW.
- **License ambiguity.** No longer blocks anything since we're not invoking or embedding. Worth resolving as a courtesy via a GitHub issue.

## Notes

The bash architecture is a genuine liability but also reconFTW's charm — six2dez explicitly chose bash for fast iteration. CSAK making the opposite choice (Python, types, tests) is a defensible differentiator with a slower-initial-development tradeoff already paid in slice 1.

The `reconftw_ai` feature being recent and opt-in suggests the author knows the reporting weakness but hasn't cracked it. CSAK's future LLM layer — which attaches over slice 1's clean JSON export — has room to be meaningfully better.

## Related

- [[competitive/README|Competitive Analysis Index]]
- [[competitive/defectdojo|DefectDojo]]
- [[competitive/leverage-analysis|Leverage Analysis]]
- [[competitive/build-vs-adapt|Build vs Adapt]]
- [[product/slices|Slice Plan]]
- [[specs/slice-1|Slice 1 Spec]]
