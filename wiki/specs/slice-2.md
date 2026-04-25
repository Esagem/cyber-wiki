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

> Second draft, 2026-04-24. Refined per Eli's feedback: target type auto-detection drives tool routing (CSAK identifies what the target is, then runs only the tools that apply), structured live output with progress bars and ETA, `csak doctor` with auto-install on permission, error and zero-finding outcomes both logged. Python module per tool for the catalog. Status stays `draft` pending review.

## Goal

Take a target, identify what type of target it is, run the appropriate offensive-recon tools against it, hand the resulting artifacts to the slice 1 ingest pipeline. The analyst types one command; CSAK figures out which tools apply, invokes them with the right flags, captures output, handles rate limiting, and surfaces clean progress to the terminal.

The four-step product model is **intake → collect → triage → report**. Slice 1 shipped intake-as-file-handoff plus triage and report. Slice 2 ships **collect** for the on-demand active tools that make sense to invoke from a CLI.

This is the first slice where CSAK touches the network. Everything before this was reading files the analyst had already collected.

## Scope

### In scope

- **`csak collect` command** that identifies the target type, selects the appropriate tools, runs them against the target, and feeds output to the slice 1 ingest pipeline.
- **Three tools orchestrated in slice 2:** Subfinder, httpx, Nuclei.
- **Target type auto-detection** drives which tools run — domain triggers full pipeline, IP/CIDR/URL triggers a subset.
- **Three modes:** `quick`, `standard` (default), `deep`. Modes control *intensity* within each running tool; target type controls *which* tools run.
- **Pipeline shape:** identified-tool-set runs in dependency order, each stage producing an Artifact that flows through slice 1's existing ingest path.
- **Adaptive rate limiting** default-on, applied across all tools.
- **Per-tool overrides** at the CLI for power users.
- **Sync invocation only.** The collect command blocks until completion. Per-stage `--timeout` flags with sensible defaults.
- **Live structured output** to terminal: target type identification, tool assignment, per-tool progress bars with elapsed time and ETA, final per-tool success/failure summary with output paths.
- **Stage failures and zero-finding outcomes both logged** as part of the Scan record. Pipeline continues on stage failure with whatever upstream data exists.
- **Tool catalog** as Python module per tool (`csak/collect/tools/<tool>.py`) carrying invocation recipes, target-type routing, rate-limit defaults, version requirements, and attribution to reconFTW where recipes were adapted.
- **`csak doctor` command** that checks for required external tool binaries and version compatibility, with a permission-prompted auto-install fallback via `go install`.
- Integration with slice 1's data model and reporting — Findings produced by `csak collect` look identical to Findings produced by `csak ingest`.

### Out of scope

- **Zeek and osquery orchestration.** Deployment-shaped tools (continuous network monitor, host-resident agent), not on-demand CLI-runnable. Stay ingest-only as in slice 1.
- **Nessus orchestration via API.** Deferred to slice 2.5 or later. Nessus stays ingest-only via `.nessus` XML as in slice 1.
- **reconFTW JSON ingest.** Deferred indefinitely. With slice 2's native orchestrator, the analyst doesn't need to pipe reconFTW output to CSAK.
- **Generic CSV ingest.** Still deferred.
- **Recursion.** Tool output does not trigger further tool runs. Slice 3.
- **Async / background / scheduled scans.** Sync-only. Long-running scans block the CLI.
- **Quick rescan / staleness detection.** Every `csak collect` invocation runs the full pipeline fresh. Re-evaluated in a later slice if it earns its place.
- **LLM use anywhere.** Same posture as slice 1 — slice 2 stays deterministic. Tool selection is heuristic via target type and mode flags, not LLM-assisted.
- **Distributed / cloud-fleet scanning.** No Axiom-style multi-VPS coordination. Single-machine.
- **Configuration-by-knob explosion.** Three modes plus per-tool overrides — not 300 booleans.
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

## Target type detection and tool routing

