---
title: "Slice 2 — Tool Orchestration"
category: specs
tags: [slice-2, orchestration, collect, spec]
status: draft
confidence: medium
owner: shared
created: 2026-04-24
updated: 2026-04-24
---

# Slice 2 — Tool Orchestration

> First draft, 2026-04-24. Adds CSAK's ability to run security tools itself rather than only ingesting pre-collected output. Slice 1 stays unchanged underneath; slice 2's collect stage is a new on-ramp to slice 1's existing ingest pipeline. Status stays `draft` pending review.

## Goal

Take a target, run the right offensive-recon tools against it, hand the resulting artifacts to the slice 1 ingest pipeline. The analyst types one command instead of three; CSAK handles tool invocation, output capture, rate limiting, and pipeline ordering.

The four-step product model is **intake → collect → triage → report**. Slice 1 shipped intake-as-file-handoff plus triage and report. Slice 2 ships **collect** for the on-demand active tools that make sense to invoke from a CLI.

This is the first slice where CSAK touches the network. Everything before this was reading files the analyst had already collected.

## Scope

### In scope

- **`csak collect` command** that runs offensive-recon tools against a target and feeds output to the slice 1 ingest pipeline.
- **Three tools orchestrated in slice 2:** Subfinder, httpx, Nuclei.
- **Three modes:** `quick`, `standard` (default), `deep`.
- **Pipeline shape:** subfinder → httpx → nuclei, each stage producing an Artifact that flows through slice 1's existing ingest path.
- **Adaptive rate limiting** default-on, applied across all tools.
- **Per-tool overrides** at the CLI for power users.
- **Sync invocation only.** The collect command blocks until completion. Per-stage `--timeout` flags with sensible defaults.
- **Tool catalog** (config files describing how each tool gets invoked) with attribution to reconFTW where recipes were adapted.
- Integration with slice 1's data model and reporting — Findings produced by `csak collect` look identical to Findings produced by `csak ingest`.

### Out of scope

- **Zeek and osquery orchestration.** These are deployment-shaped tools (continuous network monitor, host-resident agent), not on-demand CLI-runnable. They stay ingest-only as in slice 1. The analyst hands CSAK their resulting logs.
- **Nessus orchestration via API.** Deferred to slice 2.5 or later. Nessus stays ingest-only via `.nessus` XML as in slice 1. Re-evaluated once slice 2 is in real use and we know whether analysts want CSAK to drive Nessus.
- **reconFTW JSON ingest.** Deferred indefinitely. With slice 2's native orchestrator, the analyst doesn't need to pipe reconFTW output to CSAK — they use CSAK directly. May return as an optional adapter if a real analyst needs it.
- **Generic CSV ingest.** Still deferred. Slice 2 is about orchestrating tools, not adding more parsers.
- **Recursion.** Tool output does not trigger further tool runs. That's slice 3. Slice 2 runs the configured pipeline once and exits.
- **Async / background / scheduled scans.** Slice 2 is sync-only. Long-running scans block the CLI. If long-running becomes a real problem in practice, slice 3 adds backgrounding.
- **Quick rescan / staleness detection.** Every `csak collect` invocation runs the full pipeline fresh. No "skip if subdomains haven't changed" logic. Re-evaluated in a later slice if it earns its place.
- **LLM use anywhere.** Same posture as slice 1 — slice 2 stays deterministic. Tool selection is heuristic via mode flags, not LLM-assisted. The LLM layer continues to be a future slice that wraps over CSAK's structured outputs.
- **Distributed / cloud-fleet scanning.** No Axiom-style multi-VPS coordination. Single-machine, like slice 1.
- **Configuration-by-knob explosion.** Deliberately rejected after the [[competitive/reconftw|reconFTW case study]]. Three modes plus per-tool overrides — not 300 booleans.
- **Bidirectional ticketing integration.** Same as slice 1.
- **Web UI.** Same as slice 1.

## Tool selection — why these three

Slice 2 orchestrates **Subfinder, httpx, and Nuclei**. The other two slice 1 tools (Zeek, osquery) stay ingest-only.

