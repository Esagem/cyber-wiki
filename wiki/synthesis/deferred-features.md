---
title: "Deferred Features — Review Backlog"
category: synthesis
tags: [deferred, future, slice-3-plus, backlog, review]
status: active
confidence: high
owner: shared
created: 2026-04-25
updated: 2026-04-26
---

# Deferred Features — Review Backlog

> Single-page consolidation of every feature, capability, or design idea labeled "later slice," "slice 4+," "future work," or similar across the wiki. Created during slice 3 design as a review backlog: once slice 3 ships, walk this page top to bottom and decide what graduates into a real slice, what stays deferred, and what gets retired.
>
> **This page is a view, not a relocation.** Each item points back to its original home; the rationale and full context live there. Source pages keep their deferred-item language so design context isn't fragmented. If a deferral changes status (graduates, gets rejected, moves horizons), update the source page first, then update this page to match.
>
> **What's not on this page:** items that are definitively *rejected* rather than deferred. "Indefinitely out of scope" items (streaming detection, building our own scanner, mobile, etc.) live at the bottom in a short `Definitively declined` section so we don't accidentally re-litigate them, but they aren't the review focus.

## Organization

Items are grouped by **horizon** — when we'd plausibly revisit them — not by source page. Within each horizon, items are ordered roughly by how likely they are to graduate.

Each entry has:

- **What** — one-line description.
- **Trigger** — the condition that would make us pull this forward.
- **Source** — wikilink to where it was originally raised, with section pointer where useful.

---

## Slice 3-introduced deferrals

Items raised during slice 3 design and deliberately punted. **Review these first** when slice 3 ships, because they're the freshest and most directly downstream.

### Plugin sandboxing for third-party tools

- **What.** Slice 3 lets analysts drop Python files in `~/.csak/tools/` to add new tools to the catalog. Plugins run as full Python under the analyst's user permissions — no sandbox, no signature verification, no load-time warnings. CSAK does not protect the analyst from a malicious or buggy plugin.
- **Why deferred.** Slice 3's posture is "trust the analyst's choice of plugin, same as trusting any script they downloaded." Sandboxing adds substantial complexity (process isolation, capability restriction, IPC for typed-target results, plugin manifest schema) that earns its place only if (a) third-party plugin distribution becomes common, or (b) a real incident or near-miss surfaces.
- **Trigger.** Either: an analyst reports a plugin caused harm or near-harm; *or* CSAK gets shared widely enough that "I downloaded a plugin from a stranger" becomes a normal use case; *or* a future slice introduces multi-user / shared-host scenarios where one user's plugin choice affects another.
- **Possible shapes when revisited.** Capability declarations in plugin headers (filesystem, network, subprocess); load-time warnings for plugins requesting elevated capabilities; signature verification against a CSAK-maintained registry; sub-interpreter or subprocess isolation. None decided.
- **Source.** [[specs/slice-3|slice 3 spec §Plugin trust posture]] and §Out of scope.

### Async / background `csak collect` runs