CSAK identifies the target type from the `--target` argument and runs only the tools that apply. This is the heart of slice 2's "do the right thing" promise — the analyst doesn't have to know which tools fit which target.

### Detection logic

| Input shape | Identified type | Detection rule |
|-------------|----------------|----------------|
| `acmecorp.com` | **domain** | Resolves to a registrable apex domain (no subdomain prefix, public suffix list match) |
| `api.acmecorp.com` | **subdomain** | Resolves to a hostname that is a subdomain of a registrable apex |
| `10.0.0.42`, `2001:db8::1` | **ip** | Parses as IPv4 or IPv6 address |
| `10.0.0.0/24`, `2001:db8::/64` | **cidr** | Parses as a CIDR block |
| `https://api.acmecorp.com/v2/users` | **url** | Has a scheme (`http://`, `https://`) and path |
| Anything else | **invalid** | Hard error before running anything |

Detection happens once at command entry and is logged in the live output before any tool runs.

### Tool routing matrix

| Target type | Subfinder | httpx | Nuclei | Notes |
|-------------|-----------|-------|--------|-------|
| **domain** | ✓ | ✓ | ✓ | Full pipeline. The canonical case. |
| **subdomain** | ✗ skipped | ✓ | ✓ | Subfinder skipped — the subdomain *is* the input. httpx confirms it's live; nuclei scans it. |
| **ip** | ✗ skipped | ✓ | ✓ | No subdomain enumeration possible; httpx + nuclei work directly on IPs. |
| **cidr** | ✗ skipped | ✓ (per host in range) | ✓ (per live host) | CSAK expands the CIDR, httpx live-checks each, nuclei scans the live ones. Subnet expansion respects the rate-limit ceiling. |
| **url** | ✗ skipped | ✗ skipped | ✓ | Already a known endpoint; nuclei runs directly. httpx skipped because we already know the URL is "interesting." |

**Skipped tools are logged as Scans with `status = skipped` and zero Findings.** They don't fail; they just don't apply. The analyst sees in the live output (and in the Scan record) why each tool was skipped — "Subfinder skipped: target type is IP." This makes routing decisions auditable.

### Mode interaction with routing

Mode and target type are orthogonal:

- Mode controls **how intensely** each running tool scans (passive vs all sources, default templates vs full templates).
- Target type controls **which** tools run.

`csak collect --target 10.0.0.0/24 --mode deep` runs httpx + nuclei against the expanded CIDR with deep-mode template selection — but Subfinder is still skipped because it doesn't apply.

## Pipeline shape

### Standard flow (domain target)

```
csak collect --org acmecorp --target acmecorp.com [--mode standard]

  Detect: identified target acmecorp.com as type=domain
          assigning tools: subfinder + httpx + nuclei
  
  Stage 1: subfinder
    invocation: subfinder -d <target> -all -silent -oJ -o <out>/subdomains.jsonl
    output:     <artifact-store>/<hash>/subdomains.jsonl
    side effect: Artifact row written to SQLite
    on failure:  Scan recorded with status=failed; pipeline continues with target as input
                 to stage 2
    on zero output: Scan recorded with 0 Findings; pipeline continues with target as input
                    to stage 2

  Stage 2: httpx
    invocation: httpx -l <subfinder output OR target> -j -o <out>/live-hosts.jsonl
    input:      stage 1's Artifact (or the bare target if stage 1 failed/produced nothing)
    output:     <artifact-store>/<hash>/live-hosts.jsonl
    side effect: Artifact row written to SQLite
    on failure:  Scan recorded with status=failed; pipeline aborts (nuclei has nothing to
                 scan against)
    on zero output: Scan recorded with 0 Findings; pipeline aborts (no live hosts)

  Stage 3: nuclei
    invocation: nuclei -l <httpx live hosts> -j -o <out>/findings.jsonl [...templates per mode]
    input:      stage 2's Artifact (live hosts only)
    output:     <artifact-store>/<hash>/findings.jsonl
    side effect: Artifact row written to SQLite
    on failure:  Scan recorded with status=failed
    on zero output: Scan recorded with 0 Findings (no vulnerabilities detected — a valid
                    outcome, not an error)

  Ingest: each Artifact runs through the existing slice 1 ingest pipeline
    → Scans + Findings land in CSAK's SQLite
    → ready for csak findings list, csak report generate, etc.

  Exit: print summary with per-tool status (succeeded / failed / skipped),
        finding counts by severity, and Artifact paths
```

