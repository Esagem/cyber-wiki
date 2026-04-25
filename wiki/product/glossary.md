---
title: "CSAK — Glossary"
category: product
tags: [glossary, vocabulary, definitions]
status: draft
confidence: medium
owner: shared
created: 2026-04-21
updated: 2026-04-25
---

# Glossary

> Shared vocabulary for designing CSAK. Terms here are canonical — every page should use the same word for the same concept. Definitions below match the finalized [[specs/slice-1|slice 1 spec]] and [[specs/slice-2|slice 2 spec]] where applicable. Add a term the moment anyone hedges on what another contributor meant.

## CSAK itself

**CSAK** — the product. Cybersecurity Swiss Army Knife. The codename; the user-facing name is still to be determined.

## Data model entities (slice 1)

**Org** — the top-level container. A client company or equivalent. Reports are scoped per Org. Every Target, Scan, and Finding belongs to exactly one Org.

**Target** — an asset or asset class belonging to one Org. Domains, subdomains, IPs, hosts, URLs, services, or people. Tools produce findings against Targets, not against Orgs. Targets can nest via `parent_target_id`.

**Artifact** — an immutable raw input file. The bytes CSAK ingested from a tool, preserved on disk under a content-addressed path. Artifacts are evidence and are never deleted through CSAK.

**Scan** — one semantic tool execution that produced findings. "The April Nessus scan" or "yesterday's Nuclei sweep." A Scan can span multiple Artifacts (a single Zeek scan includes conn.log, dns.log, and so on), and one Artifact can participate in multiple Scans (re-ingesting the same bytes creates a new Scan event).

**Finding** — a single observation, deduplicated per `(org, source_tool, tool-specific dedup key)`. Attached to a Target. Has severity, confidence, and a derived priority. Has a status: `active | suppressed | accepted-risk | false-positive | fixed`.

**FindingScanOccurrence** — the junction recording every Scan a given Finding has appeared in. The Finding is deduplicated; its history across Scans is preserved here.

## Triage and scoring

**Severity** — how bad a finding would be if real. CSAK's 5-point scale: `critical | high | medium | low | info`, plus `null` when unclassifiable. Per-tool translation tables map each tool's native severity onto this scale.

**Confidence** — how likely the finding is real, as reported by the source tool (or as set by a CSAK default that reflects how much a given tool tends to hallucinate). `high | medium | low`. Tool-assigned, not analyst-assigned.

**`target_weight`** — float on the Target row, default 1.0. Analyst-assigned. Lets the analyst express "public-facing infra matters more than staging." The one axis only the analyst can supply.

**Priority** — derived at ingest time: `priority = severity_weight × confidence_weight × target_weight`. Stored on the Finding row. Re-computed only when an analyst mutates `status` or `tags`, or changes a Target's weight. Editing scoring-table files does not retroactively re-score existing Findings in slice 1.

**Dedup key** — the tool-specific key CSAK uses to decide whether two findings are the same. Nuclei: `template-id + matched-at`. Nessus: `plugin_id + host + port`. Zeek: event-type dependent. osquery: query name + row hash. Subfinder: subdomain. httpx: URL.

**Status** — the lifecycle state of a Finding: `active | suppressed | accepted-risk | false-positive | fixed`. Analyst-mutable. This is how the analyst expresses doubt or resolution about a finding — slice 1 has no intermediate float axis.

## Tool execution (slice 2)

**Collect** — the new `csak collect` stage. The third step in the four-step intake → collect → triage → report product model; CSAK runs tools against a target and feeds their output into the slice 1 ingest pipeline. See [[specs/slice-2|slice 2 spec]].

**Target type** — one of `domain | subdomain | ip | cidr | url`, auto-detected from the `--target` argument. Determines **which** tools run (e.g. Subfinder is skipped for IP targets because subdomain enumeration doesn't apply). See [[specs/slice-2|slice 2 spec §Target type detection and tool routing]]. *Superseded in slice 3 by the runtime type registry — see Target type (slice 3 registry) below. The `cidr` type is renamed to `network_block` in slice 3 to cover ASNs as well as CIDR blocks.*

**Mode** — one of `quick | standard | deep`. Determines **how intensely** each running tool scans (which sources, which template set, how many threads). Mode and target type are orthogonal: target type chooses the tool subset, mode chooses the intensity within each tool. The exception: `quick` mode skips Nuclei entirely, since quick is for "tell me what's there," not for finding vulnerabilities.

**Tool catalog** — the set of Python modules under `csak/collect/tools/<tool>.py`, one per orchestrated tool. Each module implements a shared `Tool` interface (binary, minimum version, install command, `applies_to(target_type)`, per-mode invocation recipes, progress parser, rate-limit signal detector) and carries attribution comments for any recipe adapted from reconFTW. Slice 2 has three modules: subfinder, httpx, nuclei. See [[specs/slice-2|slice 2 spec §Tool catalog]].

**Adaptive rate limiting** — CSAK's default-on behavior of watching tool stderr/stdout for HTTP 429/503 signals (or tool-specific equivalents like Nuclei's `[WRN] context deadline exceeded`), halving the request rate when signals appear, and gradually ramping back up after a quiet window. Floor of 1 req/s, ceiling of the per-tool starting rate. Prevents getting blocked by Cloudflare/WAF/etc. on real targets. See [[specs/slice-2|slice 2 spec §Adaptive rate limiting]].

