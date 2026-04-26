---
title: "2026-04-26 — Slice 3 Shipped"
category: sessions
tags: [slice-3, slice-2, implementation, recursion, plugins, types, deviations, demo]
status: active
confidence: high
owner: shared
created: 2026-04-26
updated: 2026-04-26
---

# 2026-04-26 — Slice 3 Shipped

Slice 3 implementation delivered by Eli (via Claude Code) and reviewed end-to-end in this session. Slice 2's implementation review is folded in here — slice 2 has been on `origin/main` since 2026-04-25 per Eli's earlier note, and the slice 3 build directly extended the slice 2 catalog modules and exercised them through both the migrated test suite and the new recursion runner at depth 0. Writing two separate ship session notes would duplicate the same verification work.

## What arrived

Commit `422b8ef` on `origin/main`. The hand-off prompt sent to Claude Code earlier in this conversation pointed at the slice 3 spec as authoritative source, flagged ten load-bearing constraints up front (httpx accepts, types/ as package, ProgressReporter location, extract_outputs lineage, depth-0 cascade, InvalidTargetError, backward compat, ingest target promotion, applies_to wrapper survival, fail-soft plugins), and suggested a build sequence that followed the spec's module-by-module diff against the slice 2 source tree. Claude Code read the spec end to end, built in roughly the suggested order, ran the existing slice 1/2 test suite to catch regressions during the migration, then wrote slice 3-specific tests for the new surface area.

End state: 275 tests pass (1 skip — the pre-existing POSIX-only one). Every slice 3 exit criterion exercised except real-client-target use by Eli, which is expected to follow during normal cybersecurity work.

### New code

| Path | Responsibility |
|---|---|
| `csak/collect/types/__init__.py` | Runtime type registry: `TargetType`, `TypedTarget`, `register_type`, `classify`, `matches`, `validate_registry`, `InvalidTargetError`. |
| `csak/collect/types/builtin.py` | Registers the seven core types (`network_block`, `host`, `domain`, `subdomain`, `url`, `service`, `finding_ref`) at import. |
| `csak/collect/recursion.py` | Recursion runner: frontier dedup, depth loop, prompt-to-continue, depth-1+ independent task semantics. Wraps the existing per-stage `run_collect`. |
| `csak/collect/plugins.py` | Fail-soft plugin discovery from `~/.csak/tools/` with `CSAK_PLUGIN_DIR` env override. |
| `csak/cli/tools.py` | New `csak tools list` and `csak tools show <tool>` command group. |

### Modified

- `csak/collect/tool.py` — `Tool` extended with `accepts: list[str]`, `produces: list[str]`, `extract_outputs(...)`, plus `origin` and `source_path` for the catalog introspection commands. `applies_to(target_type)` becomes a thin default wrapper over `matches(t, self.accepts)` so legacy callers (tests, `csak doctor`) keep working.
- `csak/collect/tools/{subfinder,httpx,nuclei}.py` — each gains `accepts`, `produces`, `extract_outputs`. Existing `applies_to` / `invocation` / `parse_progress` / `detect_rate_limit_signal` unchanged.
- `csak/collect/tools/__init__.py` — `ALL_TOOLS` becomes a runtime registry consulted via `register_tool()`; built-ins and plugins share one path.
- `csak/collect/router.py` — calls `matches()` directly with the `TypedTarget` from `classify()` rather than the legacy `tool.applies_to(target_type_string)`.
- `csak/collect/pipeline.py` — chains stages via `extract_outputs` plus the type matcher (`_input_for_stage` replaces the deleted `_prepare_input_for_next_stage` / `_extract_field_to_list` helpers); threads `parent_scan_id` / `depth` / `triggered_by_finding_id` into Scan creation; takes optional `dedup_set` parameter (None at depth 0, populated at depth 1+).
- `csak/cli/collect.py` — `--recurse` and `--max-depth` flags plus `--no-plugins` for bypassing plugin loading; `ProgressReporter` extended with depth headers, frontier counts, prompt-to-continue rendering, and `print_recursion_summary`.
- `csak/cli/doctor.py` — extended with type registry validation, recursion graph orphan-output check, plugin status block. Exits non-zero on registry errors (was previously printing errors but exiting 0).
- `csak/cli/main.py` — registers the new `tools` command group.
- `csak/storage/{models.py,schema.py,repository.py}` — `SCHEMA_VERSION` 1→2; idempotent `ALTER TABLE` adding `parent_scan_id`, `depth`, `triggered_by_finding_id` to `scans`; matching dataclass fields; insert/select helpers carry the new columns through.

