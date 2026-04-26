---
title: "Slice 3 — Recursion Demo"
category: test-plans
tags: [testing, slice-3, recursion, plugins, demo, end-to-end]
status: active
confidence: high
owner: shared
created: 2026-04-26
updated: 2026-04-26
---

# Slice 3 — Recursion Demo

A reproducible end-to-end exercise of the slice 3 surface against a synthetic local target, using the example `linkfinder` plugin. Wraps the slice 3 ship demo scaffolding into a documented testing plan.

## Goal

Verify the load-bearing slice 3 behaviors in isolation from real-network variability:

- `csak collect --recurse` runs end to end and terminates by frontier exhaustion.
- Frontier dedup correctly drops already-queued `(tool, target, mode)` tuples between depths.
- Lineage columns (`parent_scan_id`, `depth`, `triggered_by_finding_id`) populate correctly across multiple depths.
- Plugin discovery via `CSAK_PLUGIN_DIR` loads a real plugin from disk, registers it into the runtime registry, and routes recursion candidates through it.
- Plugin-defined `extract_outputs` correctly produces `TypedTarget` values that join the recursion frontier.
- Plugin scope filtering keeps recursion bounded to the seed host.
- Schema migration on a fresh database creates slice 3 columns at startup.
- The progress reporter shows depth headers, frontier counts, and recursion summary.

This plan does not exercise real-network behavior, real tool subprocess execution (subfinder/httpx/nuclei need their actual binaries), or recursion on targets the plugin doesn't understand. Those belong in the real-client-target plan and the failure-mode plan respectively.

## Slice 3 exit criteria covered

From [[specs/slice-3|the slice 3 spec]]'s §Exit criteria, this plan covers:

- ✅ `csak collect --recurse --target X` runs against a real target and recurses through tools that accept the produced types.
- ✅ `--max-depth N` correctly bounds depth; `0` runs to natural exhaustion; `1` is equivalent to slice 2 single-pass.
- ✅ Within-invocation structural dedup of `(tool, target, mode)` prevents redundant scans.
- ✅ `classify(value)` correctly identifies URL inputs (the linkfinder plugin produces URLs).
- ✅ `Tool.extract_outputs` is implemented for the plugin (and for the three built-ins, though they don't run in this demo's quick mode).
- ✅ A plugin file dropped in `CSAK_PLUGIN_DIR` is discovered at startup and registers its tool into the same toolbox as built-ins.
- ✅ `csak tools list` and `csak tools show <tool>` produce the documented output and show the loaded plugin.
- ✅ Live output during `csak collect --recurse` shows depth headers, per-stage progress, frontier counts, and a final summary.
- ✅ Data model migration runs cleanly on a fresh database (the demo uses a tmp DB).
- ✅ Slice 1 surface (`findings list`, `scan list`) works identically against recursion-produced data.

What this plan **does not** cover (deferred to other plans):

- Real-network behavior, rate limiting, adaptive backoff under load.
- Subfinder / httpx / nuclei subprocess invocation (these need real binaries; the demo uses linkfinder which is `python` so it works without ProjectDiscovery installs).
- Failure-mode behavior (a tool failing on one target at depth 1+; malformed plugin output; `csak doctor` gating on a bad plugin). Tracked in the failure-mode test plan.
- Real-client-target use. Tracked separately.
- Schema migration on a populated slice 1/2 DB. Tracked in the failure-mode plan as an adversarial scenario.

## Setup

Artifacts (all in the CSAK repo under `scripts/`):

