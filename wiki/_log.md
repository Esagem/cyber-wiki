# Wiki Log

Append-only chronological record. Most recent at the bottom. Entries use the format `## [YYYY-MM-DD] <op> | <context> | <short description>` for greppability.

Operations: `ingest`, `adr`, `session`, `spec`, `lint`, `schema`, `write`.

---

## [2026-04-21] schema | initial scaffold | Created CYBER.md, _index.md, _log.md; seeded product/, architecture/, specs/, decisions/, synthesis/ with starter pages. Phase: pre-design collaborative workspace for designing CSAK.

## [2026-04-22] write | synthesis/smoke-test.md | test | smoke | verify wiki_write end-to-end

## [2026-04-22] delete | synthesis/smoke-test.md | cleanup of write-smoke-test artifact

## [2026-04-22] write | ONBOARDING.md | onboarding doc for new devices and contributors

## [2026-04-22] write | CYBER.md | update tool count and add wiki_delete to schema

## [2026-04-22] write | product/vision.md | reframe from downstream triager to orchestrator-and-triager; note slice-based plan

## [2026-04-22] write | product/slices.md | new slice plan capturing the three-slice roadmap from the 2026-04-22 session

## [2026-04-22] write | specs/slice-1.md | new slice 1 spec draft covering 5 starter tools, data model, and report shape

## [2026-04-22] write | _index.md | add vision/slices/slice-1 to index; update statuses

## [2026-04-22] write | sessions/2026-04-22-slice-1-kickoff.md | first working session log - slice 1 kickoff

## [2026-04-22] write | specs/slice-1.md | major revision - org as top-level entity, report/update as time-bounded snapshot, target as middle layer

## [2026-04-22] write | product/vision.md | update data-model section to reflect org as top-level container; reports as time-bounded snapshots

## [2026-04-22] write | product/scope.md | reconcile scope with new framing - slice 1 scope concrete, deferred items moved to slice 2/3

## [2026-04-22] write | product/users-and-jobs.md | first concrete user persona based on McCrary-style analyst archetype

## [2026-04-22] write | synthesis/open-questions.md | re-prioritize after slice 1 kickoff session - move answered questions, add slice-1-spec questions

## [2026-04-22] write | competitive/README.md | scaffold the competitive folder so research can drop in tomorrow

## [2026-04-22] write | sessions/2026-04-22-slice-1-kickoff.md | add late-evening clarification on report shape - org plus time period

## [2026-04-22] write | _index.md | final index update reflecting all evening writes

## [2026-04-23] write | product/vision.md | correct periodic-mode drift - CSAK is on-demand-first, reports have time-window structure but invocation is real-time

## [2026-04-23] write | product/scope.md | clarify invocation modes - on-demand in scope, streaming never, scheduled is slice 4 plus

## [2026-04-23] write | specs/slice-1.md | soften periodic framing - reports are on-demand with time-window structure not scheduled

## [2026-04-23] write | sessions/2026-04-22-slice-1-kickoff.md | append 2026-04-23 correction on invocation mode vs report structure

## [2026-04-23] write | competitive/defectdojo.md | first real competitive analysis - DefectDojo overlaps slice 1 heavily, differs in scope and UX

## [2026-04-23] write | competitive/reconftw.md | reconFTW analysis - covers slice 2 and 3 orchestration and recursion ground; shallower on triage than assumed

## [2026-04-23] write | competitive/README.md | populate index with DefectDojo and reconFTW analyses and their verdicts

## [2026-04-23] write | synthesis/open-questions.md | add competitive-driven questions on data model 4th layer, CSV escape hatch, false-positive status, reconFTW integration

## [2026-04-23] write | _index.md | update index to reflect DefectDojo and reconFTW pages now active

## [2026-04-23] write | competitive/reconftw.md | fix license claim - repo is ambiguous (MIT in LICENSE file, GPLv3 in README) - flag as unresolved before any leverage decision