Each stage produces an **Artifact** in CSAK's existing `artifacts/` content-addressed store. The slice 1 ingest pipeline (`csak.ingest.pipeline`) picks up each artifact and produces Findings normally. **Slice 2's collect stage is a new on-ramp to slice 1's existing ingest pipeline, not a replacement for it.**

### Variant flows

- **Subdomain target:** stage 1 skipped, stages 2-3 run as above.
- **IP target:** stage 1 skipped, stages 2-3 run with the IP as input to httpx.
- **CIDR target:** stage 1 skipped, CSAK expands the CIDR to a host list, stage 2 runs against the list, stage 3 runs against the live subset.
- **URL target:** stages 1-2 skipped, stage 3 runs directly against the URL.

### Per-stage Artifact and Scan model

Each stage's tool output is a first-class CSAK Artifact:

- Bytes content-addressed under `artifacts/<hash-prefix>/<hash>` exactly as in slice 1.
- Artifact row records `source_tool`, `received_at`, `path`, `hash`.

Each stage also produces a Scan record:

- Scan rows are written even when the stage failed or produced zero Findings — they document what CSAK attempted, with `Scan.notes` carrying any error details.
- Failed/skipped Scans show up in `csak scan list` so the analyst can see exactly what happened during a collect run.
- Skipped stages produce Scans with `Scan.notes = "skipped: <reason>"` and no associated Artifact.

## Modes

Three modes, no config-file knob explosion. The mode determines tool intensity within each running tool — it does not determine which tools run (that's target type's job).

| Mode | Subfinder behavior | httpx behavior | Nuclei templates | Time target |
|------|---------------------|----------------|------------------|-------------|
| `quick` | passive sources only | default checks | (skipped — quick mode skips nuclei entirely) | seconds |
| `standard` (default) | all sources | default checks | default templates (severity ≥ low) | minutes |
| `deep` | all sources, slower providers included | full check set including tech detection | full templates including info-severity | tens of minutes |

**`quick` mode skips Nuclei entirely** even when it would otherwise apply. This is the only case where the mode affects which tools run rather than how they run, and it's deliberate — quick mode exists for "tell me what's there" reconnaissance, not for "find vulnerabilities."

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

**Why three modes is the right number.** Two is too few — `quick` and `full` lose the nuance between "I want a real scan but not all night" and "I want full coverage." Four-plus is too many — each additional mode is one more decision the analyst has to make at every invocation.

**Rationale for no config file in slice 2.** [[competitive/reconftw|reconFTW]]'s 300-knob config is exactly the burden CSAK is trying to avoid. Modes plus per-tool overrides cover real usage; if a real analyst writes the same `--nuclei-templates X --nuclei-rate-limit Y` combination ten times, that's signal to add a new mode or a per-org default — not signal to ship a 300-line YAML.

## Tool catalog — Python module per tool

Each orchestrated tool is a Python module under `csak/collect/tools/<tool>.py`. Three tools in slice 2 → three modules. Each module is a small class implementing a shared `Tool` interface:

```
class Tool:
    name: str                                       # "nuclei"
    binary: str                                     # "nuclei"
    minimum_version: str                            # "3.0.0"
    install_command: str                            # "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest"

    def applies_to(target_type: TargetType) -> bool: ...
    def invocation(target, mode, overrides) -> list[str]: ...
    def parse_progress(stderr_line) -> ProgressUpdate | None: ...
    def detect_rate_limit_signal(stderr_line) -> bool: ...
```