**`csak doctor`** — the dependency-check + permission-prompted auto-install command. Checks that subfinder, httpx, and nuclei binaries are present and meet the catalog's minimum version requirements; if not, prompts the analyst for permission to install/upgrade via `go install`. `--yes` flag for scripting bypasses the prompt. See [[specs/slice-2|slice 2 spec §`csak doctor`]].

## Recursion and catalog (slice 3)

**Recursion** — opt-in behavior on `csak collect --recurse` where a tool's output is scanned for typed values (subdomains, live hosts, URLs, etc.) that another registered tool accepts as input. Those typed values become inputs for the next depth. Termination is by exhaustion of the recursion frontier, not by budget. See [[specs/slice-3|slice 3 spec §Recursion model]].

**Recursion frontier** — the in-memory set of `(tool_name, target_value, mode)` tuples that have been queued or run during a single `csak collect --recurse` invocation. Used for structural dedup: a tuple already in the set is never queued again. Lives only for the duration of the process; discarded on exit. No cross-invocation persistence. See [[specs/slice-3|slice 3 spec §Termination by exhaustion, not by budget]].

**Recursion depth** — how many layers deep into recursion a Scan ran. `0` for the root scan (the analyst's initial target). `1+` for recursion-triggered scans. Stored on the new `Scan.depth` column. The `--max-depth N` flag bounds the depth; default `3`, `0` means infinite, `1` means no recursion (single-pass slice 2 behavior). See [[specs/slice-3|slice 3 spec §`--max-depth` semantics]].

**Target type** (slice 3 registry) — a named kind of typed input/output value that tools can accept or produce. Slice 3 ships seven core types (`network_block | host | domain | subdomain | url | service | finding_ref`) registered at startup; plugin tools can register additional types via the same mechanism. Types form a partial order via `parents`; a tool that accepts `host` matches a `domain` candidate via subtype widening. Slice 2's flat target-type list is replaced by this registry. See [[specs/slice-3|slice 3 spec §Type system]].

**`TypedTarget`** — the value object representing a typed input or output. Carries `type` (registered type name), `value` (the string), `metadata` (advisory dict; e.g. httpx attaches `{status, tech, title}` to live-host outputs), `source_finding_id` (lineage; null when from initial input), and `parsed` (cached output of the type's `parse` function for compound types like `service`). See [[specs/slice-3|slice 3 spec §Type system]].

**`classify(value)`** — dispatcher that walks the registered types and returns a `TypedTarget` at the most-specific matching type. Used both for the initial `--target` argument resolution and for tool `extract_outputs`. Single seam, single bug surface. Replaces slice 2's hardcoded `csak/collect/detect.py`. See [[specs/slice-3|slice 3 spec §Type system]].

**`accepts` / `produces`** — declarations on the `Tool` interface (slice 3 extension) listing the target type names a tool can take as input and emit as output. The runner builds the recursion graph from these declarations. A tool that wants to be strict declares the leaf type (`accepts: [domain]`); a tool that's flexible declares the parent (`accepts: [host]`) and matches subtypes via widening. See [[specs/slice-3|slice 3 spec §Tool catalog]].

**`extract_outputs(artifact_path, scan)`** — method on the `Tool` interface (slice 3 extension) returning `list[TypedTarget]`. Implemented per-tool to pull recursion candidates out of the tool's own artifact. Typically small — read the artifact, extract relevant strings, call `classify` on each. The boundary: `extract_outputs` decides which fields are real outputs (per-tool knowledge); `classify` does pure type detection (shared). See [[specs/slice-3|slice 3 spec §Tool catalog]].

**Plugin tool** — a `*.py` file dropped in `~/.csak/tools/` that registers a tool (and possibly new target types) into the same toolbox as built-ins. Discovered at `csak collect` startup; participates in routing, dedup, live output, and Scan recording identically to built-ins. Plugin trust posture: full Python under analyst's permissions, no sandbox (deferred). See [[specs/slice-3|slice 3 spec §Plugin discovery]] and [[synthesis/deferred-features|deferred-features]].

**Recursion graph** — the directed graph computed at runtime from `accepts`/`produces` declarations across the registered toolbox. Nodes are tools; edges are "this tool's output type matches that tool's accept type." `csak tools show <tool>` renders the live recursion graph reachable from a given tool. Self-describing, not maintained by hand.

**`csak tools list` / `csak tools show <tool>`** — introspection commands for the catalog. `list` shows every registered tool, accepts/produces, and source (built-in or plugin path). `show` shows full catalog metadata, modes, rate-limit defaults, and the live recursion graph. Both are pure read of the runtime registry. See [[specs/slice-3|slice 3 spec §`csak tools`]].

## Deliverables

**Report** — a deliverable produced by `csak report generate`, scoped to (Org, time window, kind). **Not a stored entity.** Each invocation is a stateless pipeline: query current state, render files, exit. The directory of timestamped output files is the history. A report is aware only of its own window.

**Internal Review** — the analyst-team-facing report kind. Technical, thorough, preserves ambiguity and caveats.

**Fix-it Ticket Bundle** — the client-facing report kind. Plain-language tickets ready to forward as-is. Packaged as a directory of files plus a `.zip`.

**Export formats** — slice 1 ships **markdown** (primary authoring format, Jinja2 templates), **docx** (python-docx, Word-native for clients), and **JSON** (machine-readable, stable schema, designed as the input for a future LLM layer). All three are first-class.

**Report context** — the Python object built from the current Finding/Scan/Target state, consumed by all renderers. The invariant that keeps markdown, docx, and JSON aligned: same content, same section order, same source.

## Components

**Ingestor** — a component that knows how to read one kind of input (Nessus XML, Nuclei JSONL, a Zeek log directory, etc.) and produce Scans, Artifacts, and Findings. "Parser" is used interchangeably in implementation language; "ingestor" is the preferred design-doc term.

**Renderer** — a format-specific component that turns a report context into output files. Slice 1 has three: markdown, docx, JSON. The rendering layer is designed as a plugin set so later formats (HTML, PDF, CSV) drop in without changing the query path.

**Scoring table** — a YAML file under `config/triage/severity/<tool>.yaml` that maps a tool's native severity values onto CSAK's 5-point scale. Versioned as files; editing them does not retroactively re-score existing Findings.

## Workflow and invocation

**On-demand / real-time invocation** — CSAK's default mode. Analyst runs `csak report generate` or `csak collect` during active work and expects output in seconds to minutes. Slices 1 and 2's only invocation mode.

**Scheduled / automated invocation** — future work (slice 4+). Cron-style or event-triggered report generation. Not designed yet.

**Streaming / continuous detection** — indefinitely out of scope. SIEM territory.

## Terms we're deliberately not using (yet)

**Engagement** — DefectDojo's term for a scoped piece of work over a time window. CSAK doesn't use it as a first-class entity in slice 1 — the (Org, time window) pair scoping a report covers the same need. Could return later if it earns its place.

**Playbook** — speculative vocabulary from an earlier iteration. Would mean "a repeatable procedure CSAK follows to turn a kind of input into a kind of output." Not used anywhere in the slice 1 or slice 2 spec. Revisit only if a concrete need surfaces.

**Importance** — conflates severity and priority. Use the specific term. Severity is tool-assigned, priority is derived.

**`probability_real`** — was discussed during slice 1 design as an analyst-assigned float (0.0–1.0) expressing "probably a false positive but not ready to commit." Removed from slice 1. The analyst expresses doubt via `status` (`active` / `suppressed` / `false-positive`) or via freeform `tags`. If the trichotomy proves too coarse in practice, a later slice can revisit.

**Action class / disposition** — old term for Finding status. The canonical set is `active | suppressed | accepted-risk | false-positive | fixed`.

**Quick rescan** — reconFTW pattern of skipping heavy stages when no new assets have been discovered. Considered for slice 2 and deliberately rejected — every `csak collect` invocation runs the full pipeline fresh. May revisit in a later slice if it earns its place.

## Terms to avoid in user-facing copy

- "AI-powered" — too vague, too marketing. Say specifically what's deterministic and what's LLM-driven.
- "Swiss Army Knife" in user-facing copy. Internal codename only.
- "Periodic" or "scheduled" when describing slice 1 or slice 2. Both are on-demand.

## Related

- [[specs/slice-1|Slice 1 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[specs/slice-3|Slice 3 Spec]]
- [[product/vision|Vision]]
