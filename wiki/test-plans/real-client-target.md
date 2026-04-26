---
title: "Real-Client-Target Use"
category: test-plans
tags: [testing, real-target, slice-3, exit-criterion]
status: seed
confidence: medium
owner: eli
created: 2026-04-26
updated: 2026-04-26
---

# Real-Client-Target Use

The one outstanding bullet in the slice 3 exit criteria: Eli runs `csak collect --recurse` against a real client target during normal cybersecurity work and not hated it.

## Status

**Seed.** This plan exists to mark intent and to provide a place for observations from the real run to land. Unlike the [[test-plans/slice-3-recursion-demo|recursion demo plan]], this plan can't be written ahead of the run — the value is in capturing what actually surprised, what worked smoothly, and what needed adjustment when CSAK met a real target rather than a synthetic fixture.

## Goal

Verify that the slice 3 surface holds up under real-world conditions:

- Real network behavior (rate limiting, redirects, slow responses, intermittent failures).
- Real tool output (actual subfinder enumeration of public domains, actual httpx live-host probing, actual nuclei vuln detection).
- Real recursion patterns (depth 1+ producing genuinely new candidates, not the synthetic fixture's tier structure).
- Real lineage (multi-tool chains spanning depths, with `triggered_by_finding_id` populating when nuclei findings cause new httpx runs).
- Real time scales (depth 0 cascade probably takes minutes, not seconds; recursion to depth 2 might run for an hour or more depending on target size).
- The analyst's read of whether the output is useful — finding counts, signal-to-noise, whether the lineage chain helps or just adds noise to reports.

## Setup

Eli's choice of target. The setup section gets filled in when the run happens — what target, what scope, what mode (`quick` / `standard` / `deep`), what `--max-depth` value, whether plugins are loaded.

Things to consider when picking a target:

- **Authorization.** Target should be either Eli's own infrastructure, a domain Eli has explicit permission to scan, or a deliberately-public bug bounty scope.
- **Size.** A smaller target (single domain with maybe 20-50 subdomains) makes the first run tractable. Larger targets are useful for stress but should follow once the first run validates the basics.
- **Recursion shape.** A target with genuinely interesting depth-1+ discovery (URLs in nuclei findings that lead to new live hosts) is more informative than one where everything is discovered at depth 0.

## Procedure

(Filled in at run time. Likely shape: pick target, pick mode, run `csak collect --recurse` with appropriate flags, observe live output, run `findings list` and `scan list` afterwards, generate a report.)

## What to observe at the run

Write down anything that surprises. The interesting observations are usually the unexpected ones — a tool taking much longer than expected, a finding count that's lower or higher than predicted, a depth-2 frontier being unexpectedly large or empty, lineage chains that look weird in the report output.

Specific verification points worth checking even if nothing surprises:

- **Recursion shape.** Did recursion produce genuinely useful depth-1+ findings, or did it mostly re-confirm what depth 0 found? If the latter, that's signal that the dedup keys are right but that real targets don't produce as much recursion fanout as the synthetic test target.
- **Rate-limit behavior.** Did adaptive rate limiting fire? On which tool? Did the scan complete or get blocked?
- **Findings quality.** Did the recursion-spawned findings add signal, or just bulk?
- **Report lineage.** When `csak report generate` rendered the findings, did the scan-lineage chains help the reader understand where each finding came from, or did they clutter the output?
- **Wall-clock cost.** How long did the run take? Did the live-output cadence make the wait tolerable?
- **Spec deviations or gaps.** Anything the implementation does that the spec doesn't describe, or vice versa. These get written back to the spec the way the slice 3 ship's six deviations were.

## What would count as the exit criterion being met

Eli runs `csak collect --recurse` against a real target, gets useful output, and the experience is good enough that running it again on the next real target feels like the obvious move rather than a chore. The slice 3 spec phrases this as "and not hated it." That's the bar.

If the experience surfaces real friction — output too noisy, recursion too slow, lineage hard to read in reports — that's input for hardening work in [[synthesis/roadmap|roadmap §Phase 6]] rather than a slice-3 design failure. The slice 3 architecture is solid; iteration happens at the catalog and ergonomics layer.

## Related

- [[specs/slice-3|Slice 3 Spec]] (Exit criteria — this is the last unmet bullet)
- [[test-plans/README|Test Plans index]]
- [[test-plans/slice-3-recursion-demo|Slice 3 — Recursion Demo]] (the synthetic-target counterpart)
- [[synthesis/roadmap|Roadmap §Phase 6]] (where any friction this run surfaces lands as hardening work)