### Removed

- `csak/collect/detect.py` — replaced by `classify()` in the new types package. Last grep-match was `tests/test_detect.py`, which migrated to `tests/test_classify.py` with the same target list and `InvalidTargetError` substituted for the slice 2 `"invalid"` literal.
- `pipeline._prepare_input_for_next_stage` and `pipeline._extract_field_to_list` — subsumed by per-tool `extract_outputs` calls routed through the type matcher.

## What I verified against the spec

- **Type registry.** Seven built-in types register at startup; `register_type` collisions raise; cycle detection in `validate_registry` catches A → B → A; `parents` / `accepts` / `produces` reference resolution all run before any tool executes; `csak collect` exits non-zero on a registry error and points at `csak doctor`.
- **`classify()`.** All seven types resolve correctly from realistic inputs; ambiguous strings return the most-specific match (`"api.acmecorp.com"` → `subdomain`, not `host`); `InvalidTargetError` raised for unparseable input; `_recognizes_host` correctly rejects `"10.0.0.42"` as a 4-label hostname (the bug Claude Code surfaced and fixed during exploratory testing — bare IPs now correctly land at `host` via the IP recognizer).
- **Subtype widening in the matcher.** `matches("domain", ["host"])` returns True (domain widens to host); `matches("url", ["host"])` returns False (siblings don't widen). `subfinder.accepts = ["domain", "network_block"]` correctly receives domain candidates, not subdomains. `httpx.accepts = ["host", "network_block"]` receives both `domain` and `subdomain` via widening but skips `url` per the slice 2 routing decision.
- **`extract_outputs` for each tool.** subfinder pulls `host` from JSONL; httpx pulls `url` with `status_code`/`tech`/`title` metadata when the host responded; nuclei pulls `matched-at` plus `extracted-results` URLs and silently drops anything that raises `InvalidTargetError` (legitimate non-typed strings in nuclei artifacts include response bodies, error messages, free-text fields).
- **Recursion runner.** Depth 0 cascade chaining preserved (subfinder JSONL feeds httpx via `-l`; httpx JSONL feeds nuclei via `-l`); `dedup_set=None` at depth 0 lets the slice 2 cascade rule run unimpeded; dedup-set seeded with `(tool, root_target, mode)` for every registered tool before depth 0 runs (prevents a depth-0 finding pointing at the root from re-queueing at depth 1); depth 1+ tasks are independent — one tool failing on one target doesn't abort siblings.
- **`--max-depth` semantics.** `0` runs to natural exhaustion; `1` is bit-for-bit slice 2 single-pass (verified via dedicated test `test_recursion.py::test_max_depth_one_equals_slice2`); `3` is the default; `2`+ runs the depths and prompts at the limit when the frontier is non-empty.
- **Prompt-to-continue.** Fires at the depth limit when the frontier is non-empty; default Y extends by `--max-depth`; `n` ends with `user_declined=True` and the unscanned frontier reported in the summary; `--yes` bypasses entirely.
- **`Tool` interface.** All slice 2 fields (`output_filename`, `rate_limit`, `version_args`, `override_flags`, `is_skipped_by_mode`, `parse_version`) untouched. `applies_to` survives as a thin default wrapper over `matches(t, self.accepts)` for external callers; the router calls `matches()` directly because it has the `TypedTarget` in hand from `classify()`.
- **Storage migration.** SCHEMA_VERSION 1→2 runs idempotently against an existing slice 1/2 DB. Pre-existing scan rows survive with NULL for `parent_scan_id` / `triggered_by_finding_id` and 0 for `depth`. Re-opening the DB doesn't re-run the migration.
- **`csak tools list/show`.** Both commands are pure reads of the runtime registry; `tools list` shows built-ins first then plugins with source paths; `tools show <n>` renders the live recursion graph (upstream/downstream computed from the registered toolbox), accepts/produces with subtype-widening annotation, modes, and rate limits.
- **`csak doctor`.** Validates type registry plus recursion graph plus plugin status. Same-tool feedback (nuclei → nuclei) considered valid in the orphan-output check; only `finding_ref` flags as an orphan in the built-in catalog (forward-compat for future tools that consume findings as input). Exits non-zero on any registry error and on bad plugins.
- **Plugin discovery.** Fail-soft: a plugin with a syntax error is reported but the run continues with the remaining tools. `CSAK_PLUGIN_DIR` overrides `~/.csak/tools/` for development. A real plugin file dropped on disk registers a new type, registers a new tool, joins the routing graph live, and shows up in `csak tools show httpx` with no edits to httpx's catalog file. Idempotent reload doesn't duplicate.
- **Backward compatibility.** `csak collect` without `--recurse` is bit-for-bit slice 2 — no recursion runner overhead, no dedup-set construction, no depth headers in output. The slice 1/2 test suite migrated cleanly through the type-name renames (`cidr` → `network_block`, IP → host) and continues to pass.

## End-to-end demo (verified live)

`scripts/run_slice3_demo.py` orchestrates a complete slice 3 surface walkthrough. Component pieces:

- `scripts/test_target_recurse.py` — three-port HTTP target (8080/app, 8081/admin, 8443/api) with role-shaped server headers (Apache/2.2.0, nginx/1.13.0, Werkzeug) and tiered disclosure fixtures: tier 0 (root-discoverable: `/`, `/robots.txt`, `/sitemap.xml`, `/.well-known/security.txt`), tier 1 (linked from sitemap/robots: `/admin`, `/api/v1`, `/backup`, `/private`, `/.git/config`, `/.env`), tier 2 (linked from tier-1 content: `/admin/db.sql`, `/admin/.git/HEAD`, `/api/v2/.env`, `/backup/index.php.bak`, `/private/.env.production`).
- `scripts/csak_plugins/linkfinder.py` — a real working plugin using `python` as its `binary` field. Its helper script (`_linkfinder_runner.py`) crawls a target, extracts URLs from HTML / sitemap / JSON, writes JSONL. The plugin's `extract_outputs` reads the JSONL back as `TypedTarget(type="url", value=...)` for the recursion frontier. Built-in scope filter (`--scope seed-host`) keeps recursion bounded to the original target. Registers a no-op ingest parser inline so the slice 1 ingest pipeline doesn't raise "no parser registered for tool 'linkfinder'" — see Deviations below for why this matters.
- `scripts/csak_plugins/asnmap_demo.py` — declarative-only stub. Registers a new `asn` target type (parents: `[network_block]`) and a stub tool that doesn't run; serves as the minimal example of plugin-introduced types and the live recursion graph in `csak tools show httpx`.
- `scripts/csak_plugins/README.md` — plugin contract (registration patterns, parser contract, `CSAK_PLUGIN_DIR` usage).

Live run with `--mode quick --max-depth 3`:

```
[csak] Identified target http://127.0.0.1:8080/ as type=url
[csak] Recursion: enabled, max-depth=3, dedup=on
[csak] Depth 0 (root) - 1 candidate
[linkfinder] ✓ done   16 rows
[csak] Depth 0 complete. Frontier: 16 typed targets extracted, 15 queued for depth 1 (1 deduped/dropped)
[csak] Depth 1 (depth budget remaining: 2) - 15 queued
[linkfinder] ✓ done   ... (15 tasks)
[csak] Depth 1 complete. Frontier: 16 typed targets extracted, 0 queued for depth 2 (16 deduped/dropped)
[csak] Collect complete ... depths=2, elapsed 1.9s
```

Recursion terminates by exhaustion at depth 2 in 1.9 seconds. 16 scans total: 1 at depth 0 with `parent_scan_id = NULL`, 15 at depth 1 each parented to the depth-0 scan. The dedup-set seeding is visible in the depth-0 frontier line — the root URL extracted by the depth-0 linkfinder run is the `1 deduped/dropped` (was already in the seeded set), the other 15 are new.

## Deviations from the spec text — accepted

Six deviations surfaced by Claude Code during exploratory testing, plus one gap that wasn't in the original spec at all. All are now written back into [[specs/slice-3|the spec]] (commit `2f02e87`).

**1. `httpx.accepts` and `nuclei.accepts` include `network_block`.** The earlier reconciliation pass (commit `2f02e87`'s predecessor in the spec history) had pinned `httpx.accepts = ["host"]` based on the slice 2 routing decision that URL-typed targets skip httpx. But subfinder/httpx/nuclei all need to accept `network_block` (CIDR) targets in slice 3 the same way they did in slice 2 via the legacy `cidr` literal — otherwise `csak collect --target 10.0.0.0/24` would route to a different tool set under slice 3 than slice 2. Final shipped: `subfinder.accepts = ["domain", "network_block"]`, `httpx.accepts = ["host", "network_block"]`, `nuclei.accepts = ["host", "url", "network_block"]`. URL still skips httpx (the slice 2 decision is preserved). The `csak tools show httpx` example in the spec body omits `network_block` for brevity; the live `tools show` output reflects the full accepts list.

**2. `_recognizes_host` rejects no-alpha-TLD strings.** Found via exploratory test on `"10.0.0.42"`. The permissive hostname recognizer was matching it as a 4-label hostname (each octet looks valid under loose rules), so `classify` returned `subdomain` instead of falling through to the IP-address branch. The fix: the host recognizer rejects strings whose final label has no alphabetic character. Bare IPs now correctly land at `host` via the IP recognizer, only genuine hostnames with at least one TLD-like label reach the domain/subdomain split.

**3. Depth-0 dedup interaction (`dedup_set=None` for the root pass).** The spec described depth 0 as "the slice 2 single-pass behavior." The shipped mechanism: the recursion runner passes `dedup_set=None` to the depth-0 `run_collect` call so the slice 2 cascade chaining (subfinder → httpx → nuclei) runs without dedup interference. Dedup applies depth-1 forward, where independent `(tool, target, mode)` tasks need to avoid redundant scans. This is now spelled out as a concrete mechanism in the spec.

**4. Dedup-set seeded with all `(tool, root_target, mode)` tuples before depth 0 runs.** Without this seeding, a depth-0 finding pointing at the root target (e.g. nuclei finds a vulnerability at the root) would re-queue an identical depth-1 nuclei scan against the same root. The seeding step is the implementation mechanism behind the spec's "don't retry on the next depth" — implicit before, now explicit.

**5. Doctor's orphan-output check considers same-tool feedback as valid.** Without this, every recursion-relevant tool flagged as an orphan (nuclei produces `url` and accepts `url`, so the strict definition would say it's not consumed by anyone "else"). The fix: the orphan check considers any registered tool as a consumer, including the producer itself — only types that no registered tool accepts at all flag as orphans. In the slice 3 built-in catalog, that's just `finding_ref`, which is registered for forward-compat with future tools that take findings as input.

**6. Registry validation gates `csak collect` startup with non-zero exit and a `ClickException` pointing at `csak doctor`.** Spec already said "validation failures stop the run before any tool executes." The shipped gate is concrete: `csak collect` calls `validate_registry()` after plugin discovery and before any tool runs; failures raise a `ClickException` referencing `csak doctor`; CI scripts can gate on `csak doctor` exit status. Doctor itself was previously printing errors but exiting 0, which is now also fixed.

### Plus one gap not in the original spec

**Plugin parser registration contract.** Surfaced when the live demo ran `csak collect` with the linkfinder plugin and the slice 1 ingest pipeline raised "no parser registered for tool 'linkfinder'". The error path is non-fatal — the Scan row records the ingest failure in `notes` and the recursion frontier still gets the plugin's `extract_outputs` results — but findings produced by the plugin are lost. Treating it as a contract failure rather than a silent drop is deliberate: a plugin without a parser is an incomplete plugin. The fix landed in the linkfinder example plugin (registers a no-op parser inline at module-import time) and is now documented under §Plugin discovery as a contract bullet. Plugins can either register a parser inline via `csak.ingest.pipeline.register_parser("plugin_tool_name", parser_fn)` or ship a parser module imported by the plugin file. The parser may be a no-op for plugins whose output is purely a recursion driver (URLs, hosts, etc.) and not a finding source.

## What this means for the wiki

Three slices shipped. The wiki's role has been reference-only since the slice 1 ship; slice 3's ship cements that. Pages updated today:

- [[specs/slice-3|slice 3 spec]] — six deviations written back via `wiki_edit` (commit `2f02e87`); "Status: all criteria met as of 2026-04-26" closer added to §Exit criteria via a follow-up edit (commit `18406d3`); plus a new contract bullet under §Plugin discovery for the parser-registration gap.
- [[specs/slice-2|slice 2 spec]] — "Status: all criteria except real-client-target use met as of 2026-04-26" closer added to §Exit criteria. Slice 2's implementation was on `origin/main` since 2026-04-25 per Eli; the slice 3 build directly extended the slice 2 catalog modules and exercised them. Writing a separate slice 2 implementation review session note would duplicate the verification work in this note.
- [[_index|index]] — phase marker rewritten to "slice 1 shipped, slice 2 shipped, slice 3 shipped"; Specs table flips slice 2 and slice 3 to "active — shipped"; recent-activity entry covers the implementation summary, the six deviations, the plugin parser contract gap, and the demo.
- [[synthesis/roadmap|roadmap]] — Phase 5 from "ready to start" to "done"; checklist of implementation milestones and verification steps populated; preamble rewritten; Phase 3's slice 2 line bumped from "built and under test" to "shipped" with a note that the slice 2 implementation review is folded into the slice 3 ship session note (this one).
- [[sessions/2026-04-26-slice-3-shipped|this session note]] — the canonical record of the slice 3 ship and the slice 2 fold-in.

The architecture overview's slice 3 walkthrough is still pending — the spec's §Module changes section serves the same purpose for now, and the walkthrough can land as a polish pass when something specifically motivates it.

## What's next

**Real-client-target use.** The one remaining slice 3 exit-criterion bullet — Eli running `csak collect --recurse` against a real client target. Expected to follow naturally during normal cybersecurity work; not blocking anything else.

**Slice 4 design.** No slice 4 yet; the [[synthesis/deferred-features|deferred features]] page is the post-slice-3 review backlog. The big strategic clusters waiting for review: the LLM-layer slice (LLM-assisted next-step picking, LLM-aware reports, LLM consumer of the JSON export); async / background `csak collect`; persistent cross-invocation dedup if the within-invocation kind proves insufficient; web UI; ticketing integrations; multi-user. None are urgent; each waits on either a real friction point in slice 3 use or a specific demand from the cybersecurity work that motivates CSAK.

**Long-standing carryover items, unchanged:**

- More competitive pages (Faraday, PlexTrac, AttackForge, Splunk, Wazuh, Tenable, n8n, an LLM-powered upstart). Non-blocking.
- Canva pitch deck slides 4 and 8 — periodic-mode language fix. External.
- Move scoring tables from inline Python to YAML config files. Queued behind slice 3 thorough testing; bundles with a post-testing architecture overview update.
- Architecture overview slice 3 walkthrough (see above).

## Related

- [[specs/slice-3|Slice 3 Spec]]
- [[specs/slice-2|Slice 2 Spec]]
- [[architecture/overview|Architecture Overview]]
- [[synthesis/roadmap|Roadmap]]
- [[sessions/2026-04-25-slice-3-design|2026-04-25 — Slice 3 Design]] (strategic decisions session that preceded the spec draft)
- [[sessions/2026-04-24-slice-1-shipped|2026-04-24 — Slice 1 Shipped]] (template this session note follows)
- [[synthesis/deferred-features|Deferred Features]]
- [[synthesis/lint-report|Lint Report]]
- [[synthesis/open-questions|Open Questions]]
