---
title: "DefectDojo"
category: competitive
tags: [defectdojo, vulnerability-management, aspm, open-source, owasp]
status: active
confidence: medium
owner: shared
created: 2026-04-23
updated: 2026-04-23
sources:
  - "https://github.com/DefectDojo/django-DefectDojo"
  - "https://defectdojo.com/"
  - "https://owasp.org/www-project-defectdojo/"
  - "https://devsec-blog.com/2024/05/vulnerability-management-with-defectdojo-is-it-great-for-devsecops/"
---

# DefectDojo

## What it is

DefectDojo is an open-source vulnerability management, DevSecOps, and ASPM (Application Security Posture Management) platform. OWASP flagship project, started in 2013, open-sourced in 2015. The platform ingests findings from 200+ security scanners, deduplicates them, tracks remediation state across time, and produces dashboards and reports. It has a data model organized around Products → Engagements → Tests → Findings, plus Endpoints as a first-class concept. Installed via Docker, Kubernetes, or Helm. BSD 3-Clause licensed. A commercial "DefectDojo Pro" tier exists with additional features (new UI, risk-based prioritization, native ticketing integrations, AI-assisted data enrichment).

## What it does that overlaps with CSAK

A lot. This is the closest existing analog to CSAK slice 1.

- **Ingest from many scanner formats** — DefectDojo parses 200+ tools out of the box, including Nessus, Nuclei, and generic CSV. CSAK slice 1's 5 starter tools is a small subset of what DefectDojo already handles.
- **Deduplication across tools and across runs** — DefectDojo has a mature dedup engine. Same idea as what slice 1 is proposing.
- **Finding lifecycle tracking** — active, accepted-risk, false-positive, duplicate. Essentially identical to CSAK's Finding statuses.
- **Severity normalization across tools** — DefectDojo maps each tool's severity scale onto a unified scale (critical/high/medium/low/info). Same shape as CSAK's per-tool translation tables.
- **Reporting** — DefectDojo generates PDF and AsciiDoc reports per product/engagement/test, with remediation templates keyed on CWE. Broadly the same deliverable shape as CSAK's internal review.
- **Engagement concept** — DefectDojo has a first-class "Engagement" entity that scopes a set of tests over a period for a product. This is close to what CSAK is using (org, time window) to frame reports, just structured slightly differently.
- **Remediation templates** — save a vuln description once per CWE, reuse everywhere. Same problem CSAK's fix-it ticket bundles are trying to solve.

## What it does that we explicitly don't want to do

- **Be a full web application.** DefectDojo is a Django web app with a UI. Users log in, click through products, filter findings in tables. Slice 1 is explicitly CLI-first, single-user, on-demand.
- **Enterprise lifecycle management.** SLAs with remediation timers, product grading, posture management scorecards, multi-team RBAC. Important for large orgs; CSAK's target persona doesn't need any of it.
- **Bi-directional Jira/ticketing integration.** DefectDojo syncs findings to and from Jira. CSAK slice 1 emits markdown; anything bidirectional is a slice 4+ concern if ever.
- **CI/CD pipeline integration as a core feature.** DefectDojo is designed to sit in a DevSecOps pipeline and ingest on every build. CSAK is designed to sit on an analyst's laptop and run when they want output.
- **Be the multi-tenant system of record.** DefectDojo is a server you deploy once for an org. CSAK is a tool an analyst runs per-engagement or per-org as needed.
- **Persist reports as database entities.** DefectDojo stores reports and report metadata in its database. CSAK does not — reports are stateless exports to disk.

## Strengths to learn from

- **Universal parser for custom CSV input.** DefectDojo accepts generic CSV findings when a tool isn't natively supported. Worth copying eventually, though slice 1 deliberately defers it to keep the parser scope tight.
- **Finding templates keyed on CWE.** Write the remediation advice once, attach it everywhere that CWE appears. CSAK's slice 1 fix-it tickets use this pattern, adapted from DefectDojo's template library with attribution.
- **Explicit status lifecycle with typed values** (active / false positive / out of scope / risk accepted / mitigated). CSAK adopted `false-positive` as a distinct status from `suppressed` after studying DefectDojo's approach.
- **Products → Engagements → Tests → Findings** is a four-layer hierarchy. CSAK's data model is also four-layer (Org → Target → Scan → Finding) with slightly different semantics: the Scan layer bridges Artifact (bytes) and Finding (observation), while DefectDojo's Test layer bundles findings into an Engagement. Different shapes, same underlying insight that a third grouping layer between asset and finding is load-bearing.
- **Dashboards and metrics are first-class.** CSAK slice 1 doesn't have this and shouldn't add it, but worth knowing that a sophisticated user of DefectDojo gets real-time visualizations out of the box.

## Weaknesses / gaps