| Path | Role |
|---|---|
| `scripts/test_target_recurse.py` | The synthetic test target. Three HTTP ports (8080/app, 8081/admin, 8443/api) with role-shaped server headers (Apache/2.2.0, nginx/1.13.0, Werkzeug). Tier-0 fixtures (root-discoverable: `/`, `/robots.txt`, `/sitemap.xml`, `/.well-known/security.txt`), tier-1 fixtures (linked from sitemap/robots: `/admin`, `/api/v1`, `/backup`, `/private`, `/.git/config`, `/.env`), tier-2 fixtures (linked from tier-1 content: `/admin/db.sql`, `/admin/.git/HEAD`, `/api/v2/.env`, `/backup/index.php.bak`, `/private/.env.production`). Designed so a recursive crawler discovers the tiers in order. |
| `scripts/csak_plugins/linkfinder.py` | Real working plugin; `binary = "python"`. Crawls a URL via the `_linkfinder_runner.py` helper, extracts URLs from HTML / sitemap / JSON, writes JSONL. `extract_outputs` reads the JSONL and emits `TypedTarget(type="url", value=...)` for each found URL. Built-in scope filter (`--scope seed-host`) keeps recursion bounded to the original target's host. Registers a no-op ingest parser inline so the slice 1 ingest pipeline doesn't raise "no parser registered for tool 'linkfinder'". |
| `scripts/csak_plugins/_linkfinder_runner.py` | The actual crawler. Helper script the plugin's `binary = "python"` invocation runs. |
| `scripts/csak_plugins/asnmap_demo.py` | Declarative-only stub plugin. Registers a new `asn` target type (parents: `[network_block]`) and a stub tool that doesn't run; serves to verify plugin-introduced types and the live recursion graph in `csak tools show httpx`. |
| `scripts/csak_plugins/README.md` | Plugin contract reference (registration patterns, parser contract, `CSAK_PLUGIN_DIR` usage). |
| `scripts/run_slice3_demo.py` | The orchestrator. Spins up the test target in a child process, sets `CSAK_PLUGIN_DIR` at the local plugins, runs the slice 3 surface in order: `csak doctor` → `tools list` → `tools show linkfinder` → `tools show httpx` → `org create` → `collect --recurse` → scan-lineage dump → `findings list`. Cleans up tmp DB unless `--keep`. |

Pre-flight requirements:

- Python 3.x with the CSAK package importable (`PYTHONPATH=src python -m csak ...` style invocation works from the repo root).
- Network access to localhost only. No external network calls; the test target binds 127.0.0.1.
- Free ports 8080, 8081, 8443 on localhost.
- No CSAK plugins required outside `scripts/csak_plugins/` — the demo sets `CSAK_PLUGIN_DIR` explicitly so the user's `~/.csak/tools/` is bypassed.
- The orchestrator creates a tmp database; nothing in the user's `~/.csak/` is touched.

## Procedure

**Run from the repo root.** The orchestrator handles target startup, plugin loading, and tmp DB lifecycle.

```bash
PYTHONPATH=src python scripts/run_slice3_demo.py --mode quick --max-depth 3
```

Flags:

- `--mode quick` — skips nuclei (which would otherwise run against the local test target and produce noise); the linkfinder plugin still runs.
- `--max-depth 3` — depth ceiling. The recursion will exhaust by depth 2 or so against this target since the tier structure is shallow; `3` provides headroom.
- `--keep` (optional) — preserves the tmp DB after the run for inspection. Default cleans up.
- `--max-depth 0` — runs to exhaustion without depth ceiling. Useful for verifying termination is by exhaustion, not by depth.

Manual variation — run the pieces directly without the orchestrator:

```bash
# Start the test target (separate terminal)
PYTHONPATH=src python scripts/test_target_recurse.py

# Run csak collect against it
CSAK_PLUGIN_DIR=$PWD/scripts/csak_plugins \
    PYTHONPATH=src python -m csak collect \
    --org demo \
    --target http://127.0.0.1:8080/ \
    --recurse --max-depth 3 --yes
```

## Expected observations

### `csak doctor` output (run before collect)

- ✓ subfinder / httpx / nuclei: present or warning (depending on whether the user has them installed; not load-bearing for this demo since `--mode quick` skips nuclei and linkfinder is the active tool).
- ✓ linkfinder plugin: loaded, source path = `<repo>/scripts/csak_plugins/linkfinder.py`.
- ✓ asnmap_demo plugin: loaded, source path = `<repo>/scripts/csak_plugins/asnmap_demo.py`.
- ✓ Type registry: 8 types (7 built-in + `asn` from the asnmap_demo plugin), no parent cycles, all references resolve.
- ✓ Recursion graph: `finding_ref` flagged as the only orphan output (forward-compat type with no consumers in the built-in catalog).
- Exit code 0.

