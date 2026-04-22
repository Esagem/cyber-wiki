---
title: "CSAK — Glossary"
category: product
tags: [glossary, vocabulary, definitions]
status: seed
confidence: low
owner: shared
created: 2026-04-21
updated: 2026-04-21
---

# Glossary

> Shared vocabulary for designing CSAK. The goal is that every contributor uses the same word to mean the same thing. Add a term the moment anyone hedges on what another contributor meant.

## Core terms (working definitions — change freely at pre-design)

**CSAK** — the product we're building. Cybersecurity Swiss Army Knife. Context-dependent: sometimes refers to the whole system, sometimes just the core engine.

**Ingestor** — a component that knows how to read one kind of input (Nessus XML, syslog, Burp session file, etc.) and turn it into CSAK's internal representation. Also called an "adapter" in some of our notes — pick one; see [[synthesis/open-questions|Open Questions]].

**Source** — the raw artifact an ingestor consumes (a file, a URL, a pasted blob). Immutable once received.

**Finding** — CSAK's internal representation of a single security observation. May come from a scanner, a log correlation, or manual entry. Has severity, confidence, and status fields.

**Severity** — how bad a finding would be if real. Scored on CVSS-aligned bands.

**Confidence** — how sure CSAK is that a finding is real. Scored independently of severity.

**Action class** — the disposition assigned to a finding after triage: `investigate`, `ticket`, `accept-risk`, `duplicate`, `false-positive`, or similar. Precise set is TBD.

**Internal review** — a thorough, technical, analyst-facing deliverable CSAK produces. Rich with evidence, caveats, and cross-references.

**Fix-it ticket** — a concise, client-facing deliverable CSAK produces for a single issue (or tight group of issues). No internal chatter, no speculation, reproduction + impact + remediation + validation.

**Engagement** — a scoped piece of work for a specific client or project. Most findings live inside an engagement.

**Playbook** — a repeatable procedure CSAK can follow to turn a specific kind of input into a specific kind of output. E.g. "triage a Nessus scan of a public web server."

## Terms we're unsure about

- **Importance** vs. **severity** vs. **priority** — the original framing used "level of importance." Is that the same as severity × confidence × business context? Needs an ADR to disambiguate.
- **Tool** is dangerously overloaded — an MCP tool, a security tool we ingest from, a CSAK feature. Qualify it every time.
- **Report** sometimes means "internal review," sometimes "fix-it ticket," sometimes "both/any." Prefer the specific term.

## Out-of-vocabulary (terms to avoid)

- "AI-powered" — too vague, too marketing. Say what's LLM-driven vs. deterministic.
- "Swiss Army Knife" in user-facing copy. It's our internal codename (name is WIP).