Each module also carries:

- **Per-mode invocation recipes** as data (dict keyed by mode → flag list).
- **Rate limit defaults** (starting requests/second, floor, ceiling).
- **Timeout defaults** (per-mode soft and hard deadlines).
- **Attribution comments** for any recipe adapted from reconFTW: `# source: reconFTW v4.0 modules/web.sh`.

### Why Python module, not YAML

Considered both. Picked Python for slice 2 because:

- **Each tool needs real logic.** `applies_to(target_type)` returns a boolean per type, `invocation()` builds a flag list with conditional branches (override resolution, mode-dependent template selection), `parse_progress()` matches tool-specific stderr patterns. YAML can't express these without a schema that grows uglier than the equivalent Python.
- **Type checking and IDE support.** A new contributor adding a tool gets immediate feedback on missing fields. YAML errors are runtime.
- **Three tools is a small surface.** The "lower barrier to adding tools" argument that favors YAML cuts the wrong way at this size — adding a tool *should* require thinking, because each tool needs target-type routing and recipe choices that humans should make consciously.
- **Reversal is cheap if YAML wins later.** Once the catalog grows past ~10 tools and the variation patterns stabilize, a YAML schema can be derived from the Python modules. Slice 2 doesn't need that flexibility yet.

The shared `Tool` interface lives in `csak/collect/tool.py`. The three slice 2 tools (`csak/collect/tools/subfinder.py`, `httpx.py`, `nuclei.py`) implement it.

### Attribution

Every recipe adapted from reconFTW carries a comment in the catalog file:

```python
INVOCATIONS = {
    "standard": [
        "-all", "-silent",            # source: reconFTW v4.0 modules/subdomains.sh
    ],
    ...
}
```

When the catalog grows past a handful of attributions, a `research/references.md` page should consolidate them. Low priority; add when the second tool catalog file lands a reconFTW-derived recipe.

## Adaptive rate limiting

CSAK applies adaptive rate limiting across all stages by default. A `--no-adaptive-rate` flag for power users who want fixed-rate behavior is acceptable but not required for slice 2.

### What it does

When CSAK fires HTTP requests through Nuclei, httpx, or Subfinder's API-backed sources, the target (or the API gateway in front of it) pushes back at high rates with HTTP `429 Too Many Requests` or `503 Service Unavailable`. A naive scanner ignores those and keeps hammering — the target then drops further requests entirely, blacklists the source IP, or returns garbage that corrupts the scan's output.

CSAK's adaptive rate limiter watches for those signals and slows down automatically:

- **Detect:** scan each tool's stderr/stdout for rate-limit signals (429, 503, "rate limit exceeded" strings, or whatever the tool exposes via `parse_progress`/`detect_rate_limit_signal` in its catalog module).
- **Back off:** halve the request rate when signals appear. Continue running.
- **Recover:** gradually ramp back up after a quiet window.
- **Floor:** never drop below a configured minimum (default: 1 req/s) — at some point we stop scanning rather than crawl.
- **Ceiling:** never exceed a configured maximum (default: per-tool starting rate) — we don't speed past safe limits even if no 429s appear.

Rate-limit adjustments are surfaced in the live output: "nuclei: detected rate limiting, reducing to 25 req/s."

### Why it matters

Real targets push back. Cloudflare, AWS WAF, Azure Front Door, and most managed-API providers rate-limit aggressive clients. CSAK against a production target without rate limiting gets throttled or blocked within minutes, and the analyst gets a partial scan with garbage data. Aggressive scans also look like an attack to the target's defensive team — slower, well-behaved scans are less likely to trigger an incident response on the client side or get the analyst's IP reported.

reconFTW ships this (`--adaptive-rate` flag) precisely because they hit the problem repeatedly. It's not theoretical; it's what happens the first time CSAK scans a real target.