## [2026-04-23] write | competitive/leverage-analysis.md | new leverage analysis page - per-tool feasibility across fork/subprocess/output-parsing strategies with license and scope fit

## [2026-04-23] write | competitive/README.md | add leverage-analysis page to index

## [2026-04-23] write | competitive/build-vs-adapt.md | new decision analysis - with permissive licenses assumed, should we adapt code or build fresh? Verdict per tool per component

## [2026-04-23] write | competitive/README.md | add build-vs-adapt page and update key takeaways with the honest recommendation

## [2026-04-23] write | decisions/ADR-001-slice-1-scope.md | first real ADR - slice 1 scope, proposed. Captures ingest+triage+report boundary, excludes orchestration/recursion/scheduling

## [2026-04-23] write | decisions/README.md | ADR-001 now exists as proposed; update index table and tweak forecast list

## [2026-04-23] write | _index.md | note ADR-001 proposed in master index recent activity and decisions section

## [2026-04-23] write | decisions/ADR-001-slice-1-scope.md | slim ADR-001 to decision+rationale only; point at spec for implementation detail

## [2026-04-23] delete | decisions/ADR-001-slice-1-scope.md | User directive: remove ADR scaffolding entirely; rationale moves inline into specs

## [2026-04-23] delete | decisions/README.md | User directive: remove ADR scaffolding entirely; rationale moves inline into specs

## [2026-04-23] write | CYBER.md | remove ADR scaffolding from schema - decisions live inline in specs now

## [2026-04-23] write | product/scope.md | strip ADR references from scope; scope changes now logged as spec revisions with rationale inline

## [2026-04-23] write | specs/slice-1.md | strip ADR references from slice 1 spec; storage and template rationale now lives inline in the spec

## [2026-04-23] write | _index.md | drop Decisions section from master index; ADR scaffolding removed

## [2026-04-23] write | synthesis/open-questions.md | strip ADR references from open-questions; jinja and sqlite moved to Answered; pre-design trigger restated without ADR gates

## [2026-04-23] write | synthesis/roadmap.md | reshape roadmap around slice-based plan and removed ADR gates

## [2026-04-23] write | engagements-RESERVED/README.md | drop ADR references; activation is now a session-level decision that edits CYBER.md

## [2026-04-23] write | competitive/README.md | drop ADR-009 reference from leverage verdict

## [2026-04-23] write | specs/slice-1.md | resolve 5 data-model questions: hybrid target nesting with weight-override, one org with subsidiary targets, N-findings-one-per-target, soft delete, add Scan layer with occurrences junction

## [2026-04-23] write | synthesis/open-questions.md | move 5 resolved data-model questions to Answered section after spec update

## [2026-04-23] write | specs/slice-1.md | reports are pure export - drop Report entity, reports are stateless pipeline output, timestamped files, markdown+docx, optional JSON debug export

## [2026-04-23] write | specs/slice-1.md | commit to python-docx for slice 1 docx rendering; two renderers share one structured context; flag styling as a second-pass concern

## [2026-04-23] write | specs/slice-1.md | finalize slice 1 - no retriage, no LLM, stateless reports, folder-aware Zeek, JSON for future LLM, all open questions closed

## [2026-04-23] write | synthesis/open-questions.md | slice 1 is fully closed - move all resolved questions to Answered, remove slice-1 sections from active open list

## [2026-04-23] write | synthesis/lint-report.md | first lint pass on the wiki - catalogs stale content, planned but unwritten pages, status mismatches, dangling references from deleted decisions folder, and outdated vision/slices/scope claims after slice 1 finalization

## [2026-04-23] write | product/vision.md | rewrite vision - four-layer data model, stateless reports, no LLM in slice 1, clear slice/product distinction

## [2026-04-23] write | product/scope.md | scope rewritten to match finalized slice 1 - four-layer model, no LLM, stateless reports, points at spec for authoritative list

## [2026-04-23] write | product/slices.md | tighten slice plan to match finalized slice 1 - reports per org+period, mention docx/JSON, note LLM is future slice
