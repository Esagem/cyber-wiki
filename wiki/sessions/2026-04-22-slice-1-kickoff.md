---
title: "2026-04-22 — Slice 1 Kickoff"
category: sessions
tags: [slice-1, product-shape, tools, data-model]
status: active
confidence: medium
owner: shared
created: 2026-04-22
updated: 2026-04-23
---

# 2026-04-22 — Slice 1 Kickoff

First real working session on CSAK's shape. Participants: Eli + Claude.

## What we decided

### 1. Product reframe

CSAK was originally framed as a downstream triage-and-report tool consuming pre-collected data. The actual product Eli wants is an **orchestrator and triager** — picks tools, runs them against a target, ingests their output, triages, reports. Swiss Army Knife is the right metaphor for the second framing, not the first.

The original vision page ([[product/vision|product/vision.md]]) was rewritten to reflect this.

### 2. Slice-based build plan

Three slices, each independently useful:

- **Slice 1 — Ingest & Report.** User brings data. CSAK processes, triages, reports. No tool execution. No recursion. [[specs/slice-1|Full spec.]]
- **Slice 2 — Tool Orchestration.** CSAK runs tools itself.
- **Slice 3 — Recursion & Catalog Expansion.** Tool output triggers further tool runs, with budgets. Tool catalog grows beyond the starter 5.

Slice 1 was deliberately chosen over slice 2 because cross-tool synthesis is the harder and more defensible part of the product. Plenty of existing orchestrators exist; good synthesis is rarer.

### 3. Data model — three layers, org at the top

Late in the session Eli clarified that **reports are organization+time-period scoped** ("April update for acmecorp"). This reshaped the data model.

The model at end-of-session was three layers with a separate Report entity:

- **Org** — the top-level container. Reports are per-org per-period.
- **Target** — assets owned by an Org (domains, IPs, hosts). Tools produce findings against Targets.
- **Finding** — a single observation about a Target, denormalized to its Org for query speed.
- **Artifact** — immutable raw input file.
- **Report** — frozen snapshot of (org, time window, kind). Generated, not derived on read.

This replaced the simpler "target-centric" framing earlier in the session. (Note: this shape was further refined on 2026-04-23 — see Update blocks below.)

### 4. Five starter tools for slice 1

| Tool | Covers |
|------|--------|
| Nuclei | Web vuln scanning |
| Nessus Essentials | Classic vuln scanner |
| Zeek | Network telemetry |
| osquery | Host telemetry |
| Subfinder + httpx | External attack surface |

Selection criteria: parseable output (prefer JSON), real tools an analyst would actually use, covers a genuinely varied set of input shapes to stress-test the report layer.

Explicitly deferred: Metasploit/Burp/ZAP (wrong layer), Wazuh/ELK (too big), trivy/grype (too narrow), theHarvester/amass (subfinder covers the high-value slice).

### 5. LLM posture

Deterministic core. LLMs evaluated case-by-case per feature. (Note: further refined 2026-04-23 — see Update blocks below.)

### 6. CLI-first interface

Slice 1 ships with CLI only. Web UI is slice-3-or-later. Reasoning: fits existing analyst workflow, fastest to build, doesn't constrain a future UI (CLI can be wrapped; the inverse is harder).

### 7. Storage — SQLite + flat-file artifacts

Default leaning, pending further review. SQLite for structured data, content-addressed flat files for artifacts. Reports rendered to `reports/<org-slug>/<period>/...` on disk.

## What was written this session

- [[product/vision|product/vision.md]] — rewritten end-to-end.
- [[product/scope|product/scope.md]] — reframed around slices.
- [[product/slices|product/slices.md]] — new. Slice plan.
- [[product/users-and-jobs|product/users-and-jobs.md]] — new. First persona sketch.
- [[specs/slice-1|specs/slice-1.md]] — new. Detailed spec.
- [[competitive/README|competitive/README.md]] — new. Format and target list.
- [[synthesis/open-questions|synthesis/open-questions.md]] — re-prioritized; answered questions moved to history.
- [[_index|_index.md]] — updated.

## Outstanding for Eli's review (morning)

In rough priority order:

1. **Read [[product/vision|vision]] and [[specs/slice-1|slice 1 spec]] end-to-end.** These are the most consequential pages. Push back on anything that puts words in your mouth, especially around the data model and the LLM posture.
2. **Sanity-check the [[product/users-and-jobs|persona sketch]].** Claude wrote it from inference; correct anything wrong.
3. **Skim the [[synthesis/open-questions|open questions]].** Look for anything Claude moved to "answered" that you don't actually consider settled.
4. **Note any tool you'd swap** in the slice 1 starter set.
5. **Decide whether [[competitive/README|competitive analysis]] should be the next session's focus**, or whether we should go straight to drafting ADRs.

## Outstanding for Claude (next session)

*(Note: items below were the plan at session end. What actually happened is in the Update blocks below.)*

- Draft **ADR-001 (slice 1 scope boundary)** after Eli's review settles slice 1 spec to `active`.
- Draft **ADR-004 (storage backend)**.
- Begin competitive analysis with DefectDojo, reconFTW, and one LLM-powered upstart.
- Build out at least one of `architecture/overview.md` or `architecture/data-flow.md` to make the spec concrete.

---

## Correction — 2026-04-23 morning

Eli flagged that the previous night's writeup (and the first pitch deck draft) overstated CSAK as a "periodic report mode" system. That was Claude's drift from "reports have a time-window *structure*" to "the system only runs *periodically*" — a real conceptual error.

**Clarified:**