| Tool | Why orchestrated | Why CSAK runs it instead of just ingesting |
|------|------------------|--------------------------------------------|
| **Subfinder** | Cheap external recon. The "what subdomains exist" question. | Analyst types `csak collect --target acmecorp.com` and gets fresh subdomain enumeration without remembering subfinder's flags. |
| **httpx** | Live-host filtering. Subfinder finds 200 subdomains; httpx tells us which 80 are actually responding. | The pipeline shape demands it: nuclei against 200 hostnames where 120 are dead is wasteful. |
| **Nuclei** | Active web vuln scanning. The headline "find vulnerabilities" step. | Pre-filtered to only the live hosts httpx surfaced. Templates curated by mode. |

**Why not Zeek/osquery in slice 2.** These are operationally different from active recon. Zeek is a passive network monitor that runs continuously on a sensor — you don't "invoke Zeek for this scan," you have Zeek deployed and you collect its logs. osquery is a host-resident agent that runs against managed boxes — you don't "invoke osquery for this scan," you query existing osquery agents. CSAK trying to "run" them from a CLI would be a category error. They stay ingest-only as in slice 1.

**Why not Nessus in slice 2.** Nessus *can* be driven via REST API, including the free Essentials tier. But it's a meaningful chunk of integration work (auth, scan-policy management, polling, error handling), and the value isn't proven until slice 2 is in real use. Slice 2 ships without it; Nessus stays ingest-only via `.nessus` XML. Re-evaluated when we know whether analysts actually want CSAK to drive Nessus.

## Pipeline shape

### Standard flow

```
csak collect --org acmecorp --target acmecorp.com [--mode standard]

  Stage 1: subfinder
    invocation: subfinder -d <target> -all -silent -oJ -o <out>/subdomains.jsonl
    output:     <artifact-store>/<hash>/subdomains.jsonl
    side effect: Artifact row written to SQLite

  Stage 2: httpx
    invocation: httpx -l <subfinder output> -j -o <out>/live-hosts.jsonl
    input:      stage 1's Artifact
    output:     <artifact-store>/<hash>/live-hosts.jsonl
    side effect: Artifact row written to SQLite

  Stage 3: nuclei
    invocation: nuclei -l <httpx live hosts> -j -o <out>/findings.jsonl [...templates per mode]
    input:      stage 2's Artifact (live hosts only)
    output:     <artifact-store>/<hash>/findings.jsonl
    side effect: Artifact row written to SQLite

  Ingest: each Artifact runs through the existing slice 1 ingest pipeline
    → Scans + Findings land in CSAK's SQLite
    → ready for csak findings list, csak report generate, etc.

  Exit: print summary (subdomains found, live hosts, findings by severity)
```

Each stage produces an **Artifact** in CSAK's existing `artifacts/` content-addressed store. The slice 1 ingest pipeline (`csak.ingest.pipeline`) picks up each artifact and produces Findings normally. **Slice 2's collect stage is a new on-ramp to slice 1's existing ingest pipeline, not a replacement for it.**

This means:

- Findings produced by `csak collect` are indistinguishable in the data model from Findings produced by `csak ingest`.
- The full slice 1 surface (`findings list/show/update`, `target list/update`, `report generate`) works identically against collect-produced data.
- The Scan entity captures the collect run. Methodology in reports correctly cites "Nuclei sweep via csak collect, 2026-04-24" rather than "Nuclei file uploaded by analyst."

### Per-stage Artifact model

Each stage's tool output is a first-class CSAK Artifact:

