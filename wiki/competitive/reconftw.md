---
title: "reconFTW"
category: competitive
tags: [reconftw, recon-orchestration, osint, bash, open-source]
status: active
confidence: medium
owner: shared
created: 2026-04-23
updated: 2026-04-23
sources:
  - "https://github.com/six2dez/reconftw"
  - "https://docs.reconftw.com/"
  - "https://starlog.is/articles/cybersecurity/six2dez-reconftw/"
  - "https://www.helpnetsecurity.com/2024/12/30/reconftw-open-source-reconnaissance-automation/"
---

# reconFTW

## What it is

reconFTW is an open-source automated reconnaissance framework targeting bug bounty hunters, pentesters, and security researchers. Created by six2dez. Written almost entirely in bash (which is unusual for a project of its scale). The main script orchestrates 80+ external security tools in a staged pipeline: subdomain enumeration → live-host probing → OSINT → vulnerability scanning → reporting. ~7,000+ GitHub stars as of early 2026. Installs via `./install.sh`, runs via `./reconftw.sh -d target.com`. Docker image available. Distributed scanning via the Ax Framework (cloud VPS fleet orchestration).

## What it does that overlaps with CSAK

Most of this is **slice 2 and slice 3 territory**, not slice 1:

- **Tool orchestration (slice 2 core).** reconFTW already solves the "given a target, invoke the right tools with the right parameters, in the right order" problem. Covers most of what CSAK slice 2 is proposing.
- **Recursive/chained tool runs (slice 3 core).** reconFTW's pipeline has exactly the "subfinder → httpx → nuclei" flow we named as the canonical slice 3 example. Output of each stage feeds the next, with live-host filtering.
- **Module system.** 8 specialized modules callable individually. Maps to CSAK's proposed tool catalog model.
- **Ingestion surface** — some overlap with CSAK slice 1's 5 starter tools. reconFTW uses Nuclei, Subfinder, and httpx natively (3 of CSAK's 5). It does not use Nessus, Zeek, or osquery — reconFTW is recon-focused, not host or network telemetry focused.
- **Reporting.** Auto-generates `report/index.html` and `report/report.json` at the end of a scan. Also has `reconftw_ai` — an AI report generator using local Ollama models. Faraday integration for web-based reporting and vuln management.
- **Incremental mode.** `--incremental` runs only scan new findings since last run. Same problem CSAK's `first_seen`/`last_seen` dedup is solving, approached differently.
- **Configuration-driven.** 300+ config options. Analogous to what CSAK slice 2 would need for tool selection heuristics.

## What it does that we explicitly don't want to do

- **Bash as the primary implementation language.** reconFTW is thousands of lines of bash. It works, but it's fragile when tools update their output formats, and extending it without breaking things is hard. CSAK's design posture is more typed, more testable — almost certainly Python or Go.
- **Bug bounty / offensive security posture.** reconFTW is "active recon + vuln scanning on a target domain." CSAK spans offensive *and* defensive (host telemetry via osquery, network telemetry via Zeek). reconFTW users are looking for exploitable vulns; CSAK's analyst is doing mixed work.
- **Single-monolith orchestration.** reconFTW is one script that does everything. CSAK's slice plan is intentional: ingest-and-report first (slice 1), then add orchestration (slice 2), then add recursion (slice 3). Splitting these is why CSAK should be more reliable than reconFTW, if done well.
- **Cloud-scale fleet orchestration.** reconFTW's Ax Framework integration distributes scans across VPS fleets. CSAK is single-machine.

## Strengths to learn from

- **Pipeline-as-data-model.** reconFTW treats recon as a data pipeline problem. Subfinder output is a file of subdomains; httpx consumes that file and produces a file of live hosts; nuclei consumes *that* and produces a file of findings. File-based stage output is rough but reliable. CSAK's design should at least consider this pattern for slice 2's tool execution — each tool's output is a first-class artifact, subsequent stages consume artifacts, not direct tool APIs.
- **Quick Rescan Mode.** "Skips heavy stages automatically when no new assets are discovered." Operationally smart. CSAK could do something similar in slice 2+ — if subfinder produces the same subdomains as last week, don't re-run httpx + nuclei against them.
- **Hotlist Builder.** Scores and highlights the riskiest assets based on new findings. This is triage-adjacent and worth studying — but reconFTW's scoring is simpler than what CSAK is proposing.
- **Failed tools logged rather than halting the pipeline.** Good production posture. CSAK's tool orchestration in slice 2 should do the same.
- **Adaptive rate limiting.** Backs off on 429/503 errors automatically. CSAK slice 2 will hit this; worth designing in from the start.
- **`--health-check` command.** Built-in self-diagnostic. Worth copying.