- **What.** Long-running collect runs (especially recursive ones) block the CLI for tens of minutes to hours. An async/background mode would queue runs, persist their state, and let the analyst close the terminal and check back later via `csak collect status` / `cancel` / `resume`.
- **Why deferred.** Slice 2 chose sync-only deliberately ("if long-running scans become a real friction in practice, slice 3 adds backgrounding cleanly on top of the sync-mode foundation"). Slice 3 design considered folding async in but rejected it — recursion mechanics are enough scope on their own. Live CLI status from the slice 3 recursion implementation reduces (but doesn't eliminate) the friction.
- **Trigger.** Eli or Christopher hits the "I left a recursive collect running and lost it when my SSH session dropped" pain often enough to be annoyed.
- **Source.** [[specs/slice-2|slice 2 spec §Long-running tools]]; [[synthesis/open-questions|open-questions §Slice 3 (closed)]]; [[specs/slice-3|slice 3 spec §Out of scope]].

### Recursion budgets beyond `--max-depth`

- **What.** Slice 3 ships only `--max-depth N` as the recursion safety brake (default 3, 0 = infinite, 1 = no recursion). Wall-clock budgets, cost budgets, and token budgets were considered and rejected for slice 3 in favor of structural dedup as the natural termination mechanism.
- **Why deferred.** The simpler model wants to be tested first. If structural dedup proves insufficient (some recursion graph blows up because the dedup keys aren't capturing the right equivalence) we'd add a wall-clock budget; if paid services or LLMs enter the loop in a later slice, we'd add cost.
- **Trigger.** A real recursion run produces runaway behavior despite dedup; *or* paid services / LLMs are integrated and cost becomes meaningful.
- **Source.** [[specs/slice-3|slice 3 spec §Termination by exhaustion, not by budget]] and §Out of scope.

---

## Slice 2.5 candidates

Single-purpose extensions to slice 2 that are well-defined and could ship between slice 3 and any larger slice 4 effort.

### Nessus REST API orchestration

- **What.** Drive Nessus Essentials via REST API instead of leaving it ingest-only via `.nessus` XML upload. Auth, scan-policy management, polling, error handling. Would slot into the slice 2 collect pipeline as a new tool catalog module.
- **Why deferred.** Meaningful integration work, value isn't proven until slice 2 is in real use, and analysts may be content with `.nessus` upload for ad-hoc scans.
- **Trigger.** Eli (or any analyst) routinely wants CSAK to drive Nessus rather than uploading XML after the fact.
- **Source.** [[specs/slice-2|slice 2 spec §Tool selection — why these three]]; [[synthesis/open-questions|open-questions §Slice 2.5]].

---

## Polish and minor improvements

Small, low-risk items that don't need a full slice. Could be picked up at any point.

### Move scoring tables from Python to YAML config

- **What.** Slice 1 ships scoring tables inline in `csak/ingest/scoring.py`. Move them to per-tool YAML files under `config/triage/severity/<tool>.yaml` so analysts can edit them without touching code.
- **Why deferred.** Polish, not load-bearing. Slice 1 shipped in code and works.
- **Trigger.** Any slice that touches the scoring layer for another reason; or analyst friction with the inline-Python approach.
- **Source.** [[architecture/overview|architecture overview §Module 3 — Ingest]]; [[synthesis/roadmap|roadmap §Outstanding non-blocking items]].

### `research/references.md` consolidating attributions

- **What.** A central page listing every external project that contributed ideas, content, or recipes to CSAK, with attribution. Replaces the per-spec inline `# source: reconFTW v4.0 modules/<file>.sh` comments with a single review surface.
- **Why deferred.** Useful but not urgent. Inline attribution in catalog modules covers the legal and ethical requirement; the consolidated page is for human review.
- **Trigger.** When the second tool catalog file lands a reconFTW-derived recipe, or when we add attributions from a third source.
- **Source.** [[specs/slice-2|slice 2 spec §Attribution]]; [[competitive/build-vs-adapt|build-vs-adapt §A central references page]].

### `engagements-RESERVED/` activation or retirement — RESOLVED 2026-04-26

- **Resolution.** Per Eli 2026-04-26: the wiki will never be used to store real engagement data. CSAK's `Org` entity (slice 1) is the system of record for engagement-shaped data; the wiki is for designing and exercising the *product*, not for *uses* of the product. The `engagements-RESERVED/` folder is retired (commit `b17c73f`) and the slot repurposed as `test-plans/` for testing plans — a useful prose-side complement to code-side `tests/` and the demo scaffolding under `scripts/`. See [[test-plans/README|test-plans/README]]. Updates landed: new test-plans README (commit `cec4907`), CYBER.md §1 / §3 / §8 updated to drop the engagements-RESERVED references (commits `bd54b00` and `b1846bb`), index Reserved section replaced with Test Plans section (commit `c589ba6`), this entry resolved.

---

## LLM layer (unnumbered later slice)

Treated as a single coherent slice rather than a collection of items. The deferral is structural: slice 1 ships a clean JSON export designed as the LLM layer's input; the rest is a real piece of design work that doesn't make sense until the deterministic core is fully stress-tested.

### Candidate applications

- Drafting fix-it ticket "impact in plain language" sections.
- Internal review confidence caveats.
- Narrative finding grouping beyond the deterministic dedup-key rule.
- Period summaries that diff one report against another.
- LLM-assisted recursion next-step picking (considered and rejected for slice 3 in favor of deterministic type-driven routing; could return as an opt-in mode in a later slice).
- LLM-driven target intake ("investigate acmecorp" → figure out what that means).

### Open design questions

- Local LLM (Ollama-style) or hosted API as the default? Token economics and privacy posture both affect this.
- How does the LLM layer attach — separate CLI command, flag on `csak report generate`, or external tool that consumes CSAK's JSON export?
- Token budget shape — hard cap per report, soft target, or unbounded?

### Trigger

Slices 1, 2, and 3 are stress-tested in real use and the deterministic core is solid enough that adding LLM features won't muddy diagnosis when something goes wrong.

### Source

[[product/vision|vision §How LLMs fit in (or don't, yet)]]; [[product/slices|slices §LLM layer]]; [[synthesis/open-questions|open-questions §LLM layer]].

---

## Slice 4+ (no commitment to slice number)

Larger features that would each justify a full slice. Order is rough priority guess.

### Scheduled / automated report generation

- **What.** "Every Monday regenerate the weekly reports for all active orgs." Cron-style or event-triggered re-runs.
- **Why deferred.** Useful but not urgent for the on-demand-first analyst workflow CSAK is built around.
- **Trigger.** Real demand — an analyst wants standing scheduled outputs, not just on-demand ones.
- **Possible shape.** External cron wrapping `csak collect` and `csak report generate`. CSAK itself doesn't need a scheduler — the OS provides one. Slice 4+ work is mostly documenting the wrapper pattern and possibly adding a `csak schedule` command that writes the right cron entry.
- **Source.** [[product/scope|scope §Slice 4+]]; [[product/slices|slices §Slices 4+]]; [[synthesis/open-questions|open-questions §Slice 4+]].

### Period summaries diffing one report against another

- **What.** "What changed between the March report and the April report" as a first-class output.
- **Why deferred.** Requires persistent state about past reports, which slice 1 deliberately does not carry. Adding it changes the "reports are stateless exports" invariant.
- **Trigger.** Real demand from analyst use, plus willingness to add the persistence layer.
- **Source.** [[specs/slice-1|slice 1 spec §What slice 1 explicitly does not solve]]; [[synthesis/open-questions|open-questions §Slice 4+]].

### Bidirectional ticketing integrations (Jira, ServiceNow, GitHub Issues)

- **What.** Push fix-it tickets into a tracker and pull status back. Sync resolution state.
- **Why deferred.** Significant integration work, varies per tracker, not on the critical path for the analyst-CLI value prop.
- **Trigger.** Real demand from a deployment context where the tracker is the system of record.
- **Source.** [[specs/slice-1|slice 1 spec §Out of scope]]; [[product/scope|scope §Slice 1 — out of scope]]; [[competitive/defectdojo|DefectDojo §What it does that we explicitly don't want to do]].

### Multi-user / multi-tenant features

- **What.** Beyond org-separation in the data model. Multiple analysts sharing a CSAK instance, ACLs, role separation.
- **Why deferred.** Slice 1's posture is single-user-on-their-own-machine. Multi-user changes the storage model (Postgres over SQLite) and adds auth.
- **Trigger.** Surge Studios or a client adopts CSAK for a team that needs shared state.
- **Source.** [[specs/slice-1|slice 1 spec §Storage]]; [[product/scope|scope §Slice 1 — out of scope]]; [[synthesis/open-questions|open-questions §Cross-cutting product questions]].

### Web UI

- **What.** Browser-based interface beyond whatever minimal thing slice 1 needs.
- **Why deferred.** CLI fits the analyst workflow; web UI is a different user surface that wraps the same query path. The architecture supports it (CLI is thin, query/render are pluggable).
- **Trigger.** Persona shift toward less-terminal-native users, or a client deployment that demands one.
- **Source.** [[specs/slice-1|slice 1 spec §Out of scope]]; [[product/scope|scope §Slice 1 — out of scope]].

### Distributed / cloud-fleet scanning

- **What.** Coordinate scans across multiple machines, Axiom-style. Run Nuclei from N VPSes against the same target for speed and IP rotation.
- **Why deferred.** Single-machine slice 2/3 is enough for the analyst-laptop persona. Distributed scanning is operationally heavier and the value prop is for high-throughput continuous scanning.
- **Trigger.** Engagement scale or speed needs that single-machine can't satisfy.
- **Source.** [[specs/slice-2|slice 2 spec §Out of scope]]; [[competitive/leverage-analysis|leverage-analysis §reconFTW scope fit]].

### Generic CSV ingest

- **What.** Universal escape-hatch parser for tools without a native CSAK ingester.
- **Why deferred.** Slice 1 stayed scoped to five committed formats. Slice 2 also deferred — analysts can use CSAK's collect tools directly for the in-catalog cases.
- **Trigger.** A real analyst asks for it; or the parser architecture proves stable enough that a generic plugin earns its place.
- **Source.** [[specs/slice-1|slice 1 spec §Deliberately excluded]]; [[competitive/leverage-analysis|leverage-analysis §DefectDojo - Strategy 4]].

### reconFTW JSON ingest

- **What.** Optional adapter that consumes reconFTW's `report/report.json` as a CSAK ingest source.
- **Why deferred indefinitely.** With slice 2's native orchestrator, analysts don't need to bring reconFTW output to CSAK — they can use CSAK directly. May return as an optional adapter only if a real analyst already runs reconFTW and wants to point CSAK at existing output.
- **Trigger.** A real analyst with an existing reconFTW workflow asks for it.
- **Source.** [[competitive/build-vs-adapt|build-vs-adapt §reconFTW - report.json ingest]]; [[competitive/leverage-analysis|leverage-analysis §reconFTW - Strategy 4]].

### DefectDojo bidirectional integration

- **What.** Optional "push to DefectDojo" / "pull from DefectDojo" adapter for analysts who already run DefectDojo.
- **Why deferred.** Requiring DefectDojo undercuts CSAK's zero-deployment positioning. Optional adapter is fine but no real demand yet.
- **Trigger.** A real analyst working with a team that runs DefectDojo asks for the integration.
- **Source.** [[competitive/leverage-analysis|leverage-analysis §DefectDojo - Strategy 3]].

### Quick rescan / staleness detection

- **What.** Skip heavy stages when no new assets have been discovered. reconFTW pattern.
- **Why deferred.** Considered for slice 2 and rejected. Every `csak collect` invocation runs the full pipeline fresh; slice 1 dedup prevents data pollution from re-running.
- **Trigger.** Real demand surfaces — analysts running collect repeatedly against the same target and wanting to skip work that hasn't changed.
- **Source.** [[specs/slice-2|slice 2 spec §Quick rescan]]; [[competitive/leverage-analysis|leverage-analysis §reconFTW scope fit]].

### Additional export formats

- **What.** HTML, PDF, CSV. The render layer is pluggable; new format = new renderer.
- **Why deferred.** Markdown + docx + JSON cover the slice 1 use cases. Adding more is mechanical.
- **Trigger.** Real client or workflow demand.
- **Source.** [[specs/slice-1|slice 1 spec §Export formats]]; [[architecture/overview|architecture overview §Extension points]].

### Additional target types

- **What.** `pcap`, `email-domain`, `asn`, others not in the slice 2/3 vocabulary. Each enables a category of tool that takes that type as input.
- **Why deferred.** Slice 3's type registry is designed so new types come with the tool that needs them — adding `asn` happens when an `asnmap`-style tool gets added, not before.
- **Trigger.** A new tool earns its place in the catalog and brings its own type.
- **Source.** [[architecture/overview|architecture overview §Extension points]]; [[specs/slice-3|slice 3 spec §Type system]] (the registry shape; new types arrive when their tool arrives).

### Soft warning on concurrent collect runs against the same target

- **What.** When two `csak collect` runs against the same target overlap in time, prompt: "a collect run for this target is already in progress; continue anyway? [y/N]".
- **Why deferred.** Slice 2 allows concurrent runs (they're harmless under SQLite WAL, just redundant compute). The warning is polish.
- **Trigger.** Concurrent collects against the same target become a real problem in practice.
- **Source.** [[specs/slice-2|slice 2 spec §Concurrent collect runs]].

---

## Cross-cutting product questions (no horizon)

These shape eventual product direction but don't map to a specific slice. Listed here so they're not lost; reviewed when product strategy gets explicit attention.

- **Distribution model.** Internal-only / open-source / sold? Eli's posture: don't let this drive design.
- **Customer shape.** Individual analysts / teams / consultancies? Slice 1 is built for individual-analyst use.
- **Greenfield vs. integrate-with-existing.** Replace DefectDojo, complement it, or neither? Current stance: complement at ingest layer, independent everywhere else.
- **Non-vulnerability findings.** Config drift, policy violations, anomalies. Slice 1's ingest set handles some (osquery for config, Zeek for anomaly-adjacent), but the triage model is vuln-centric.
- **Persona disambiguation.** Is "the analyst" one persona, or are consultant / blue-team-lead / researcher meaningfully different sub-personas?
- **Team-of-few mode.** Default is strict single-user; team mode would change auth and storage.

**Source.** [[product/scope|scope §Open scope questions]]; [[synthesis/open-questions|open-questions §Cross-cutting product questions]].

---

## Definitively declined (not for review)

Listed for completeness so we don't accidentally re-litigate. **These are not deferred — they are decisions to not build.**

- **Building our own scanner.** CSAK orchestrates scanners; it doesn't scan.
- **Building our own EDR / SIEM.** Out of scope by design.
- **Streaming / continuous detection.** SIEM territory; CSAK reads SIEM output but doesn't replace one.
- **Replacing Splunk for an existing client.** CSAK can read Splunk output; replacing a full SIEM isn't on any slice.
- **Mobile.** Not a target platform.
- **Conversational LLM chat interface inside the product.** LLM-assisted *authoring* is in scope for the LLM-layer slice; a chat UI is not.
- **Offering CSAK as a SaaS managed service.** Out of scope by design.
- **Configuration-by-knob explosion (300-knob config).** Deliberately rejected after the reconFTW case study.
- **Real public-figure quotes in CSAK output.** Not applicable but listed to be explicit; CSAK output is finding-derived only.

**Source.** [[product/scope|scope §Indefinitely out of scope]]; [[product/vision|vision §What CSAK is NOT]]; [[specs/slice-2|slice 2 spec §Out of scope]]; [[competitive/build-vs-adapt|build-vs-adapt §The honest recommendation]].

---

## How to use this page

**When slice 3 ships:**

1. Walk through this page top to bottom.
2. For each item, ask: did slice 3's reality change anything about whether this still earns its deferral? (Most won't. Some will.)
3. Items that should graduate to a slice → open in [[synthesis/open-questions|open-questions]] with `status: in-progress`, write a slice spec when the strategic shape is clear.
4. Items that should be retired → mark on the source page, add to "Definitively declined" here.
5. Items still rightly deferred → leave as-is. Update the `Trigger` if the relevant condition has shifted.

**When a deferred item gets pulled forward into a real slice:**

1. Update the source page first (deferred → in active spec).
2. Update this page: remove the entry or move it under the slice that's claiming it.
3. Log the change.

**When a new item gets deferred during design:**

1. Document it in the source spec or design discussion as usual.
2. Add an entry here in the appropriate horizon section.
3. The point of this page is to be exhaustive — if a deferred item lives only in a session note or a slice spec, future-us won't find it during review.

## Related

- [[product/scope|Scope]]
- [[product/slices|Slice Plan]]
- [[synthesis/open-questions|Open Questions]]
- [[synthesis/roadmap|Roadmap]]
- [[specs/slice-1|Slice 1 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[competitive/build-vs-adapt|Build vs Adapt]]
- [[competitive/leverage-analysis|Leverage Analysis]]