### Implementation shape

A small wrapper around each subprocess invocation. ~100-200 lines of Python. Per-tool starting rates and adjustment policies live in the tool catalog. The wrapper is the same shape across all three slice 2 tools — the variation is only in *which* stderr/stdout patterns count as a rate-limit signal, and that lives in each tool's module.

## Long-running tools

Slice 2 is **sync-only**. The `csak collect` command blocks until the full pipeline finishes. There is no async, no daemon, no background-job system.

### Mitigations

- **`quick` mode** for analysts who need an answer in seconds.
- **`--timeout` flags per stage**, with sensible defaults (subfinder: 60s, httpx: 5min, nuclei: 30min in standard mode, 2hr in deep mode). Exceeding a stage timeout aborts that stage cleanly, captures partial output as an Artifact, records the Scan as `status=failed` with the timeout reason, and continues to the next stage with whatever data the failed stage produced.
- **Live progress to stderr** (see §Output format below). The analyst can see what's happening; the command isn't a black box.
- **Ctrl-C is graceful.** The current stage's tool gets a SIGTERM, partial output captured as an Artifact, ingest runs on what we have, command exits cleanly with a non-zero status code.

### Why sync-only in slice 2

Async / background / daemon adds significant scope: process management, persistence of run state across CLI invocations, status-query commands, lifecycle operations (cancel, resume). None of that is necessary for the core slice 2 question — "can CSAK run the tools." If long-running scans become a real friction in practice, slice 3 adds backgrounding cleanly on top of the sync-mode foundation.

The trade-off is honest: a `csak collect --mode deep` against a complex target may run for an hour and the analyst has to leave the terminal open. We accept that for slice 2.

## Output format

Live, structured terminal output. Informative without spam. The analyst sees what CSAK is doing and what it found, in real time, without having to read 10,000 lines of tool output.

### Phases of output

**Phase 1 — Detection.** Single line:

```
[csak] Identified target acmecorp.com as type=domain
[csak] Assigned tools: subfinder, httpx, nuclei  (mode=standard)
[csak] Skipped: (none)
```

If any tools are skipped (subdomain target, IP target, etc.), they're listed on the Skipped line with reasons:

```
[csak] Identified target 10.0.0.0/24 as type=cidr
[csak] Assigned tools: httpx, nuclei  (mode=standard)
[csak] Skipped: subfinder (no subdomain enumeration for IP/CIDR targets)
```

**Phase 2 — Per-stage progress.** Each running stage gets a live progress line. Sequential stages get sequential progress bars; this is *not* parallel — Nuclei needs httpx output, httpx needs subfinder output. The stages are inherently serial.

```
[subfinder] ████████████████████ 100%  elapsed=12s   eta=0s    found=87 subdomains
[httpx]     ████████████░░░░░░░░  62%  elapsed=43s   eta=27s   live=34/87
[nuclei]    ░░░░░░░░░░░░░░░░░░░░   0%  pending — waiting for httpx
```

The progress bars update in place (using ANSI cursor controls). The analyst sees:
- Which stage is currently running.
- Percentage complete (where the tool exposes one).
- Elapsed time and estimated time-to-completion.
- Running counts of what's been found.

For tools that don't expose progress percentage (Subfinder is one — it streams subdomains as it finds them), CSAK shows running counts and elapsed time without a percentage bar:

```
[subfinder] streaming…   elapsed=12s   found=87 subdomains
```

**Adaptive rate limit adjustments** print on their own line below the progress bars when they happen:

```
[nuclei] detected rate limit signal — reducing rate to 25 req/s
```

**Phase 3 — Per-tool completion.** As each stage finishes, its progress line resolves to a one-line summary:

```
[subfinder] ✓ done   elapsed=12s   found=87 subdomains   → artifacts/ab/abc123/subdomains.jsonl
[httpx]     ✓ done   elapsed=78s   live=34/87           → artifacts/cd/cde456/live-hosts.jsonl
[nuclei]    ✓ done   elapsed=4m23s findings=12 (1 high, 4 medium, 7 low)  → artifacts/ef/ef789/findings.jsonl
```