## Weaknesses / gaps

- **Bash fragility.** Referenced across multiple commentaries. Updating a tool's flag changes breaks reconFTW silently. Maintenance burden is high.
- **Dependency management is painful.** 80+ tools across Go, Python, Ruby, native binaries. Installer failures mentioned frequently in the issues. CSAK's slice 2 will have the same problem, and we should expect it.
- **Resource consumption.** Full-mode scans are intensive. Without distributed scanning, single-machine runs can take hours. CSAK's on-demand real-time posture means we cannot be this slow for slice 2 — we need quicker default modes.
- **Reporting quality.** The HTML reports are data-dumps, not narrative. `reconftw_ai` attempts a narrative summary using local Ollama models, but the AI pipeline is opt-in and early-stage. CSAK's report layer (slice 1) should be substantially better here.
- **Triage is thin.** reconFTW categorizes findings by tool but doesn't have the cross-tool severity normalization or the multi-axis (severity × confidence × target-weight) scoring CSAK is proposing. This is a real gap in reconFTW that CSAK can fill.
- **Offensive-only scope.** reconFTW cannot ingest Nessus output, Zeek logs, or osquery results. An analyst doing both offensive and defensive work has to use reconFTW for one half and something else for the other.

## Pricing / licensing model

Open source, GPL-3.0 (based on the repo license). No commercial tier. Community-maintained via GitHub issues and Discord.

## Verdict for CSAK design

reconFTW is **the thing to watch for slice 2 and 3**, not slice 1. Slice 1 doesn't compete with reconFTW directly — reconFTW doesn't ingest Nessus, doesn't do osquery/Zeek telemetry, doesn't have multi-axis triage, doesn't produce narrative fix-it tickets. Slice 1 and reconFTW could even coexist: an analyst uses reconFTW to run a full recon pipeline, then feeds the resulting JSON into CSAK for triage and reporting.

**For slices 2 and 3, reconFTW is the obvious comparison.** A few implications:

1. **The "CSAK is just reconFTW in Python" risk is real.** If slice 2 ends up being a Python port of reconFTW's pipeline with no other value-add, we should reconsider whether slice 2 is worth building at all vs. making slice 1 able to ingest reconFTW output. That's worth an ADR when slice 2 starts.
2. **Differentiation for CSAK slice 2 must be clear.** Likely candidates: (a) typed-language reliability vs. bash fragility, (b) defensive + offensive scope, not just recon, (c) tight integration with slice 1's triage and narrative reporting, (d) on-demand real-time posture vs. reconFTW's "run a full scan and come back hours later."
3. **reconFTW output → CSAK input is a potentially valuable integration.** reconFTW produces `report/report.json` as a consolidated output; CSAK could natively parse it as a slice-1 input format. This makes CSAK useful to the existing reconFTW user base without requiring them to switch.

**Design changes this research suggests:**

- **Add reconFTW's `report/report.json` as a potential slice 1 ingest format.** Either in the initial 5 or as a stretch goal. Low effort, meaningful positioning.
- **Study reconFTW's "Quick Rescan Mode" pattern** for slice 2's tool-re-invocation logic. Skipping heavy stages when nothing's changed is smart.
- **Adaptive rate limiting is a slice 2 requirement, not a nice-to-have.** Design it in from the start.
- **Consider whether slice 2 should explicitly be a replacement for reconFTW or an augmentation.** If the former, CSAK slice 2 scope is much larger; if the latter, slice 2 might just be "CSAK can invoke reconFTW and parse its output."

## Notes

The bash-based architecture is a genuine liability for reconFTW but also its charm — the author explicitly chose bash for fast iteration and low dependencies. CSAK making the opposite choice (typed language, structured data model, real tests) is a defensible differentiator. The tradeoff is slower initial development.

The `reconftw_ai` feature (AI report generation) being recent and opt-in suggests the author is aware of the reporting weakness but hasn't cracked it. This is an opening for CSAK's report layer to be meaningfully better.

## Related

- [[competitive/README|Competitive Analysis Index]]
- [[competitive/defectdojo|DefectDojo]]
- [[product/slices|Slice Plan]]
- [[specs/slice-1|Slice 1 Spec]]