- Bytes content-addressed under `artifacts/<hash-prefix>/<hash>` exactly as in slice 1.
- Artifact row records `source_tool`, `received_at`, `path`, `hash`.
- Artifact rows accumulate across runs — re-running `csak collect` against the same target produces new Artifacts (each run's output is byte-different even if findings are the same), and the slice 1 dedup layer collapses duplicate Findings naturally via `last_seen` advancement and FindingScanOccurrence.

This shape is borrowed from reconFTW's pipeline-as-data-model approach and matches CSAK slice 1's existing storage conventions. File-based stage outputs are inspectable after the fact, debuggable, and don't lose information across stages.

## Modes

Three modes, no config-file knob explosion. The mode determines which tools run with which template selection.

| Mode | Subfinder | httpx | Nuclei templates | Time target |
|------|-----------|-------|------------------|-------------|
| `quick` | ✓ (passive sources only) | ✓ | — (skipped) | seconds |
| `standard` (default) | ✓ (all sources) | ✓ | default templates (severity ≥ low) | minutes |
| `deep` | ✓ (all sources, slower providers included) | ✓ | full templates | tens of minutes |

**Selection:**

```
csak collect --org acmecorp --target acmecorp.com               # uses standard
csak collect --org acmecorp --target acmecorp.com --mode quick
csak collect --org acmecorp --target acmecorp.com --mode deep
```

**Per-tool overrides** for power users:

```
csak collect --org acmecorp --target acmecorp.com --mode deep \
             --nuclei-templates ~/my-templates \
             --nuclei-rate-limit 30
```

Override flags pass through to the underlying tool invocation. They are documented per tool in `--help`; they do not get a separate config file.

**Why three modes is the right number.** Two is too few — `quick` and `full` lose the nuance between "I want a real scan but not all night" and "I want full coverage." Four-plus is too many — each additional mode is one more decision the analyst has to make at every invocation. Three covers 90% of cases and the per-tool overrides handle the rest.

**Rationale for no config file in slice 2.** [[competitive/reconftw|reconFTW]]'s 300-knob config is exactly the burden CSAK is trying to avoid. Modes plus per-tool overrides cover real usage; if a real analyst writes the same `--nuclei-templates X --nuclei-rate-limit Y` combination ten times, that's signal to add a new mode or a per-org default — not signal to ship a 300-line YAML.

## Tool catalog

Each orchestrated tool has a catalog entry under `csak/collect/tools/<tool>.py` (or `config/tools/<tool>.yaml` if YAML earns its place during build). The entry specifies:

- **Binary name and version compatibility.** What CSAK shells out to.
- **Per-mode invocation recipes.** The exact flags for `quick`, `standard`, `deep`.
- **Output format expectation.** What file format the tool produces (JSONL for all three slice 2 tools).
- **Input dependency.** Which prior stage's Artifact this tool consumes (subfinder: target name; httpx: subdomains.jsonl; nuclei: live-hosts.jsonl).
- **Rate limit defaults.** Starting requests/second; floor and ceiling for adaptive adjustment.
- **Timeout defaults.** Per-stage soft and hard deadlines.
- **Attribution.** A `# source: reconFTW v4.0 modules/<file>.sh` comment for any recipe adapted from reconFTW.

This is the **highest-leverage piece adapted from reconFTW** per [[competitive/build-vs-adapt|build-vs-adapt]]. The recipes — specific flag combinations that took reconFTW's author years to settle — go into CSAK's catalog with attribution. The orchestration code itself is CSAK-native Python, not a port of reconFTW's bash.

## Adaptive rate limiting

CSAK applies adaptive rate limiting across all stages by default. No flag to enable it; a `--no-adaptive-rate` flag for power users who want fixed-rate behavior is acceptable but not required for slice 2.

### What it does

When CSAK fires HTTP requests through Nuclei, httpx, or Subfinder's API-backed sources, the target (or the API gateway in front of it) pushes back at high rates with HTTP `429 Too Many Requests` or `503 Service Unavailable`. A naive scanner ignores those and keeps hammering — the target then drops further requests entirely, blacklists the source IP, or returns garbage that corrupts the scan's output.

CSAK's adaptive rate limiter watches for those signals and slows down automatically:

- **Detect:** scan each tool's stderr/stdout for rate-limit signals (429, 503, "rate limit exceeded" strings, or whatever the tool exposes).
- **Back off:** halve the request rate when signals appear. Continue running.
- **Recover:** gradually ramp back up after a quiet window.
- **Floor:** never drop below a configured minimum (default: 1 req/s) — at some point we stop scanning rather than crawl.
- **Ceiling:** never exceed a configured maximum (default: per-tool starting rate) — we don't speed past safe limits even if no 429s appear.

### Why it matters

Real targets push back. Cloudflare, AWS WAF, Azure Front Door, and most managed-API providers rate-limit aggressive clients. CSAK against a production target without rate limiting gets throttled or blocked within minutes, and the analyst gets a partial scan with garbage data. Without adaptive behavior, the alternative is a static `--rate 50` flag that the analyst has to tune per target — too high triggers blocking, too low wastes hours.

Aggressive scans also look like an attack to the target's defensive team. Slower, well-behaved scans are less likely to trigger an incident response on the client side or get the analyst's IP reported.

reconFTW ships this (`--adaptive-rate` flag) precisely because they hit the problem repeatedly. It's not a theoretical concern — it's what happens the first time CSAK scans a real target.

### Implementation shape

A small wrapper around each subprocess invocation. ~100-200 lines of Python. Per-tool starting rates and adjustment policies live in the tool catalog. The wrapper is the same shape across all three slice 2 tools.

The wrapper is **the** load-bearing piece of slice 2 that protects the analyst from operational failure modes. Worth doing well; not worth deferring.

## Long-running tools

Slice 2 is **sync-only**. The `csak collect` command blocks until the full pipeline finishes. There is no async, no daemon, no background-job system.

### Mitigations

- **`quick` mode** for analysts who need an answer in seconds.
- **`--timeout` flags per stage**, with sensible defaults (subfinder: 60s, httpx: 5min, nuclei: 30min in standard mode, 2hr in deep mode). Exceeding a stage timeout aborts that stage cleanly, captures partial output as an Artifact, and continues to the next stage with whatever data the failed stage produced.
- **Per-stage progress to stderr.** The analyst can see what's happening; the command isn't a black box.
- **Ctrl-C is graceful.** The current stage's tool gets a SIGTERM, partial output captured as an Artifact, ingest runs on what we have, command exits cleanly.

### Why sync-only in slice 2

Async / background / daemon adds significant scope: process management, persistence of run state across CLI invocations, status-query commands, lifecycle operations (cancel, resume). None of that is necessary for the core slice 2 question — "can CSAK run the tools." If long-running scans become a real friction in practice, slice 3 adds backgrounding cleanly on top of the sync-mode foundation.

The trade-off is honest: a `csak collect --mode deep` against a complex target may run for an hour and the analyst has to leave the terminal open. We accept that for slice 2.

## Quick rescan — explicitly NOT in slice 2

reconFTW ships a `--quick-rescan` mode that skips heavy stages when no new assets have been discovered. CSAK explicitly **does not** ship this in slice 2. Every `csak collect` invocation runs the full pipeline fresh.

Rationale:

- **Staleness logic adds real complexity.** "Has subfinder's output for this target changed since last run?" requires comparing structured outputs across runs, deciding which differences matter, and bookkeeping per-target rescan state. None of that is straightforward.
- **Slice 1's dedup already prevents the worst pain.** Re-ingesting the same data doesn't double-count Findings — it advances `last_seen` and adds FindingScanOccurrence rows. So a fresh-every-time approach doesn't pollute the data; it just wastes some compute.
- **The friction it would save is bounded.** Standard mode takes minutes, not hours. A quick rescan optimization saves minutes, at the cost of staleness-detection complexity that lives forever.

If quick rescan earns its place after slice 2 is in real use, it lands in a later slice cleanly — the slice 1 dedup model already supports the data shape it would need.

## Interface

### `csak collect`

The new top-level command:

```
csak collect --org <org> --target <target> [--mode <mode>] [tool overrides] [--timeout-* <sec>]
```

Examples:

```
csak collect --org acmecorp --target acmecorp.com
csak collect --org acmecorp --target acmecorp.com --mode quick
csak collect --org acmecorp --target acmecorp.com --mode deep \
             --nuclei-templates ~/my-templates \
             --timeout-nuclei 7200
csak collect --org acmecorp --target 10.0.0.0/24 --mode standard
```

The `--target` flag accepts a domain, an IP, or a CIDR. Resolution to the right Targets in CSAK's data model uses the existing slice 1 promotion logic.

### Existing CLI surface unchanged

Every slice 1 command works identically against collect-produced data:

```
csak findings list --org acmecorp                    # shows findings from collect runs
csak findings show <id>                              # shows scan lineage including collect Scans
csak scan list --org acmecorp                        # collect runs appear as Scans
csak report generate --org acmecorp --period today   # reports include collect findings
```

This is the load-bearing invariant: slice 2 doesn't fork the data path. Collect-produced findings flow through the same pipeline as ingest-produced findings.

### Exit codes

- `0` — collect ran end to end, all stages succeeded (or completed within their soft timeouts with partial output).
- Non-zero — one or more stages had hard failures (binary not found, target invalid, network unreachable). Partial Artifacts and Findings are still persisted; exit code signals the analyst should look at logs.

## Storage

No changes to the slice 1 data model. Slice 2 uses existing tables:

- **Artifact** rows for each stage's output.
- **Scan** rows for each `csak collect` invocation, with `source_tool` reflecting the contributing tool. A single `csak collect` produces multiple Scans (one per stage), all with the same `Scan.label` (e.g. "csak collect 2026-04-24T08-30-00 — acmecorp.com standard mode"). They are linked to their Artifacts via `Scan.artifact_ids`.
- **Finding** rows from each Scan, deduped against existing Findings via the slice 1 dedup keys.

Slice 2 introduces no new tables. The collect path uses the existing storage layer end to end.

## Dependencies

Slice 2 adds runtime dependencies on three external binaries:

- **subfinder** — Go binary, `go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest`.
- **httpx** — Go binary, `go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest`.
- **nuclei** — Go binary, `go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest`. Plus the `nuclei-templates` repository.

These are not Python packages. CSAK doesn't bundle them. The analyst is responsible for installing them; CSAK exposes a `csak doctor` command (new in slice 2) that checks for their presence and version compatibility, with clear install instructions on failure.

**No reconFTW.** Per the case study and the [[competitive/build-vs-adapt|build-vs-adapt]] analysis, CSAK does not depend on reconFTW. Recipes adapted from reconFTW with attribution; orchestration code is CSAK-native.

## What slice 2 explicitly does not solve

- **Recursion.** Tool output does not trigger further tool runs. Slice 3.
- **Async / background / scheduled scans.** Slice 3 if needed.
- **Quick rescan / staleness detection.** Later slice if ever.
- **Tool selection beyond the three modes.** Slice 2 doesn't pick tools dynamically; the analyst picks a mode.
- **Zeek and osquery orchestration.** Indefinitely out of scope (operationally different shape).
- **Nessus API orchestration.** Slice 2.5 or later.
- **reconFTW JSON ingest.** Deferred indefinitely.
- **Generic CSV ingest.** Still deferred.
- **Distributed / cloud-fleet scanning.** Single-machine, like slice 1.
- **LLM use.** Slice 2 stays deterministic, same posture as slice 1.
- **Web UI, ticketing integration, multi-user, scheduling.** Same as slice 1.

## Exit criteria

Slice 2 is "done" when:

- `csak collect --org X --target acmecorp.com` runs subfinder + httpx + nuclei against a real target, produces Artifacts and Findings via the slice 1 ingest path, and the analyst can see them in `csak findings list` afterward.
- All three modes (`quick`, `standard`, `deep`) produce reasonable output against a real target. `quick` finishes in seconds, `standard` in minutes, `deep` may take longer but stays bounded by stage timeouts.
- Per-tool overrides at the CLI work — analyst can pass `--nuclei-templates`, `--nuclei-rate-limit`, etc. without editing config files.
- Adaptive rate limiting kicks in on a target that returns 429s, and the analyst sees the scan complete instead of getting blocked or producing garbage. Verifiable with a synthetic test against a rate-limited endpoint.
- Stage timeouts cleanly abort runaway tools, capture partial output, and continue the pipeline.
- Ctrl-C is graceful — current stage SIGTERM'd, partial output captured, ingest runs on what we have, exit clean.
- `csak doctor` correctly identifies missing or version-incompatible tool binaries with actionable error messages.
- Methodology in `csak report generate` output correctly cites "via csak collect" Scans, not just ingested file Scans.
- Slice 1 surface (`findings list/show/update`, `target list/update`, `scan list`, `report generate`) works identically against collect-produced data.
- At least one analyst (Eli) has used `csak collect` on a real client target and not hated it.

## Related

- [[specs/slice-1|Slice 1 — Ingest & Report]]
- [[architecture/overview|Architecture Overview]]
- [[product/slices|Slice Plan]]
- [[product/scope|Scope]]
- [[competitive/reconftw|reconFTW]] (case study informing slice 2)
- [[competitive/build-vs-adapt|Build vs Adapt]] (recipe adaptation strategy)
- [[synthesis/open-questions|Open Questions]]