### `csak tools list` output

```
Built-in tools:
  subfinder   domain, network_block → subdomain
  httpx       host, network_block → live_host
  nuclei      host, url, network_block → finding_ref, url

Plugin tools:
  linkfinder  url → url            <repo>/scripts/csak_plugins/linkfinder.py
  asnmap      asn → network_block  <repo>/scripts/csak_plugins/asnmap_demo.py
```

### `csak tools show httpx` output

The recursion graph section should show the asnmap plugin upstream (asn → network_block, expanded to host) and the linkfinder plugin downstream (consumes httpx-produced URLs via subtype widening). This verifies the live recursion graph is computed from the runtime registry, not hardcoded.

### `csak collect --recurse` live output

```
[csak] Identified target http://127.0.0.1:8080/ as type=url
[csak] Recursion: enabled, max-depth=3, dedup=on

[csak] Depth 0 (root) - 1 candidate
[linkfinder]  ✓ done   16 rows
[csak] Depth 0 complete. Frontier: 16 typed targets extracted, 15 queued for depth 1 (1 deduped/dropped)

[csak] Depth 1 (depth budget remaining: 2) - 15 queued
[linkfinder]  ✓ done   ... (15 tasks)
[csak] Depth 1 complete. Frontier: 16 typed targets extracted, 0 queued for depth 2 (16 deduped/dropped)

[csak] Collect complete for http://127.0.0.1:8080/ (mode=quick, recurse=on, max-depth=3)
[csak] Total elapsed: ~1.9s
[csak] Depths run: 2 (depth 0, 1)
[csak] Scans created: 16 (linkfinder x16)
[csak] Findings: 0 new, 0 re-occurrences
[csak] Frontier remaining: 0 candidates not scanned
```

Key verification points:

1. **Depth 0 dedup count is 1.** The depth-0 linkfinder run extracts 16 URLs; the root URL is one of them; the dedup set was seeded with `(linkfinder, http://127.0.0.1:8080/, quick)` before depth 0; so the root URL gets dropped, leaving 15 queued for depth 1.
2. **Depth 1 fans out to 15 tasks.** Each surviving URL becomes its own `(linkfinder, url, quick)` task at depth 1.
3. **Depth 2 is empty.** Each depth-1 linkfinder run extracts a similar URL set; all already in the dedup set; 16 deduped/dropped, 0 queued for depth 2. Recursion terminates by exhaustion.
4. **Total elapsed is ~1.9 seconds.** First-run timing on a developer laptop. Significantly slower runs (>10 seconds) indicate something is wrong — likely the test target is responding slowly or DNS resolution is misbehaving.
5. **No nuclei findings.** `--mode quick` skipped nuclei; only linkfinder ran. `Findings: 0 new` is correct.

### Scan-lineage dump

After collect, the orchestrator queries the DB and prints scan rows with their lineage columns:

```
scan_id   tool        depth  parent_scan_id          triggered_by_finding_id
ab12...   linkfinder  0      NULL                    NULL
cd34...   linkfinder  1      ab12...                 NULL
ef56...   linkfinder  1      ab12...                 NULL
...
```

Verification: 1 scan with `depth=0` and `parent_scan_id=NULL`; 15 scans with `depth=1` all parented to the depth-0 scan. `triggered_by_finding_id` is NULL for all because linkfinder's recursion fanout is N typed targets, not one specific finding (per the slice 3 spec's distinction between bulk fanout and finding-triggered spawn).

### `csak findings list` output

Empty. linkfinder doesn't produce findings — its no-op ingest parser returns an empty list, and `--mode quick` skipped nuclei. The `findings` table has zero rows, but the `scans` table has 16 rows. This is correct: `findings list` and `scan list` are separately queryable, and a scan without findings is a valid outcome (it's documented as such in the slice 1/2 spec).

## Known limits