For failed stages:

```
[subfinder] ✗ failed elapsed=60s  reason=timeout exceeded → no artifact
[httpx]     ✓ done   elapsed=78s  live=1/1               → artifacts/cd/cde456/live-hosts.jsonl
[nuclei]    ✓ done   elapsed=4m23s findings=12 (1 high, 4 medium, 7 low)  → artifacts/ef/ef789/findings.jsonl
```

For zero-finding outcomes (a valid result, not an error):

```
[nuclei]    ✓ done   elapsed=4m23s findings=0 (no vulnerabilities detected)   → artifacts/ef/ef789/findings.jsonl
```

**Phase 4 — Final summary.** After all stages finish:

```
[csak] Collect complete for acmecorp.com (mode=standard)
[csak] Total elapsed: 5m23s
[csak] Scans created: 3 (subfinder, httpx, nuclei)
[csak] Findings: 12 new, 0 re-occurrences
[csak] Artifacts: 3 → /home/eli/.csak/artifacts/
[csak] Run `csak findings list --org acmecorp` to review
```

### Why this format

- **Live progress prevents the "is it stuck?" problem.** The analyst always knows whether the tool is making progress or hanging.
- **Per-tool ETA prevents the "how long?" problem.** Even rough estimates are better than nothing.
- **Final paths printed prevent the "where did the output go?" problem.** Analyst can immediately `cat` an artifact if they want to verify.
- **Skipped tools surfaced make routing decisions auditable.** Analyst sees that subfinder was skipped *and why* — no surprise omissions.
- **Rate-limit events visible** prevent the "why is this slow?" surprise.

### What the format avoids

- **No raw tool output.** The analyst can `cat` the Artifacts if they want; CSAK's job is summary.
- **No per-finding chatter during the run.** Findings are reported in the final summary count; the per-finding detail lives in `csak findings list` afterward.
- **No log noise from internal CSAK operations.** Database writes, progress polling, etc. happen silently unless they fail.

A `--verbose` flag toggles raw tool stderr/stdout pass-through for analysts who want to see what's actually happening. A `--quiet` flag suppresses progress bars (useful for CI / scripting), leaving only the final summary.

## `csak doctor` — dependency check and auto-install

Slice 2 introduces a new top-level command for managing the external tool binaries CSAK depends on.

### What it does

```
csak doctor
```

1. Reads the slice 2 tool catalog (subfinder, httpx, nuclei).
2. For each tool: checks the binary is on PATH, runs the tool's version flag, compares against the catalog's `minimum_version`.
3. Reports per-tool status: ✓ present and compatible, ⚠ present but outdated, ✗ missing.
4. For any ✗ or ⚠ entries: **prompts the analyst for permission** to auto-install or upgrade via the catalog's `install_command` (typically `go install -v github.com/projectdiscovery/<tool>/v<n>/cmd/<tool>@latest`).
5. If the analyst grants permission, runs the install command, then re-checks. If denied, lists the install commands so the analyst can run them manually.

### Example session

```
$ csak doctor
Checking external tool dependencies...

  ✓ subfinder    v2.6.4 (>= 2.6.0)
  ⚠ httpx        v1.3.7 (< 1.4.0, recommended upgrade)
  ✗ nuclei       not found on PATH

The following actions can be taken:
  - upgrade httpx to latest    via: go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
  - install nuclei             via: go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

Proceed? [y/N]: y

  ⏳ upgrading httpx...   ✓ installed v1.4.2
  ⏳ installing nuclei... ✓ installed v3.1.8

All tools present and compatible. CSAK collect is ready.
```

### Why permission-prompted

