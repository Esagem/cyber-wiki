---
title: "Research — How to use this category"
category: research
tags: [research, meta, process]
status: active
confidence: high
owner: shared
created: 2026-04-21
updated: 2026-04-23
---

# Research

This category holds our notes on **the world outside CSAK** — papers, blog posts, talks, vendor docs, competitor releases, anything that informs our design thinking.

## Layout

- `wiki/research/sources/` — raw artifacts (PDFs, screenshots, saved web pages). **Immutable.** The LLM reads them and writes about them in sibling summary pages, but never edits them.
- `wiki/research/<topic>.md` — summary pages. One per topic or source. Each summary page links back to its raw source(s) via the `sources:` field in front matter.

## Page shape

```markdown
---
title: "Descriptive title"
category: research
tags: [topic, vendor, technique]
status: draft
confidence: medium
owner: <eli|christopher|shared>
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources:
  - "research/sources/filename.pdf"
  - "https://example.com/blog-post"
---

# Title

## What this is

One-paragraph summary in our own words. Not a copy of the source.

## Key takeaways for CSAK

Bulleted list. Each item should be actionable — what it means for our design.

## Open questions this raises

Any questions the source surfaces. Mirror them into [[synthesis/open-questions|Open Questions]].

## Notes

Freeform. Quotes with page/timestamp references, objections, etc.
```

## Ingest workflow

See [[CYBER|CYBER.md §5.1 — Ingest a source]]. The short version: drop the source in, ask the LLM to ingest, review the summary, check that pages it touched got updated.

## Related

- [[synthesis/open-questions|Open Questions]]
- [[competitive|competitive/]] — for tool-specific research, prefer the competitive category.
