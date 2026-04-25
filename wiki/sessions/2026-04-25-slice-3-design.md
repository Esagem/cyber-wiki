---
title: "2026-04-25 — Slice 3 Design"
category: sessions
tags: [slice-3, recursion, type-system, plugins, design]
status: active
confidence: high
owner: shared
created: 2026-04-25
updated: 2026-04-25
---

# 2026-04-25 — Slice 3 Design

Concentrated design session settling slice 3's strategic shape end-to-end. Eli arrived with "let's start building slice 3." Slice 2 was reported as built and under test; slice 1 had shipped 2026-04-24. Slice 3's three deferred questions in [[synthesis/open-questions|open-questions]] (recursion budget shape, how-to-add-a-new-tool, async timing) were still labeled `deferred`, with the [[product/slices|slice plan]] entry saying "deliberately not specced in detail yet."

The session moved through four refinement passes, ending with a draft of [[specs/slice-3|specs/slice-3.md]] and bookkeeping updates to six surrounding pages.

## How the session moved

### Pass 1 — strategic shape, seven open questions

Initial framing surfaced seven load-bearing decisions Eli needed to make before any spec text could land. These were the slice 3 equivalent of slice 2's reconFTW relationship question:

1. **Recursion trigger model** — heuristic in code per-tool, declarative trigger config, or LLM-assisted?
2. **Budget shape** — time / depth / cost / tokens / which combination?
3. **Async / background** — fold into slice 3 or wait for slice 2 to prove the pain?
4. **Catalog expansion** — does YAML finally earn its place over Python module per tool?
5. **Data model migration** — Scan needs `parent_scan_id` and `depth`, possibly `triggered_by_finding_id`.
6. **UX surface** — flag on `csak collect`, or a separate `csak follow-up` command?
7. **New target types** — in scope for slice 3, or strictly recursion + catalog mechanics?

Each question framed with options, trade-offs, and a recommendation. Defaults proposed across all seven: heuristic-in-Python recursion triggers, depth + structural dedup as termination, sync-only, Python catalog stays Python, add the three Scan columns, `--recurse --max-depth N` flag, no new target types.

### Pass 2 — Eli's answers and one strong correction

Eli answered the seven and made a critical reframing on (1):

- **Determinism for recursive calls.** Lock in deterministic only; LLM-assisted picking pushed to slice 4+ until the deterministic core is fully stress-tested.
- **Better than per-tool trigger rules:** "ideally the code will scan the findings for any that match another tools input. If we know what a tools output could be then we can limit scope to searching for tools that fit that use case."

That reframing was the cleanest move of the session. Per-tool trigger rules ("when nuclei finds X, run Y") would have been brittle and would have grown linearly with the catalog. Output-to-input *type matching* is more general — each tool declares what it produces and what it accepts, and the routing graph is computed from those declarations. New tools join the graph the moment they're registered, with no edits to other tools' rule lists.

Other answers:

- No budgets beyond depth. Live CLI status must be excellent so the analyst can Ctrl-C if recursion goes weird. (Accepted with one safety net: structural dedup of the recursion frontier, so a `(tool, target, mode)` already run isn't re-queued.)
- Recursion mechanics first; revisit async after.
- Catalog expansion priority: ergonomics. "Adding new tools as easy as possible." Asked for guidance on catalog shape.
- `--max-depth N` flag: default 3, 0 = infinite, 1 = no recursion. Prompt-to-continue when depth budget hits non-empty frontier.
- Mechanics before more tools. Slice 3 ships the same three slice-2 tools, recursion-aware.

### Pass 3 — Eli's three sharp pushbacks

Three pieces of Eli feedback materially improved the design:

**Pushback 1: "What are you planning to deduplicate against?"** First sketch was sloppy on this. Eli flagged that CSAK has no system to remember previous scans at this stage. Correction: dedup is *within-invocation only* — an in-memory `set[(tool_name, target_value, mode)]` for the duration of one `csak collect --recurse` process. Cross-invocation persistence would conflict with slice 2's "every invocation runs the full pipeline fresh" decision (no quick-rescan, no staleness detection). The dedup set is the natural termination mechanism: it grows monotonically within a run, candidates already in it are dropped, the frontier shrinks because the target space is finite.

**Pushback 2: Type vocabulary should "work for any tool we could add in the future while still being easy to understand."** First sketch was a fixed list of seven types. Refined to a two-level idea: ship core types, but make the type system extensible via the same plugin mechanism as tools. Each `Tool` can declare new `TargetType`s alongside its tool registration. New tools that need new types arrive *with* their types, not against a frozen vocabulary. Subtype hierarchy stays shallow (`domain` and `subdomain` both inherit from `host` for routing flexibility); metadata is carried on `TypedTarget` values rather than baked into types.

**Pushback 3: "I don't see why the initial input identifier cant be the same code as the new extract from outputs code?"** Eli was right and this was the single best architectural simplification of the session. The slice 2 `csak/collect/detect.py` (which classifies the analyst's `--target` argument) and per-tool `extract_outputs` (which classifies strings pulled from artifacts) are doing the same operation: "given a string, what type is it?" Unifying them into one `classify(value)` dispatcher means one bug surface for type detection, one place where new types take effect, and `extract_outputs` becomes a thin per-tool wrapper around `classify` calls. The boundary becomes clean: `extract_outputs` knows which fields of an artifact are real outputs (per-tool); `classify` does pure type detection (shared).

### Pass 4 — refinement on type registration

The "types live in the toolbox alongside tools" idea got one further refinement. First sketch had `classify()` as a centralized function with hardcoded type logic. Eli pointed out this contradicted the goal of cheap catalog expansion — every new type would require editing `classify`. Final shape: `classify()` is a *dispatcher* that consults the runtime type registry. Types register themselves at startup the same way tools do. Adding a tool that needs a new type is genuinely one file. CSAK becomes self-describing: the recursion graph is computed from registered tools' `accepts`/`produces` declarations; `csak tools show` renders the live graph; new plugins shift the graph automatically.

Eli also confirmed two things at this point:

- Pluggable third-party tools live in the same toolbox as built-ins (no second-class plugin path).
- `csak tools list/show` are wanted in slice 3.
- Specific parents (`parent_scan_id`) for scan lineage are needed.

### Pass 5 — sandboxing as a deferred item, plus consolidation request

After settling the trust posture for plugins (full Python under analyst's permissions, no sandbox), Eli asked for plugin sandboxing to be filed as a potential later feature, and made a broader request: take *every* feature labeled "slice 4+ / N+ / future work" across the wiki and put it in a single file for review after slice 3.

This produced [[synthesis/deferred-features|synthesis/deferred-features.md]] — a consolidated review backlog of every deferral across the wiki, organized by horizon (slice-3-introduced, slice 2.5, polish, LLM layer, slice 4+, cross-cutting) plus a definitively-declined section for completeness. The page is a *view* over the source pages, not a relocation — every entry points back to where the rationale lives.

## What landed

### Spec

- **[[specs/slice-3|specs/slice-3.md]]** drafted, status `draft`, confidence medium. ~750 lines. Same shape as slice 1 and slice 2 specs (goal, scope in/out, mechanics, exit criteria, related links).

### Surrounding bookkeeping (six pages)

- **[[synthesis/open-questions|open-questions.md]]** — slice 3 section closed; three deferred questions + three new ones (tool-selection-during-recursion, type-system-extensibility, scan-lineage) moved to Answered with spec pointers.
- **[[synthesis/roadmap|roadmap.md]]** — replaced stale "Phase 3 — slice 2 design (next)" with Phase 3 (slice 2 design+build, done) and Phase 4 (slice 3 design, draft-complete). Phase 5 stub for slice 3 implementation. Preamble updated.
- **[[product/slices|slices.md]]** — slice 3 section rewritten in slice-1/slice-2 pattern (what CSAK does / does NOT do / why / concrete additions / exit criteria / spec link). The "deliberately not specced in detail yet" framing is gone.
- **[[product/glossary|glossary.md]]** — 11 slice 3 vocabulary terms added in a new section between slice 2 vocabulary and Deliverables: Recursion, Recursion frontier, Recursion depth, Target type (slice 3 registry), TypedTarget, classify, accepts/produces, extract_outputs, Plugin tool, Recursion graph, csak tools list/show.
- **[[architecture/overview|architecture/overview.md]]** — preamble extended for slice 3; new "§7 Collect, extended for recursion" subsection covering recursion runner, type registry, plugin discovery, extended Tool interface; extension points updated; 7 slice 3 rows added to specs-relationship table.
- **[[synthesis/deferred-features|deferred-features.md]]** — written as a new page (see Pass 5 above). Then source pointers in the slice-3-introduced section updated from "design discussion" placeholders to actual spec section references after the spec was written.

### Index

- **[[_index|_index.md]]** — slice 3 row flipped from `planned` to `draft` in the Specs table. Phase marker bumped to "slice 1 shipped, slice 2 in implementation, slice 3 in design." Recent-activity entries added for the spec draft and the deferred-features consolidation.

## Strategic decisions, in one place

For future-us reviewing or for someone joining the project mid-slice-3-implementation:

1. **Recursion is deterministic.** Output-to-input type matching, no LLM. Each tool declares `accepts` and `produces`; the runner builds the routing graph from declarations. LLM-assisted next-step picking deferred indefinitely until deterministic core is stress-tested.

2. **Termination is by exhaustion, not budget.** Within-invocation in-memory dedup of `(tool, target, mode)` tuples shrinks the frontier monotonically. `--max-depth N` (default 3, 0 = infinite, 1 = no recursion) is the analyst's emergency brake. Prompt-to-continue when depth limit hits non-empty frontier; default response is `Y`. No wall-clock, cost, or token budgets in slice 3.

3. **Sync-only.** Recursion makes long runs more likely; the slice 3 mitigation is excellent live status (depth headers, frontier counts, prompt-to-continue), not backgrounding. Async / background deferred to a later slice if real friction emerges.

4. **Type system is extensible at runtime.** Built-in types (`network_block | host | domain | subdomain | url | service | finding_ref`) registered at startup; plugins can register additional types. `classify(value)` is a dispatcher that consults the registry. Subtype hierarchy supports widening (a `domain` matches `accepts: [host]`). Metadata attaches to `TypedTarget` values, not types themselves.

5. **Plugins live in the same toolbox.** Drop a `*.py` in `~/.csak/tools/`; it gets imported at startup, registers tools and types via the same entry points as built-ins, participates in routing identically. Discovery + validation runs at startup; failures fail-closed with clear errors. `csak doctor` validates plugin sets on demand.

6. **Trust posture for plugins.** Full Python, full user permissions, no sandbox. Same trust as running any other script. Documented explicitly. Sandboxing is a slice-N+ question deferred to [[synthesis/deferred-features|deferred-features]].

7. **Data model adds three nullable Scan columns.** `parent_scan_id` (FK → Scan), `depth` (int, default 0), `triggered_by_finding_id` (FK → Finding). Single-parent assumption is correct under strict structural dedup. Junction table considered and rejected as premature.

8. **CLI surface gains four entry points.** `--recurse` and `--max-depth N` flags on `csak collect`. New `csak tools list` and `csak tools show <tool>` subcommands. `csak doctor` extended for plugin and registry validation. Slice 1 and slice 2 surfaces unchanged.

## Process notes

A couple of things worth flagging for future sessions:

**Tool discovery.** Started this session with five cyber-wiki tools available (`wiki_index`, `wiki_list`, `wiki_read`, `wiki_write`, `wiki_delete`) and worked around the apparent absence of `wiki_edit` / `wiki_read_many` / `wiki_status_set` / `wiki_log_tail` / `wiki_search` for the first half of the conversation. Eli flagged this; turned out the new tools were deployed but my initial `tool_search` query hadn't surfaced them. A more targeted search loaded all eleven. Cost: the deferred-features page and the first index update were full-page rewrites that should have been `wiki_edit` patches. Lesson: when CYBER.md §9 documents a tool that doesn't appear in the available set, retry `tool_search` with different keywords before assuming the tool isn't deployed.

**Wiki-vs-spec discipline held.** A draft of "wiki acceleration spec" (the design of the new MCP tools themselves) was correctly deleted by an earlier edit per CYBER.md §1 — that wiki is for CSAK design only, not for meta-work about its own tooling. Same discipline applied here: the slice 3 spec is the design surface; sandboxing and async-collect went into deferred-features rather than getting their own pages.

**The bookkeeping ratio matters.** One spec page (the load-bearing artifact) generated bookkeeping updates to six other pages. Without a tool like `wiki_edit` for surgical patches, that bookkeeping cost would dominate the session. With it, the bookkeeping was four `wiki_edit` calls totalling under 30 sub-edits, plus the one full-rewrite I should have avoided. Worth doing well; not worth re-doing the page rewrites this session.

## What's next

- **Eli reviews [[specs/slice-3|the spec]].** When approved, status flips `draft` → `active`, confidence bumps medium → high (via `wiki_status_set`).
- **Slice 3 implementation.** Same hand-off pattern as slice 2 — pre-implementation spec is detailed enough that build can start. Not blocking on slice 2 implementation review; slice 2's exit-criteria session note will land separately.
- **First slice-3 implementation review session** when slice 3 is built and tested end-to-end. Same shape as [[sessions/2026-04-24-slice-1-implementation-review|the slice 1 review]] — confirm the spec matches shipped behavior, write back any deviations, log the deltas.
- **Deferred-features review** after slice 3 ships. Walk [[synthesis/deferred-features|deferred-features.md]] top to bottom, decide what graduates to a real slice (likely candidates: async/background collect if recursion makes the friction concrete; plugin sandboxing if any near-incident surfaces; Nessus REST API if Eli is using slice 2 enough to want it).

## Related

- [[specs/slice-3|Slice 3 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[specs/slice-1|Slice 1 Spec]]
- [[architecture/overview|Architecture Overview]]
- [[product/slices|Slice Plan]]
- [[product/glossary|Glossary]]
- [[synthesis/open-questions|Open Questions]]
- [[synthesis/deferred-features|Deferred Features]]
- [[synthesis/roadmap|Roadmap]]
- [[sessions/2026-04-24-slice-1-shipped|2026-04-24 — Slice 1 Shipped]] (the prior session)
