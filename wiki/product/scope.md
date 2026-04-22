---
title: "CSAK — Scope"
category: product
tags: [scope, in-scope, out-of-scope, v0]
status: seed
confidence: low
owner: shared
created: 2026-04-21
updated: 2026-04-21
---

# CSAK — Scope

> Pre-design working doc. The most important pre-design conversation is "what are we NOT building in v0" — that's what keeps the project tractable. Every item on these lists will eventually become an ADR.

## In scope — v0 (proposed, not decided)

Candidates for what v0 minimally covers. Cut aggressively.

- **Ingest**: at least one vuln scanner format (Nessus? OpenVAS? Nmap XML?), at least one log format (syslog? EVTX?), and free-text/manual entry.
- **Triage**: a simple but explicit scoring model with severity and confidence as independent axes. See [[specs/triage-model|Triage Model]].
- **Report**: two output formats — one internal (technical) and one external (client-facing).
- **Storage**: some persistent representation of findings across runs. Not necessarily a database.
- **Interface**: CLI and/or a single-pane web UI. Not both to start.

## Out of scope for v0 (proposed)

- Real-time alerting / SIEM-style streaming.
- Multi-tenant / multi-client workspace isolation.
- SSO / RBAC / audit logging. Single-user auth is enough for v0.
- Native integrations with ticketing systems (Jira, ServiceNow). Exportable formats yes; bidirectional sync no.
- Mobile.
- An LLM chat interface inside the product. (LLM-assisted authoring of reports is in scope; a conversational UI is not.)

## Out of scope indefinitely (proposed)

- Building our own scanner.
- Building our own EDR/SIEM.
- Offering CSAK as a managed service in v1. SaaS can come later.

## Open scope questions

1. **Breadth vs. depth.** Supporting 20 ingest formats shallowly vs. 3 formats excellently. What does the market reward?
2. **Analyst-in-the-loop vs. fully automated triage.** How much autonomy does CSAK have to suppress or escalate findings?
3. **Is the customer individual analysts, teams, or consultancies?** The answer shapes scope drastically (see [[product/users-and-jobs|Users & Jobs]]).
4. **Greenfield vs. integrate-with-existing.** If a team already has DefectDojo or Faraday, is CSAK a replacement, a complement, or neither?

## How we decide

Scope decisions escalate to ADRs. When we pick a direction on any of the above, it becomes `ADR-NNN-scope-<topic>.md` in [[decisions/README|decisions/]].

## Related

- [[product/vision|Vision]]
- [[decisions/README|ADR Index]]
- [[synthesis/roadmap|Roadmap]]
