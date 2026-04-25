---
title: "CSAK — Users & Jobs"
category: product
tags: [users, personas, jobs-to-be-done]
status: draft
confidence: low
owner: shared
created: 2026-04-22
updated: 2026-04-24
---

# Users & Jobs

> Draft. Concretizes the user persona implied by the 2026-04-22 session. This is Claude's synthesis of Eli's working context, not Eli's direct statement — push back hard on anything that doesn't ring true.

## Primary persona — "the analyst"

The user CSAK is built for in slice 1 and slice 2.

### Sketch

A security analyst working in a small-to-mid security team or institute. Mixed offensive and defensive work. Handful of client orgs, not dozens. Comfortable in a terminal. Comfortable reading scanner output. Not afraid of writing a config file. Doesn't have a dedicated tooling team to lean on — if a workflow is annoying, it's annoying for them personally.

The McCrary Institute student-analyst role is the canonical archetype. Other examples that probably fit:

- A consultant at a small infosec consultancy doing periodic assessments for SMB clients.
- A blue-team lead at a 200-person company who's also the de facto "security person" for incident response and vuln management.
- A staff researcher at a security org who does both proactive recon and reactive log-diving.

### What they're already doing

- Running open-source recon and scanning tools against client targets — Nuclei for web vulns, Subfinder + httpx for surface mapping, occasionally Nmap or Burp for deeper looks.
- Reading scanner output from Nessus or OpenVAS for clients with paid scans.
- Pulling logs from Splunk (when the client has a Splunk subscription) or from raw sources (Zeek, syslog, EVTX) when they don't.
- Writing reports manually — internal reviews for their team, polished fix-it tickets for the client.
- Maintaining their own toolkit, with each tool spun up slightly differently.
- Tracking what was reported last month vs. this month largely from memory or ad-hoc notes.

### What they're NOT doing

- Running a SOC. They don't have on-call rotations or a SIEM-driven alert flow.
- Writing custom detection rules at scale.
- Managing a team of 50 analysts. They might manage 0–4.
- Building integrations with enterprise ticketing systems.
- Operating multi-tenant infrastructure.

## Jobs to be done

The pains CSAK should resolve, ranked by Claude's read of Eli's emphasis (push back on order):

### Job 1 — "Stop making me reformat scanner output"

> "I have a Nessus scan, a Nuclei run, and some Zeek logs from this org. I need to produce one coherent report. Don't make me cross-reference severity scales by hand."

This is the cross-tool synthesis pain. Multiple tools, one org, one report.

### Job 2 — "Help me track what's been seen before"

> "I scanned this client last month. Half of last month's findings are still here. I don't want to re-write them all from scratch — I want to know what's new, what's still active, what's been fixed."

This is the cross-period continuity pain. Same org, multiple reports across time. Slice 1 addresses it via `first_seen` / `last_seen` tracking and the FindingScanOccurrence junction — the report for this month sees findings that have been continuously observed, and their history is recoverable.

### Job 3 — "Make me a fix-it ticket I'd be proud to send"

> "The client doesn't want my internal notes. They want a clean ticket they can hand to their dev team. Don't make me rewrite the same vulnerability description for the third time."

This is the deliverable-quality pain. One report family for analysts, one for the people the analysts report to.

### Job 4 — "Don't make me babysit a thousand info-level findings"

> "Nessus produces 200 findings. I care about 12 of them. The other 188 are noise or known-acceptable. Triage them down for me, but show your work."

This is the signal-from-noise pain. Deterministic triage with three axes (severity × confidence × target_weight), explainable scoring, and status-based suppression that survives across runs. When the analyst is confident a Finding is noise, they set `status = false-positive` or `suppressed` and it stops showing up in active reports. Slice 1 does not offer a fractional "probably FP" downweight — the analyst commits or leaves it active.

### Job 5 (slice 2) — "Run the tools for me"

> "I know I want Subfinder + httpx + Nuclei against this domain. Don't make me wire them up by hand every time."

This is the orchestration pain. Slice 1 doesn't address it; slice 2 does. Slice 2 ships CSAK's own orchestrator over Subfinder + httpx + Nuclei with target-type-aware tool routing (a domain triggers the full pipeline, an IP or URL skips earlier stages). reconFTW's invocation recipes are adapted into CSAK's tool catalog with attribution; CSAK doesn't depend on reconFTW at runtime — see [[specs/slice-2|the slice 2 spec]] and the [[competitive/reconftw|reconFTW case study]].

### Job 6 (slice 3+) — "Keep going on your own when it's obvious what's next"

> "Subfinder found 40 subdomains. Of course I want httpx to filter them, then Nuclei against the live ones. Just do it, with a budget."

This is the recursion pain. Slice 3.

## Anti-personas

People who explicitly should NOT use CSAK in slice 1 or 2:

- **The FAANG SOC analyst.** They have dedicated detection-engineering teams, real-time alerting infrastructure, and bespoke tooling. CSAK is built for on-demand analyst-driven work, not for streaming/alerting SIEM-shaped workflows — different tool, different job.
- **The compliance auditor.** They want GRC mappings, evidence collection, attestation flows. CSAK doesn't do that.
- **The IR responder mid-incident.** CSAK is for steady-state work, not for active-incident triage.
- **The non-technical manager who wants a dashboard.** CSAK produces markdown, docx, and JSON reports plus CLI output. Not a dashboard tool.

## Open user questions

- **Team-of-one vs. team-of-few.** Slice 1 assumes single-user. If two analysts share a CSAK install, what breaks first? Probably nothing immediately, but there's no design for it.
- **How does the analyst's client-org relationship vary?** Some clients have paid Nessus subscriptions; some don't. Some send logs proactively; some don't. CSAK has to gracefully handle the analyst pulling whatever data they can get for each org.
- **How "self-serve" is the analyst?** Slice 1 assumes they read CYBER.md, can write a small CLI command, and can interpret a markdown report. If we eventually target a less technical user, that's a different product.

## Related

- [[product/vision|Vision]]
- [[product/scope|Scope]]
- [[product/slices|Slice Plan]]
- [[product/glossary|Glossary]]
- [[specs/slice-1|Slice 1 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[synthesis/open-questions|Open Questions]]
- [[competitive/reconftw|reconFTW]]