- **Synthetic target only.** The test target is a fixture, not a real web application. It doesn't exhibit real-world behaviors like rate limiting, redirects to authenticated areas, or content varying by user agent. The real-client-target plan covers these.
- **One plugin tool actively recurses.** Linkfinder produces URLs and accepts URLs (same-tool feedback). The asnmap_demo plugin is declarative-only — it doesn't actually run. Recursion behavior between *different* plugin tools isn't directly exercised here; the type-graph routing is, via the `tools show httpx` output verification.
- **Built-in tools don't actively run.** `--mode quick` skips nuclei, and the test target doesn't have subdomains for subfinder to enumerate. The slice 3 unit-test suite covers built-in tool routing and `extract_outputs` behavior; this demo covers the plugin-tool path end to end.
- **No httpx involvement.** URL targets skip httpx (the slice 2 routing decision preserved into slice 3). The depth-0 root being a URL means httpx isn't invoked even if `--mode standard` were used. Plugin-vs-built-in interaction at depths > 0 would need a target type that produces both built-in-routable and plugin-routable candidates.
- **Schema migration on fresh DB only.** The orchestrator creates a new tmp DB per run, so the migration runs once on an empty database. Migration on a populated slice 1/2 DB is covered by the slice 3 ship session note's verification but should land as its own scenario in the failure-mode plan.
- **Plugin discovery error paths not exercised.** A plugin with a syntax error, missing dependency, or invalid `accepts`/`produces` references would test fail-soft loading. The failure-mode plan covers these.
- **Adaptive rate limiting not exercised.** The test target doesn't 429. Real-client-target plan covers this.
- **No multi-org / multi-target interaction.** The demo creates one Org and runs collect against one target. Cross-org isolation, target-weight changes, and dedup-across-runs are slice-1 features verified by the slice 1 test suite, not re-exercised here.

## Variations worth running

Beyond the default `quick / max-depth=3` invocation:

- **`--max-depth 0`** — verify termination is by exhaustion rather than depth ceiling. Should produce the same scan count and elapsed time (recursion exhausts before any depth limit would matter).
- **`--max-depth 1`** — verify slice 2 single-pass parity. Should produce 1 scan at depth 0 with no depth-1 fanout, no prompt-to-continue, no depth headers in the output beyond depth 0.
- **`--max-depth 2`** — exercises prompt-to-continue. After depth 1 completes with non-empty frontier (15 candidates queued for depth 2 before they get deduped to 0), the runner should prompt; in the orchestrator's `--yes` mode it auto-continues (which extends the depth limit by 2); in interactive mode the user can press `n` to verify clean termination with `user_declined=True`.
- **`--keep`** — preserves the tmp DB. Manual SQLite inspection: verify `scans.depth`, `scans.parent_scan_id`, `scans.triggered_by_finding_id` columns are populated correctly; verify `SCHEMA_VERSION` row in `meta` table = 2.

## What this plan protects against

- **Regressions in dedup logic.** A change to the dedup-set seeding behavior or the `(tool, target, mode)` key would either crash the demo (frontier explodes) or alter the dedup count from 1 / 16 at depths 0 / 1 respectively.
- **Regressions in lineage columns.** `parent_scan_id`, `depth`, or `triggered_by_finding_id` not populating correctly would surface in the scan-lineage dump.
- **Regressions in plugin discovery.** A plugin failing to load would show in the `csak doctor` output and the `csak tools list` would miss linkfinder, breaking the rest of the demo.
- **Regressions in the type registry validation.** A change that rejected the `asn` plugin-introduced type would crash `csak doctor` with a registry error.
- **Regressions in the recursion runner's depth-0-cascade-passthrough.** Not directly tested here (URL targets skip the slice 2 cascade), but the depth-0 to depth-1 boundary is exercised; a regression that leaked the dedup set into depth 0 would change behavior visibly.
- **Regressions in the frontier-counts live output.** The "16 extracted, 15 queued, 1 deduped/dropped" line is the canonical user-visible signal of dedup working; a regression would change those numbers.

## Related

- [[specs/slice-3|Slice 3 — Recursion & Catalog Spec]]
- [[sessions/2026-04-26-slice-3-shipped|2026-04-26 — Slice 3 Shipped]] (the demo scaffolding was built during the slice 3 ship)
- [[test-plans/README|Test Plans index]]