- **Deployment friction.** Standing up DefectDojo requires Docker, Postgres, Redis, Celery workers, a reverse proxy if you want HTTPS. Several commentaries specifically flag that small teams abandon it because the setup cost exceeds the perceived value. CSAK's single-binary CLI story is a genuine differentiator here.
- **Best for orgs with "hundreds of vulnerabilities ingested from various sources."** DevSec Blog notes explicitly that DefectDojo is overkill for smaller orgs — too much process, too many features, too much clicking. This is a real opening for CSAK.
- **The UI dominates the product.** Both a strength and a weakness — the UI is the interaction model. Users who live in terminals, SSH sessions, or scripts find it awkward. CSAK's analyst persona is terminal-native.
- **Reports are tool-output-shaped, not narrative-shaped.** DefectDojo reports group findings by scanner and by severity, which is correct for vuln management but clinical for client-facing deliverables. CSAK's fix-it ticket bundles are attempting to be narrative — plain language impact, reproduction, remediation — which DefectDojo doesn't natively do well.
- **LLM is behind the Pro paywall.** DefectDojo Pro mentions "AI-assisted data enrichment." The open-source edition does not have LLM features. CSAK's slice 1 ships with a clean JSON export specifically designed as the interface for a future LLM layer; an open-edition LLM capability is a real differentiator.

## Pricing / licensing model

- Open-source edition: BSD 3-Clause. Fully functional, self-hosted, no feature gating for core vuln management.
- **DefectDojo Pro**: commercial SaaS tier with additional features — new UI, risk-based prioritization, native ServiceNow/GitHub/GitLab/Azure DevOps integrations, AI data enrichment. Pricing not publicly listed; contact sales.

## Verdict for CSAK design

DefectDojo is a **real competitor for slice 1's core value proposition** — multi-tool ingest with dedup and unified findings. It's mature, well-supported, widely adopted, and free. We cannot pretend this doesn't exist.

**What differentiates CSAK slice 1 from DefectDojo, if we execute well:**

1. **Zero-deployment CLI.** DefectDojo needs infrastructure. CSAK runs on a laptop.
2. **On-demand, real-time invocation pattern.** DefectDojo is designed for a persistent server with scheduled ingests; CSAK is designed for "I need this now, while I'm working."
3. **Narrative, client-facing fix-it tickets.** DefectDojo's reports are tool-output-grouped; CSAK's fix-it ticket bundles are meant to be forwarded as-is to a client's dev team.
4. **Stateless reports with a clean JSON export for future LLM use.** DefectDojo persists reports and gates LLM features; CSAK emits pure exports and ships a JSON format designed for a later LLM layer to consume.

**What might sink CSAK slice 1's positioning if we don't address it:**

1. **"Why not just use DefectDojo?"** is a legitimate question a sophisticated analyst will ask. The answer has to be specific and defensible, not hand-wavy. The "zero-deployment CLI" answer is strong; the "better reports" answer needs real evidence.
2. **DefectDojo's dedup and lifecycle management is a decade old and battle-tested.** CSAK's equivalent in slice 1 will be new code. We should expect rough edges that DefectDojo has already smoothed out.

## How this research influenced the slice 1 spec

Four questions were surfaced by this analysis. All resolved in [[specs/slice-1|slice 1 spec]]:

- **Fourth data-model layer?** Yes — added the Scan entity (between Artifact and Finding) with a FindingScanOccurrence junction. Different shape from DefectDojo's Engagement/Test but same underlying insight.
- **`false-positive` as a distinct status from `suppressed`?** Yes. Adopted into slice 1.
- **Generic-CSV escape-hatch ingest?** Deferred out of slice 1. The parser architecture is plugin-shaped so it can be added without core surgery; slice 1 stays scoped to the five committed formats.
- **CWE-keyed remediation templates for fix-it tickets?** Yes, in slice 1. Content adapted from DefectDojo's templates with attribution (per [[competitive/build-vs-adapt|build-vs-adapt]]).

## Notes

The OWASP flagship status and 30M+ downloads matter for the "what would it take to displace this" question. Realistically, CSAK cannot displace DefectDojo in the enterprise DevSecOps segment; the question is whether CSAK wins in the individual-analyst and small-consultancy segment where DefectDojo's deployment cost is too high.

Both projects being open source means this isn't zero-sum — CSAK could be a complement (analyst-side CLI) to DefectDojo's team-side server. Worth considering as a positioning angle.

## Related

- [[competitive/README|Competitive Analysis Index]]
- [[competitive/build-vs-adapt|Build vs Adapt]]
- [[competitive/leverage-analysis|Leverage Analysis]]
- [[product/vision|Vision]]
- [[specs/slice-1|Slice 1 Spec]]
- [[synthesis/open-questions|Open Questions]]