- **CSAK is primarily on-demand and real-time.** The analyst invokes it during active work and expects output in seconds to minutes. That is the default usage pattern, in scope from slice 1.
- **Reports are structured by (org, time window)** because that's the useful way to organize findings — but a "time window" can be "today" or "this week" or "April 2026," whatever the analyst asks for. Structure is not cadence.
- **Scheduled / automated report generation** (cron-style "every Monday regenerate all reports") is now explicitly slice 4+. Useful, not urgent, not part of any current slice.
- **Streaming / continuous detection** (watching a data source and firing on events) remains indefinitely out of scope. That is SIEM territory.

**Files corrected:** `product/vision.md`, `product/scope.md`, `specs/slice-1.md`. Pitch deck will be updated separately in Canva (slides 4 and 8).

---

## Update — 2026-04-23

The plans from the original "Outstanding for Claude" list either happened differently or became irrelevant. This block records what actually landed between the original session and end-of-day 2026-04-23, so a future reader doesn't take that list at face value.

**ADR scaffolding dropped entirely.** ADR-001 and ADR-004 were drafted, then the whole `decisions/` folder was deleted. Principle adopted: rationale for every significant choice collapses inline into the section of the design document that makes the choice. No separate decision records. The `CYBER.md` schema was updated to match. ADR-001 and ADR-004 as entities no longer exist.

**Competitive analysis partially done.** DefectDojo and reconFTW analyses written, plus `leverage-analysis.md` (license strategies per tool) and `build-vs-adapt.md` (build code fresh, adapt content and configuration with attribution). The LLM-powered upstart (XBOW or NodeZero) has not been written yet.

**Architecture pages still `planned`.** Neither `architecture/overview.md` nor `architecture/data-flow.md` has been written. Both remain on the roadmap as the next substantive pre-implementation work.

**Slice 1 design finalized.** Every open question for slice 1 was closed in a follow-up working session. The data model moved from three layers with a Report entity (as written at end of 2026-04-22) to four layers plus Artifact, with no Report entity (Org → Target → Scan → Finding + Artifact, plus a FindingScanOccurrence junction). Reports became stateless pipeline exports — no database row, timestamped output files accumulate on disk. LLM use was removed entirely from slice 1; instead, slice 1 commits to a clean JSON export format designed as the interface for a future LLM layer. Docx rendering committed to python-docx rather than pandoc. Scoring is write-once at ingest with no retriage command. `probability_real` added as a fourth analyst-assigned scoring axis. Zeek ingest is folder-aware. See [[specs/slice-1|slice 1 spec]] for the complete finalized design.

**First lint pass done.** The [[synthesis/lint-report|lint report]] catalogued every stale reference and every contradiction between pages at the time of slice 1 finalization. Fixes were applied to vision, scope, slices, users-and-jobs, glossary, DefectDojo, and leverage-analysis pages; the `_index.md` recent-activity section was updated; the roadmap was updated to check off completed phase-1 items.

**Real outstanding work now:**

- Eli's sign-off review of the finalized slice 1 spec, flipping `draft` → `active`.
- [[architecture/overview|architecture overview]] page — the remaining high-priority pre-implementation piece.
- More competitive pages (Faraday, PlexTrac, AttackForge, Splunk, Wazuh, Tenable, one LLM-powered upstart).
- Pitch deck slides 4 and 8 language fix in Canva (still pending from the morning correction).
- Open a GitHub issue on reconFTW about the LICENSE/README license ambiguity (MIT vs GPL-3.0).

---

## Update — 2026-04-23 late

Three more things happened after the first Update block was written. Logged here so the session-notes record stays honest.

**Second lint pass.** A follow-up lint caught three stale references in the competitive cluster (reconftw's "Design changes" section, competitive/README item 3, build-vs-adapt's reconftw_ai recommendation). All fixed.

**Slice 1 approved.** Eli signed off on the finalized spec. `specs/slice-1.md` flipped `draft` → `active`, confidence `medium` → `high`. The spec is now the authoritative source for slice 1 implementation.

**Architecture overview written.** [[architecture/overview|architecture/overview.md]] was written as the five-minute map to the spec — mermaid system diagram, five module boundaries, one end-to-end walkthrough, extension points, what's deferred to build time. The planned `architecture/data-flow.md` was folded in rather than written separately (the two would have overlapped ~80%). Pre-design is effectively complete.

**`probability_real` removed.** Initially added during slice 1 design as a fourth scoring axis for "probably a false positive but I'm not sure yet" handling. Eli flagged that it was never approved and asked for it to be removed; Claude misread a prior approval signal during the finalization pass. The feature came back out: priority is now three axes (severity × confidence × target_weight). False-positive doubt is expressed via the existing `status = false-positive` value — the analyst commits or leaves the Finding active; slice 1 doesn't offer a fractional downweight. Spec, glossary, vision, scope, users-and-jobs, architecture overview, open-questions, and the leverage-analysis competitive page all updated. Lesson: treat approval signals as requiring explicit restatement when the feature is substantive; don't infer from adjacent answers.

**Real outstanding work now (end of 2026-04-23):**

- More competitive pages (Faraday, PlexTrac, AttackForge, Splunk, Wazuh, Tenable, one LLM-powered upstart). Not blocking implementation.
- Pitch deck slides 4 and 8 language fix in Canva.
- Open a GitHub issue on reconFTW about the LICENSE/README license ambiguity.
- Christopher's onboarding (repo collab, Claude connector, Obsidian+Git).
- Start slice 1 implementation in Claude Code.

## Related

- [[product/vision|Vision]]
- [[product/slices|Slice Plan]]
- [[product/users-and-jobs|Users & Jobs]]
- [[specs/slice-1|Slice 1 Spec]]
- [[product/scope|Scope]]
- [[synthesis/open-questions|Open Questions]]
- [[synthesis/lint-report|Lint Report]]
- [[architecture/overview|Architecture Overview]]
- [[competitive/README|Competitive Analysis]]
