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

## [2026-04-23] write | competitive/leverage-analysis.md | update leverage-analysis to match slice 1 finalization - defer foreign-JSON ingest out of slice 1, remove ADR-009 language, update triage axes

## [2026-04-23] write | competitive/defectdojo.md | update DefectDojo design-changes section - all four suggestions were resolved in slice 1 spec (fourth layer yes, false-positive yes, CSV deferred, CWE templates yes, three-layer reference removed)

## [2026-04-23] write | product/users-and-jobs.md | users-and-jobs updates - fix periodic-report-shape anti-persona bullet, add reconFTW note on slice 2 orchestration

## [2026-04-23] write | product/glossary.md | glossary rewritten for slice 1 vocabulary - add Scan and FindingScanOccurrence, formalize Artifact, remove ADR-needing language, mark Engagement/Playbook as future

## [2026-04-23] write | _index.md | update master index recent-activity with slice 1 finalization and lint pass entries

## [2026-04-23] write | synthesis/roadmap.md | roadmap - check off completed phase 1 items after slice 1 finalization, mark architecture pages as the remaining phase 1 work

## [2026-04-23] write | sessions/2026-04-22-slice-1-kickoff.md | append 2026-04-23 update block to session notes - records what actually happened vs the original outstanding-work list

## [2026-04-23] write | research/README.md | fix pa pers typo in research README

## [2026-04-23] write | synthesis/lint-report.md | second lint pass - catches residual slice-1-ingest stale references in competitive README and reconftw, plus minor inconsistencies

## [2026-04-23] write | synthesis/lint-report.md | second lint pass - three remaining stale references in competitive pages (reconftw design-changes, README slice-1 ingest claim, build-vs-adapt LLM prototype claim)

## [2026-04-23] write | competitive/reconftw.md | reconftw design-changes section rewritten to match slice 1 finalization - JSON ingest deferred to slice 2, mirror the how-this-influenced-the-spec pattern from defectdojo

## [2026-04-23] write | competitive/README.md | competitive README - remove slice 1 ingest claim from key takeaways and leverage-analysis index row, reflect deferral to slice 2

## [2026-04-23] write | competitive/build-vs-adapt.md | build-vs-adapt - fix three items - reconftw JSON ingest moved to slice 2, remove slice 1 LLM prototype claim, update CSAK data model description to four-layer

## [2026-04-23] write | specs/slice-1.md | slice 1 spec approved by Eli - flip status draft to active, confidence medium to high, update preamble

## [2026-04-23] write | _index.md | index - slice 1 approved, spec status bumped to active high-confidence, add approval entry to recent activity

## [2026-04-23] write | synthesis/roadmap.md | roadmap - check off slice 1 sign-off item, flag architecture overview as the sole remaining phase 1 blocker to pre-design exit

## [2026-04-23] write | architecture/overview.md | architecture overview - system diagram, module boundaries, end-to-end walkthrough, extension points, what is deferred

## [2026-04-23] write | _index.md | index - architecture overview written, data-flow folded in, pre-design exit now imminent

## [2026-04-23] write | synthesis/roadmap.md | roadmap - architecture overview written, data-flow folded in, pre-design exit criteria met

## [2026-04-23] write | specs/slice-1.md | remove probability_real feature - simplify priority to three axes (severity x confidence x target_weight), drop analyst-FP-doubt handling, rely on false-positive status for FP commitment

## [2026-04-23] write | product/glossary.md | glossary - remove probability_real entry, update priority formula to three axes

## [2026-04-23] write | product/users-and-jobs.md | users-and-jobs - rewrite Job 4 to reflect removal of probability_real feature

## [2026-04-23] write | architecture/overview.md | architecture overview - remove probability_real references, update walkthrough to show status-based false-positive flow, update diagram caption

## [2026-04-23] write | competitive/leverage-analysis.md | leverage-analysis - update triage axis references to three (remove probability_real)

## [2026-04-23] write | product/scope.md | scope - update axis count from four to three (remove probability_real from triage description)

## [2026-04-23] write | synthesis/open-questions.md | open-questions - update probability_real answer to removed, fix importance-vs-severity row, update spec status

## [2026-04-23] write | sessions/2026-04-22-slice-1-kickoff.md | session notes - append 2026-04-23-late update block recording probability_real removal, slice 1 approval, architecture overview completion

## [2026-04-23] write | _index.md | index recent-activity - add probability_real removal entry, update finalized-description to reflect three-axis scoring

## [2026-04-23] write | competitive/build-vs-adapt.md | build-vs-adapt - remove three probability_real references (tool parsers note, severity tables note, why-not-fork triage rationale)

## [2026-04-24] write | specs/slice-1.md | remove probability_real feature per Eli - priority is now severity x confidence x target_weight, three axes not four

## [2026-04-24] write | product/glossary.md | glossary - remove probability_real entry, priority formula reverts to three axes

## [2026-04-24] write | architecture/overview.md | architecture overview - remove probability_real references from walkthrough and extension-points analyst-edit example

## [2026-04-24] write | sessions/2026-04-24-slice-1-implementation-review.md | slice 1 implementation review session - code matches spec, 83/83 tests pass, end-to-end run verified, two small polish items flagged

## [2026-04-24] write | specs/slice-1.md | slice 1 implemented - update spec header, switch timestamps to ms, document ID column on findings list

## [2026-04-24] write | architecture/overview.md | architecture overview - slice 1 implemented, ms timestamps, ID column, walkthrough reflects shipped behavior

## [2026-04-24] write | synthesis/roadmap.md | roadmap - slice 1 shipped, phase 1 fully closed including implementation, add phase 1b implementation milestone, next focus slice 2

## [2026-04-24] write | _index.md | index - slice 1 shipped, phase marker updated, add 2026-04-24 implementation session, next focus slice 2

## [2026-04-24] write | sessions/2026-04-24-slice-1-shipped.md | session notes - 2026-04-24 slice 1 shipped and reviewed, captures deviations accepted and next-up slice 2

## [2026-04-24] write | competitive/reconftw.md | reconftw - add 2026-04-24 case study reading correcting the tool selection framing, recipes are the value not orchestration logic, also fix stale four-axis triage reference