`go install` modifies `$GOPATH/bin` and downloads from the network. Analysts running CSAK on a managed work laptop or a hardened scan box may not want CSAK silently installing things. The permission prompt protects against surprise system changes; in non-interactive contexts (`--yes` flag for scripting) the prompt is bypassed.

### When `csak doctor` runs

Three triggers:

1. **Manually**, by the analyst, before their first `csak collect` invocation.
2. **Automatically** the first time `csak collect` is invoked, if the catalog's required binaries aren't all present. The same prompt applies.
3. **On `csak collect` failure** if the failure looks like "binary not found" or "binary too old," CSAK suggests `csak doctor` in the error output.

### What `csak doctor` does not do

- Doesn't manage Go itself. If `go` isn't installed, `csak doctor` reports the requirement and points the analyst at golang.org. CSAK isn't going to install a language toolchain.
- Doesn't manage Nuclei templates separately. The templates ship with Nuclei via `nuclei -update-templates`, run automatically the first time `csak collect` invokes Nuclei.
- Doesn't roll back. Upgrades are forward-only. If a new tool version breaks something, the analyst can pin via `go install ...@<version>` manually.

## Concurrent collect runs

Two `csak collect` invocations against the same org or even the same target at the same time are **allowed and harmless.** SQLite WAL mode handles concurrent writes; each run produces its own Artifacts and Scans, and the slice 1 dedup layer collapses any duplicate Findings naturally via `last_seen` advancement and FindingScanOccurrence rows.

The only real cost is wasted compute and network — running subfinder twice in parallel against the same target won't break anything but produces redundant work. Slice 2 doesn't add a soft-lock to prevent this; the analyst can avoid it by not doing it. If concurrent collects against the same target become a real problem in practice, a later slice can add a soft warning ("a collect run for this target is already in progress; continue anyway? [y/N]"). Not slice 2.

## Interface

### `csak collect`

The new top-level command:

```
csak collect --org <org> --target <target> [--mode <mode>] [tool overrides] [--timeout-* <sec>]
             [--no-adaptive-rate] [--verbose] [--quiet] [--yes]
```

Examples:

```
csak collect --org acmecorp --target acmecorp.com
csak collect --org acmecorp --target api.acmecorp.com --mode quick
csak collect --org acmecorp --target acmecorp.com --mode deep \
             --nuclei-templates ~/my-templates \
             --timeout-nuclei 7200
csak collect --org acmecorp --target 10.0.0.0/24 --mode standard
csak collect --org acmecorp --target https://api.acmecorp.com/v2/users
```

The `--target` flag accepts a domain, subdomain, IP, CIDR, or URL. Target type is auto-detected; the appropriate tool subset runs.

### `csak doctor`

```
csak doctor [--yes]
```

`--yes` skips the install permission prompt for scripting / CI.

### Existing CLI surface unchanged

Every slice 1 command works identically against collect-produced data:

```
csak findings list --org acmecorp                    # shows findings from collect runs
csak findings show <id>                              # shows scan lineage including collect Scans
csak scan list --org acmecorp                        # collect runs appear as Scans (incl. skipped/failed)
csak report generate --org acmecorp --period today   # reports include collect findings
```

This is the load-bearing invariant: slice 2 doesn't fork the data path. Collect-produced findings flow through the same pipeline as ingest-produced findings.

### Exit codes

- `0` — collect ran end to end, all stages succeeded (or completed within their soft timeouts with partial output).
- Non-zero — one or more stages had hard failures (binary not found, target invalid, network unreachable, all stages failed). Partial Artifacts and Findings are still persisted; exit code signals the analyst should look at the live output and `csak scan list` for details.

## Storage

No changes to the slice 1 data model. Slice 2 uses existing tables:

- **Artifact** rows for each stage's output (none for skipped stages).
- **Scan** rows for each stage attempted, including failed and skipped stages. A single `csak collect` invocation produces multiple Scans (one per stage), all sharing a `Scan.label` like "csak collect 2026-04-24T08-30-00 — acmecorp.com standard mode." `Scan.notes` carries failure or skip reasons. Linked to Artifacts via `Scan.artifact_ids` (empty for skipped stages).
- **Finding** rows from each Scan, deduped against existing Findings via the slice 1 dedup keys.

Slice 2 introduces no new tables. The collect path uses the existing storage layer end to end.

## Dependencies

Slice 2 adds runtime dependencies on three external binaries:

- **subfinder** — Go binary. Catalog: `csak/collect/tools/subfinder.py`.
- **httpx** — Go binary. Catalog: `csak/collect/tools/httpx.py`.
- **nuclei** — Go binary. Catalog: `csak/collect/tools/nuclei.py`. Templates managed via `nuclei -update-templates`.

Plus Go itself (≥ 1.21). CSAK doesn't bundle Go or the binaries; `csak doctor` checks for them and offers to install via `go install` with permission. See §`csak doctor` above.

**No reconFTW.** Per the case study and the [[competitive/build-vs-adapt|build-vs-adapt]] analysis, CSAK does not depend on reconFTW. Recipes adapted from reconFTW with attribution; orchestration code is CSAK-native.

## What slice 2 explicitly does not solve

- **Recursion.** Tool output does not trigger further tool runs. Slice 3.
- **Async / background / scheduled scans.** Slice 3 if needed.
- **Quick rescan / staleness detection.** Later slice if ever.
- **Tool selection beyond target type and mode.** Slice 2 doesn't pick tools dynamically beyond the type/mode matrix; the analyst doesn't get to ask CSAK "what tools should I run."
- **Zeek and osquery orchestration.** Indefinitely out of scope (operationally different shape).
- **Nessus API orchestration.** Slice 2.5 or later.
- **reconFTW JSON ingest.** Deferred indefinitely.
- **Generic CSV ingest.** Still deferred.
- **Distributed / cloud-fleet scanning.** Single-machine, like slice 1.
- **LLM use.** Slice 2 stays deterministic, same posture as slice 1.
- **Web UI, ticketing integration, multi-user, scheduling.** Same as slice 1.

## Exit criteria

Slice 2 is "done" when:

- `csak collect --org X --target acmecorp.com` runs the full subfinder + httpx + nuclei pipeline against a real target, produces Artifacts and Scans (including any failed/skipped Scans), and the resulting Findings appear in `csak findings list` afterward.
- Target type auto-detection correctly routes domain, subdomain, IP, CIDR, and URL targets to the appropriate tool subset; skipped tools are recorded as Scans with `notes` explaining why.
- All three modes (`quick`, `standard`, `deep`) produce reasonable output against a real target. `quick` finishes in seconds (and skips Nuclei), `standard` in minutes, `deep` may take longer but stays bounded by stage timeouts.
- Per-tool overrides at the CLI work — analyst can pass `--nuclei-templates`, `--nuclei-rate-limit`, etc. without editing config files.
- Adaptive rate limiting kicks in on a target that returns 429s, the analyst sees the rate-adjustment event in the live output, and the scan completes instead of getting blocked or producing garbage. Verifiable with a synthetic test against a rate-limited endpoint.
- Stage timeouts cleanly abort runaway tools, capture partial output as Artifacts, mark Scans as failed, and continue the pipeline.
- Stage failures and zero-finding outcomes are both logged as Scans (with appropriate notes) and visible in `csak scan list`.
- Ctrl-C is graceful — current stage SIGTERM'd, partial output captured, ingest runs on what we have, exit clean.
- `csak doctor` correctly identifies missing or version-incompatible tool binaries with actionable error messages and offers permission-prompted auto-install.
- Live output during `csak collect` shows target identification, tool assignment, per-stage progress with elapsed/ETA, rate-limit adjustments, and a final summary with finding counts and Artifact paths. `--verbose` and `--quiet` flags work.
- Methodology in `csak report generate` output correctly cites "via csak collect" Scans, distinguishable from analyst-uploaded ingest Scans.
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
