---
title: "Slice 3 — Recursion & Catalog Expansion"
category: specs
tags: [slice-3, recursion, catalog, plugins, types, spec]
status: active
confidence: high
owner: shared
created: 2026-04-25
updated: 2026-04-26
---

# Slice 3 — Recursion & Catalog Expansion

> Drafted 2026-04-25 from the slice 3 design discussion. Strategic decisions all settled in conversation; this spec consolidates them. Review and sign-off pending.

## Goal

Make `csak collect` recursive: when a tool produces output that another tool could meaningfully accept as input, run that next tool. Make adding new tools to CSAK genuinely cheap — drop a Python file in `~/.csak/tools/` and it's part of the catalog. Make the system self-describing about which tools feed which — the recursion graph is computed from declarations, not maintained by hand.

The mental model: an analyst types `csak collect --target acmecorp.com` and CSAK runs subfinder → httpx → nuclei (slice 2). Some of nuclei's findings reveal new URLs the original sweep didn't know about. Slice 3 picks those up automatically — feeds them back to httpx, which feeds the live ones to nuclei, until the recursion frontier is exhausted or `--max-depth` stops it. Subsequent tools added to the catalog (port scanners, TLS analyzers, ASN mappers) join the same recursion graph by declaring what they accept and produce.

This is the slice that turns CSAK from "runs the tools you tell it to" into "runs the tools that fit, in the order they fit, until there's nothing left to do."

## Scope

### In scope

- **`csak collect --recurse`** — opt-in recursion flag on the existing `collect` command. Each tool's output is scanned for typed values that another tool accepts; those become inputs for the next depth.
- **`--max-depth N`** flag controlling recursion depth. Default `3`. `0` = infinite (no depth limit). `1` = no recursion (single pass, slice 2 behavior). Prompt-to-continue when the depth limit is reached and the frontier is non-empty.
- **Within-invocation structural dedup.** A `(tool, target_value, mode)` tuple already executed in this run is not queued again. In-memory, per-run, no database persistence. Termination is by exhaustion, not by budget.
- **Type registry** — a runtime collection of named target types (`network_block | host | domain | subdomain | url | service | finding_ref` plus whatever plugins introduce). Each type has a recognizer and a parser. The registry is populated at startup from built-in types and from any plugins discovered.
- **`classify(value)` as a dispatcher** — given a string, walk the registered types and return the most-specific match as a `TypedTarget`. Used both for the initial `--target` argument and for tool `extract_outputs`. Single seam, single bug surface.
- **Extended `Tool` interface** with `accepts: list[str]`, `produces: list[str]`, and `extract_outputs(artifact_path, scan) -> list[TypedTarget]`. The slice 2 catalog modules (subfinder, httpx, nuclei) gain these fields and a small `extract_outputs` implementation each.
- **Plugin discovery** — Python files in `~/.csak/tools/*.py` are imported at `csak collect` startup, register their tools (and any new types) into the same toolbox as built-ins. No code distinction between built-in and plugin tools at runtime.
- **`csak tools list`** — show every registered tool, what it accepts/produces, and whether it's a built-in or plugin.
- **`csak tools show <tool-name>`** — detail view: catalog metadata, accepts/produces, available modes, rate-limit defaults, recursion graph reachable from this tool.
- **Depth-aware live output** extending the slice 2 format: depth header per layer, frontier counts (queued / after-dedup / actually run), prompt-to-continue at depth limit.
- **Data model additions** — three new columns on the `Scan` table: `parent_scan_id` (nullable, references Scan), `depth` (int, 0 for root), `triggered_by_finding_id` (nullable, references Finding). Lineage queryable via the existing `csak scan list` and surfaced in report methodology.
- **`csak doctor` extension** to validate the plugin set: type-name collisions, parent-cycle in the type hierarchy, accepts/produces references to undefined types. Failures point at the offending plugin.
- **Pluggable third-party tools share the toolbox** — same catalog, same routing, same dedup, same live output, same scan records. No plugin-second-class-citizen behavior anywhere.

### Out of scope

- **LLM use anywhere.** Slice 3 stays deterministic, same posture as slices 1 and 2. LLM-assisted next-step picking was considered and rejected. Pulled forward into the "LLM layer" later slice if it ever lands. See [[synthesis/deferred-features|deferred features]].
- **Async / background / scheduled `csak collect`.** Slice 3 stays sync-only. Recursion makes long runs more likely; the slice 3 mitigation is excellent live status, not backgrounding. Backgrounding revisited as a later slice if real friction emerges. See [[synthesis/deferred-features|deferred features]].
- **Wall-clock / cost / token budgets.** Structural dedup is the termination mechanism. `--max-depth` is the analyst's emergency brake. No `--max-time`, `--max-cost`, `--max-tokens` flags in slice 3. Revisit only if structural dedup proves insufficient or paid services / LLMs enter the loop in a later slice.
- **New tools added to the built-in catalog.** Slice 3 ships the same three tools as slice 2 (subfinder, httpx, nuclei), now recursion-aware. The mechanics first; the catalog grows in slice 3.x or by analyst plugins.
- **Plugin sandboxing.** Plugins run as full Python under the analyst's user permissions. No process isolation, no capability restriction, no signature verification. Slice 3 takes the "trust the analyst's plugin choice" posture explicitly. Sandboxing deferred to a later slice if/when third-party plugin distribution becomes common. See [[synthesis/deferred-features|deferred features]].
- **Cross-invocation / persistent recursion state.** A second `csak collect --recurse` invocation against the same target is a fresh recursion. No "remember what we already scanned last week and skip it." This is consistent with slice 2's "every collect invocation runs the full pipeline fresh."
- **Recursion across tools in the ingest path** (Zeek, osquery). Their recursion equivalent would be "watching for new findings and re-running queries," which is operationally different (continuous monitoring, not on-demand). Stay ingest-only as in slices 1 and 2.
- **Plugin marketplace, plugin manager command, plugin distribution mechanism.** `~/.csak/tools/` is a directory; analysts manage it themselves with their own tools (cp, git clone, etc.). A `csak plugin install <name>` story is a later slice if it earns its place.
- **Configuration-by-knob explosion for recursion.** No `--recurse-rules.yaml`, no per-tool recursion-trigger configs. The recursion graph comes from `accepts`/`produces` declarations on the `Tool` interface; that's the only knob.

## Recursion model

### Termination by exhaustion, not by budget

Slice 3 recursion terminates when there is nothing left to run, not when a clock or a counter says stop. The analyst doesn't set a wall-clock budget; they set a depth ceiling, and exhaustion happens first in practice for realistic targets.

The mechanism is **within-invocation structural dedup of the recursion frontier.** During a single `csak collect --recurse` run, CSAK maintains an in-memory set of `(tool_name, target_value, mode)` tuples that have already been queued or run. When a stage produces typed outputs and the router considers feeding each one to a downstream tool, it consults this set. Tuples already present are dropped. The frontier shrinks because the target space is finite — every domain has finitely many subdomains, every CIDR has finitely many hosts, every site has finitely many URLs reachable in N templates of recursion — and dedup ensures we don't loop on cycles in the discovery graph.

The dedup set is **in-memory only.** It exists for the duration of the `csak collect` process. When the command exits, the set is discarded. The next invocation starts fresh — same posture as slice 2's "every invocation runs the full pipeline."

**Why not persistent dedup.** Persistent state would conflict with slice 2's deliberate decision against quick-rescan / staleness detection. The slice 1 ingest dedup already handles "we've seen this finding before" at the data layer, which is the user-visible question. Within-invocation dedup handles the operational question "should we run this tool again right now," which is per-run.

**Why not wall-clock or cost budgets.** Wall-clock is brittle (a target with a slow API gets cut off mid-scan with an arbitrary mostly-finished result), cost is meaningless without paid services in the loop, and both add a flag that needs documentation, defaults, and edge-case behavior. Structural dedup terminates naturally; depth is the safety brake. If structural dedup proves insufficient in practice — some recursion graph blows up because the dedup keys aren't capturing the right equivalence — we add a wall-clock budget then. See [[synthesis/deferred-features|deferred features]] for the deferral.

### `--max-depth` semantics

```
csak collect --org acmecorp --target acmecorp.com --recurse                  # default depth 3
csak collect --org acmecorp --target acmecorp.com --recurse --max-depth 5
csak collect --org acmecorp --target acmecorp.com --recurse --max-depth 0    # infinite
csak collect --org acmecorp --target acmecorp.com --recurse --max-depth 1    # equivalent to slice 2 single-pass
```

| Value | Meaning |
|-------|---------|
| `0` | Infinite. Recursion runs until the frontier is exhausted. |
| `1` | No recursion. Equivalent to running `csak collect` without `--recurse`. Provided so scripts can parameterize depth without conditionally adding/removing the flag. |
| `2`, `3`, ... | Run depth 0 (root), depth 1, ... up to depth N-1. Default is `3`. |

**Default of `3`** because realistic recursion patterns produce useful output by depth 2 — root → subdomain enumeration → live-host probing → vuln scanning is depth 3, and a fourth depth typically captures URLs surfaced by nuclei findings that warrant another httpx + nuclei pass. Going deeper rarely produces qualitatively new findings; it costs time without paying back. An analyst who wants more says `--max-depth 5`; an analyst who wants infinite says `--max-depth 0`.

### Prompt-to-continue at depth limit

When depth `N-1` finishes and the frontier (after dedup) is non-empty, CSAK doesn't silently truncate. It pauses and prompts:

```
[csak] Depth budget hit (max-depth=3). Frontier remaining: 41 unscanned candidates.
[csak] Continue with another 3 depths? [Y/n]: 
```

The default answer is `Y` — pressing Enter continues. `n` (or any non-affirmative response) ends the run cleanly with the frontier reported in the final summary. Continuing extends the depth limit by the original `--max-depth` value (so default `3` becomes `6` becomes `9`); the prompt repeats at each subsequent limit.

In non-interactive contexts (`--yes` flag inherited from slice 2), the prompt is bypassed and recursion continues until the frontier is exhausted, capped only by `--max-depth 0` semantics if the analyst sets it.

**Why prompt-to-continue rather than hard stop or silent extend.** Hard stop loses work the analyst probably wants; silent extend defeats the purpose of having a depth limit at all. Prompt-to-continue gives the analyst a moment to look at the per-depth output, decide whether the recursion is producing useful new findings or chasing tangents, and confirm or back out. It also creates a natural "save point" in long runs — the analyst can read the output so far, hit `n`, and iterate on the partial findings before launching deeper.

### What recursion looks like in practice

A `csak collect --recurse --target acmecorp.com` run, mid-execution at depth 1:

```
[csak] Identified target acmecorp.com as type=domain
[csak] Recursion: enabled, max-depth=3, dedup=on

[csak] Depth 0 (root) - 1 candidate
   [subfinder]  ✓ done   elapsed=12s   produced=87 subdomains
   [httpx]      ✓ done   elapsed=78s   produced=34 live_hosts (53 dropped: not responding)
   [nuclei]     ✓ done   elapsed=4m23s findings=12, produced=3 urls

[csak] Depth 0 complete. Frontier extracted: 124 typed targets (87 subdomains, 34 live_hosts, 3 urls)
[csak] After dedup: 41 candidates queued for depth 1
[csak]   - 0 subdomains (subfinder doesn't accept subdomain inputs)
[csak]   - 38 live_hosts → nuclei (already scanned at depth 0: dropped 0; scanned at depth 0 for httpx: dedup applies)
[csak]   - 3 urls → httpx (will produce live_hosts) and nuclei (direct)

[csak] Depth 1 (depth budget remaining: 2)
   [httpx]   ⠴ running 3/3 urls...   elapsed=8s    live=2/3
   [nuclei]  ⠦ running 38/41 hosts... elapsed=1m15s findings=4 so far
```

The depth header, frontier counts (queued / after-dedup), and per-tool progress are all visible. Stage-skipped reasons appear in the same format slice 2 introduced — the analyst can audit why the dedup dropped what it dropped.

### How the frontier is built

After every stage completes, the runner:

1. Calls the tool's `extract_outputs(artifact_path, scan)` — which returns `list[TypedTarget]`.
2. For each `TypedTarget`, asks every other registered tool whether `target_type in tool.accepts` (with subtype widening — see Type system below).
3. For each `(tool, target_value, mode)` candidate not already in the dedup set:
   - Adds to the dedup set.
   - Adds to the next-depth queue.
4. Stage's `extract_outputs` results are also persisted as advisory metadata on the `Scan` row (so reports can show "this scan produced 87 typed outputs of which 41 advanced to depth 1").

The next depth runs each tool in the queue in dependency order — same router logic as slice 2, just over a larger set of candidates. A tool that accepts `live_host` runs after a tool that produces `live_host` even within the same depth, so the depth-1 queue itself can be partially ordered.

**Stage failures and zero-outputs at any depth** behave exactly as in slice 2 — Scan recorded with `status=failed` or zero findings, pipeline continues with whatever data exists, dedup set still updated for the (tool, target, mode) tuple so we don't retry on the next depth.

**Failure cascade differs by depth.** At depth 0 the slice 2 cascade rule still applies: a subfinder failure leaves the next stage to fall back to the bare target; a httpx failure aborts the root pass's nuclei stage because there's no live host list. At depth 1+, each `(tool, target, mode)` is its own independent attempt against one typed target — a single tool failing on one target does not abort sibling tasks at that depth. The depth-0 cascade rule survives because depth 0 *is* the slice 2 single-pass behavior.

**Recursion-spawned Scans go through the existing slice 1 ingest path.** Target promotion (creating Target rows for newly-discovered subdomains, hosts, URLs) happens via the existing `csak.ingest.targets` module, same as slice 2. The recursion runner doesn't pre-create Targets for the typed values it queues — it lets the stage's ingest pass do that as part of its normal Finding-creation flow. `Scan.target_ids` is populated normally from there.

## Type system

The type system is the load-bearing piece of slice 3's catalog ergonomics. It needs to be small enough to understand, extensible enough that adding a new tool with a new type is a one-file change, and deterministic enough to give the same routing answers across runs.

### Core types — what slice 3 ships

```
network_block       parents: []
                    e.g. "10.0.0.0/24", "AS15169" (CIDR or ASN; expand to host list)
host                parents: []
                    e.g. "10.0.0.42", "acmecorp.com" — abstract base for anything probeable
domain              parents: [host]
                    e.g. "acmecorp.com" — registrable apex, public-suffix-list match
subdomain           parents: [host]
                    e.g. "api.acmecorp.com" — non-apex hostname
url                 parents: []
                    e.g. "https://api.acmecorp.com/v2/users" — scheme + host + path
service             parents: []
                    e.g. "10.0.0.42:8080/tcp" — host + port + protocol
finding_ref         parents: []
                    e.g. a Finding row's UUID — for tools that consume findings as input
                         (a future exploit-attempter, an LLM summarizer, etc.)
```

The hierarchy is shallow on purpose. `domain` and `subdomain` both inherit from `host` because tools that probe hosts (httpx, nuclei) don't care which kind they got — but tools that specifically need a domain (subfinder) declare `accepts: [domain]` and won't be fed subdomains. The hierarchy resolves this automatically via subtype widening in the matcher.

`network_block` covers both CIDRs and ASNs because the consuming tool's job is to expand it to hosts; whether the expansion logic is "iterate CIDR" or "look up ASN routes" is the tool's concern. Slice 2's `cidr` type is renamed `network_block` for this reason; the rename is one of the slice 3 migrations.

`finding_ref` exists for forward-compatibility with tools that take findings as input. Slice 3 has none, but the type is registered so that a plugin author writing such a tool doesn't have to introduce the type themselves. (The alternative — only registering `finding_ref` when the first such tool appears — pushes meta-knowledge into plugin authors.)

### `TypedTarget` — the value object

Every typed value flowing between tools is a `TypedTarget`:

```python
@dataclass
class TypedTarget:
    type: str                                   # "host", "url", "service", ...
    value: str                                  # "api.acmecorp.com", "https://...", "10.0.0.42:8080/tcp"
    metadata: dict = field(default_factory=dict)
                                                # purely advisory; tools may ignore
                                                # e.g. {"status": 200, "tech": ["nginx"], "title": "Login"}
    source_finding_id: str | None = None        # for lineage; null when from initial input
    parsed: dict = field(default_factory=dict)
                                                # cached output of TargetType.parse(value)
                                                # e.g. service: {"host": "10.0.0.42", "port": 8080, "proto": "tcp"}
```

**Why metadata is advisory and not part of the type.** Httpx emits a live host with `{status: 200, tech: ["wordpress"], title: "..."}`. Nuclei could meaningfully use `tech` to filter templates, but a port scanner doesn't care about any of it. If the type itself encoded "host with tech metadata," nuclei and the port scanner would need different types and the matching logic would balloon. Keeping metadata as an optional dict on the value lets every tool advertise the same `accepts: [host]` and decide internally what to use.

**Why `parsed` is cached.** Service strings (`"10.0.0.42:8080/tcp"`) need parsing to be useful; doing it once at classification time and stashing the components avoids every consuming tool re-parsing.

### `TargetType` — the registration object

```python
@dataclass
class TargetType:
    name: str                                   # "url", "domain", "service", ...
    parents: list[str]                          # ["host"] for domain; [] for the root types
    recognizes: Callable[[str], bool]
    parse: Callable[[str], dict]                # extracts components for TypedTarget.parsed
```

Built-in types are registered by `csak/collect/types/builtin.py` at startup; plugins register their own types in the same module file as their tool. The registration entry point is a single function:

```python
def register_type(t: TargetType) -> None: ...
```

### `classify(value)` — the dispatcher

```python
def classify(value: str) -> TypedTarget:
    """
    Walk registered types in topological order from leaves to roots.
    Return a TypedTarget at the most-specific matching type.
    Raise InvalidTargetError if no type matches.
    """
```

When a string matches multiple types — `"api.acmecorp.com"` matches both `subdomain` and `host` — the classifier returns the most-specific match (`subdomain`), because `subdomain.parents = [host]` and the topological walk hits the leaf first.

**Unparseable strings raise `InvalidTargetError`.** When `classify` walks the registry without finding any matching type, it raises rather than returning a sentinel — mirroring slice 2's `detect.detect_target_type` returning the `"invalid"` literal. The CLI catches `InvalidTargetError` at `--target` resolution and exits with a clear message; `extract_outputs` implementations catch it and silently drop the offending value (a tool's artifact may legitimately contain strings that aren't typed targets, e.g. response bodies, error messages, free-text fields).

`classify` does not need to know the universe of types ahead of time. It iterates the runtime type registry. Adding a type → it shows up in the classifier with no other code changes.

`classify` is used in **two places**:

- The CLI's `--target` argument resolution at depth 0.
- Every tool's `extract_outputs` for the strings it pulls out of its artifact.

This is the deliberate symmetry from the design discussion: initial input and recursion-extracted output go through the same classification path. One bug surface, one place to fix detection edge cases.

### Subtype widening in the matcher

When a tool declares `accepts: [host]`, the router considers a `TypedTarget(type="domain")` a match because `domain` is-a `host`. The matcher walks from the candidate's type up its `parents` chain and compares each ancestor against the tool's `accepts` list.

```python
def matches(candidate_type: str, accepts: list[str]) -> bool:
    """True iff candidate_type or any ancestor is in accepts."""
    if candidate_type in accepts:
        return True
    for parent in TYPES[candidate_type].parents:
        if matches(parent, accepts):
            return True
    return False
```

A tool that wants to be strict — accepts only domains, not subdomains — declares `accepts: [domain]` and won't match subdomain candidates. The hierarchy is a hint to the matcher, not a forced widening.

### Type registry validation

At `csak collect` startup, after all built-ins and plugins have registered, CSAK validates:

- **No duplicate type names.** A plugin trying to register `service` when it's already a built-in fails with a clear error pointing at the plugin file.
- **No cycles in the parent hierarchy.** `A → B → A` fails.
- **All `parents` references resolve.** A type declaring `parents: [host]` when no `host` type is registered fails.
- **All tool `accepts` and `produces` references resolve.** A tool declaring `accepts: [pcap]` when no `pcap` type is registered fails.

Validation failures stop the run before any tool executes, with the message identifying which plugin or built-in caused the conflict. `csak doctor` runs the same checks on demand, so an analyst dropping in a plugin can validate without launching a collect run.

## Tool catalog — extended interface

Slice 3 extends the slice 2 `Tool` interface with three new fields. The slice 2 interface as it exists in the shipped code (`csak/collect/tool.py`) carries more than just the four routing-relevant methods listed below — it also has `output_filename`, `rate_limit: RateLimitDefaults`, `version_args`, `override_flags: dict`, `is_skipped_by_mode(mode)`, and `parse_version(...)`. Slice 3 doesn't change any of those; the diff is additive.

```python
class Tool:
    # slice 2 fields shown for context (see csak/collect/tool.py for the full set)
    name: str
    binary: str
    minimum_version: str
    install_command: str
    output_filename: str
    rate_limit: RateLimitDefaults | None
    override_flags: dict[str, str]
    def applies_to(target_type: str) -> bool: ...        # legacy slice 2; see note
    def invocation(target, mode, overrides) -> list[str]: ...
    def parse_progress(stderr_line) -> ProgressUpdate | None: ...
    def detect_rate_limit_signal(stderr_line) -> bool: ...
    def is_skipped_by_mode(mode) -> bool: ...
    def parse_version(output) -> str | None: ...

    # slice 3 additions
    accepts: list[str]                                    # ["domain", "subdomain"]
    produces: list[str]                                   # ["subdomain"]
    def extract_outputs(artifact_path, scan) -> list[TypedTarget]: ...
```

**`accepts` replaces `applies_to` for routing.** The slice 2 `applies_to(target_type)` is now derivable from `accepts` plus the subtype matcher (`applies_to(t) == matches(t, self.accepts)`). The slice 2 method stays available as a thin wrapper for backward compatibility during the migration; slice 3 builds prefer using `accepts` directly. After the slice 3 migration completes, `applies_to` can be removed.

**`extract_outputs` formalizes existing per-tool logic.** The slice 2 collect pipeline already extracts typed values from one stage's artifact to feed the next — see `_prepare_input_for_next_stage` and `_extract_field_to_list` in `csak/collect/pipeline.py`, which read subfinder's JSONL `host` field and httpx's JSONL `url` field (with `host` fallback) to build the next stage's input list. Slice 3 lifts this hardcoded subfinder→httpx, httpx→nuclei pipe into a method on each `Tool` and routes outputs through the type registry instead of a fixed two-step chain. The existing helpers can be deleted once `extract_outputs` is in place; their behavior is subsumed.

**`extract_outputs` is the new per-tool work.** Each tool implements it to pull recursion candidates out of its own artifact. Implementations are typically small — read the artifact (JSONL, XML, whatever the tool produces), extract the relevant strings, call `classify` on each:

```python
# csak/collect/tools/subfinder.py
def extract_outputs(artifact_path, scan):
    return [classify(line["host"]) for line in iter_jsonl(artifact_path)]

# csak/collect/tools/httpx.py
def extract_outputs(artifact_path, scan):
    out = []
    for line in iter_jsonl(artifact_path):
        if line.get("status_code"):  # responding host
            t = classify(line["url"])
            t.metadata["status"] = line["status_code"]
            t.metadata["tech"] = line.get("tech", [])
            t.metadata["title"] = line.get("title", "")
            out.append(t)
    return out

# csak/collect/tools/nuclei.py
def extract_outputs(artifact_path, scan):
    out = []
    for finding in iter_jsonl(artifact_path):
        if "matched-at" in finding:
            try:
                out.append(classify(finding["matched-at"]))
            except InvalidTargetError:
                continue  # not a typed value we recognize; skip
        for url in finding.get("extracted-results", []):
            try:
                out.append(classify(url))
            except InvalidTargetError:
                continue
    return out
```

**The boundary between `extract_outputs` and `classify`.** `classify` is pure type detection on a string; it doesn't decide whether a string is a "real" output. `extract_outputs` decides which fields of an artifact are real outputs (only specific JSON fields, only when the host responded, etc.) and calls `classify` on each. This split means tool authors writing `extract_outputs` don't reimplement type detection, and the type registry doesn't need to know which tool produced what.

### Plugin discovery

At `csak collect` startup:

1. Import `csak/collect/types/builtin.py` — registers core types.
2. Import every module under `csak/collect/tools/` — registers built-in tools (subfinder, httpx, nuclei). Tools may register additional types as a side effect of import.
3. Discover and import every `*.py` in `~/.csak/tools/` in alphabetical order. Each plugin file may register types and tools.
4. Run validation (see Type registry validation above).
5. Build the routing graph from the now-complete registry.
6. Execute the collect run.

Plugins live alongside built-ins in the runtime registry — there is no second-class plugin path. `csak tools list` shows both with a column indicating origin.

**Why `~/.csak/tools/` and not a standard Python entry-point mechanism.** Entry points require the plugin to be a pip-installed package, which is overhead for the "drop a file in" use case. A flat directory of Python files matches how analysts will actually write and try plugins — clone a gist, copy from a tutorial, edit a built-in to make a variant. Pip-installable plugins remain possible (the analyst installs the package and then either symlinks or copies the file into `~/.csak/tools/`), but they're not required.

**Plugin loading errors.** A plugin file that fails to import (syntax error, missing dependency) is reported by `csak doctor` and skipped at collect time; the run continues with the remaining tools. The analyst sees which plugin failed and why. This is gentler than refusing to run — one broken plugin shouldn't take CSAK down.

### Plugin trust posture

**Plugins run as full Python with the analyst's user permissions.** No sandbox, no capability declarations, no signature verification. CSAK does not protect the analyst from a malicious or buggy plugin; running a plugin is no different from running any other Python script the analyst chose to run.

`csak tools list` shows the source of every loaded plugin (path on disk) so the analyst can audit what's loaded. `csak tools show <name>` shows the plugin file path and loaded module info.

This posture is documented explicitly in the slice 3 deferred-features review: sandboxing is a later-slice question if/when third-party plugin distribution becomes common, or if a real incident or near-miss surfaces. See [[synthesis/deferred-features|deferred features]].

## `csak tools` — catalog introspection

Slice 3 adds a top-level `csak tools` command for inspecting the catalog. Two subcommands:

### `csak tools list`

```
$ csak tools list

Built-in tools:
  subfinder    domain → subdomain
  httpx        host, url → live_host
  nuclei       host, url → finding_ref, url

Plugin tools (~/.csak/tools/):
  asnmap       asn → network_block            ~/.csak/tools/asnmap.py
  testssl      service → finding_ref          ~/.csak/tools/testssl.py

Run 'csak tools show <name>' for catalog details.
```

Columns: name, accepts → produces, source path (plugins only). Sorting: built-ins first by name, then plugins by name.

### `csak tools show <tool-name>`

```
$ csak tools show httpx

httpx  (built-in)
  binary:           httpx
  minimum version:  1.4.0
  install:          go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
  source:           csak/collect/tools/httpx.py

  Accepts:
    host    (matches: domain, subdomain, ip)

  Produces:
    live_host    (with metadata: status, tech, title)

  Modes:
    quick     -silent -no-color -mc 200,301,302,403
    standard  -silent -no-color -tech-detect -title -status-code
    deep      -silent -no-color -tech-detect -title -status-code -follow-redirects -tls-grab

  Rate limiting:
    starting rate:  150 req/s
    floor:          1 req/s
    ceiling:        150 req/s

  Recursion graph (when --recurse):
    upstream (tools that produce types httpx accepts):
      subfinder  (produces: subdomain → host via subtype)
      asnmap     (produces: network_block; expanded to hosts)
    downstream (tools that accept types httpx produces):
      nuclei     (accepts: host, url)
      testssl    (accepts: service; not directly downstream from httpx unless service extracted)
```

Note on httpx and `url`: httpx does not accept `url` as a target type, mirroring the slice 2 routing decision. A URL is already a known live endpoint, so feeding it to httpx for liveness probing is redundant — the slice 2 router emits "URL is already a known endpoint; httpx step skipped" for url-typed targets. Slice 3 inherits this: `httpx.accepts = ["host"]` and url-typed candidates from the recursion frontier go straight to nuclei without a httpx hop.

The recursion graph section is computed at runtime from the full registered toolbox. A new plugin appears in the graph the moment it's loaded, with no edits to httpx's catalog file.

### Why these commands

- **Discovery.** An analyst who installed three plugins last week wants to remember what they do without `cat ~/.csak/tools/*.py`.
- **Auditing.** Before running `csak collect --recurse`, the analyst can see the recursion graph and predict roughly what'll happen.
- **Plugin debugging.** A plugin that registers correctly but doesn't appear in the recursion graph the analyst expected is a sign that `accepts`/`produces` declarations don't match the upstream tools.

Both commands are pure read of the runtime registry — no side effects, no network, no subprocess. Cheap to run; useful as an interactive tool.

## Live output — depth-aware

Slice 3 extends the slice 2 output format. Slice 2's phases (detection, per-stage progress, per-tool completion, final summary) all stay; slice 3 adds **depth headers**, **frontier counts**, and **prompt-to-continue**.

### Phase 1 — Detection (extended)

```
[csak] Identified target acmecorp.com as type=domain
[csak] Recursion: enabled, max-depth=3, dedup=on
[csak] Assigned tools: subfinder, httpx, nuclei  (mode=standard)
[csak] Skipped: (none)
```

Three new pieces vs slice 2: the recursion line announcing whether `--recurse` is on, the max-depth value, and whether dedup is active (always `on` in slice 3 — listed for clarity, not as a toggle).

### Phase 2 — Per-depth execution

Each depth gets a header:

```
[csak] Depth 0 (root) - 1 candidate
   [subfinder]  ✓ done   elapsed=12s   produced=87 subdomains    → artifacts/ab/abc123/subdomains.jsonl
   [httpx]      ✓ done   elapsed=78s   produced=34 live_hosts    → artifacts/cd/cde456/live-hosts.jsonl
   [nuclei]     ✓ done   elapsed=4m23s findings=12, produced=3 urls  → artifacts/ef/ef789/findings.jsonl

[csak] Depth 0 complete. Frontier: 124 typed targets extracted, 41 queued for depth 1 (83 deduped/dropped)
[csak] Depth 1 (depth budget remaining: 2)
   [httpx]      ⠴ running 3/3 urls...   elapsed=8s
   [nuclei]     ⠦ running 38/41 hosts... elapsed=1m15s findings=4 so far
```

The slice 2 per-tool progress line shape (✓/✗/elapsed/eta/counts/artifact path) is unchanged. Added: each completed tool's `produced=N typed_outputs` count, and a per-depth summary line showing frontier extraction → dedup → queue.

### Phase 3 — Prompt-to-continue

When depth `N-1` finishes and the dedup-frontier is non-empty:

```
[csak] Depth 2 complete. Frontier: 78 typed targets extracted, 19 queued for depth 3 (59 deduped/dropped)
[csak] Depth budget hit (max-depth=3). Frontier remaining: 19 unscanned candidates.
[csak] Continue with another 3 depths? [Y/n]: 
```

If the user presses Enter or `y`: max-depth bumps to `6`, recursion continues, prompt repeats at depth 6. If `n`: clean exit; final summary includes the 19 unscanned candidates.

In `--yes` non-interactive mode: prompt skipped; recursion continues without bound (capped only at `--max-depth 0` if explicitly set; otherwise extends without limit).

### Phase 4 — Final summary (extended)

```
[csak] Collect complete for acmecorp.com (mode=standard, recurse=on, max-depth=3)
[csak] Total elapsed: 14m07s
[csak] Depths run: 3 (depth 0, 1, 2)
[csak] Scans created: 11 across 3 tools (subfinder x1, httpx x4, nuclei x6)
[csak] Findings: 27 new, 0 re-occurrences across all depths
[csak] Frontier remaining: 19 candidates not scanned (depth limit hit, user declined to continue)
[csak] Artifacts: 11 → /home/eli/.csak/artifacts/
[csak] Run `csak findings list --org acmecorp` to review
```

Three new lines: depths run, scan count broken down per tool with multiplicity, frontier remaining (only printed when non-zero).

### What the format protects against

- **Lost recursion structure.** The depth headers make the recursion shape visible. An analyst who ran `--recurse` and got 27 findings can see whether they came from one explosive depth or evenly distributed across 3.
- **Silent dedup truncation.** The "X queued, Y deduped/dropped" count makes the dedup behavior visible. If an analyst expects 100 candidates and sees "queued for depth 1: 4 (96 deduped/dropped)," that's diagnostic — either dedup is too aggressive or upstream tools are emitting overlapping outputs.
- **Surprise depth-budget hits.** The prompt-to-continue is the analyst's chance to confirm or back out. Silent truncation at depth 3 with 50 unscanned candidates would be misleading.

## Data model additions

Slice 3 adds three columns to the `Scan` table:

```
Scan
  ... (existing columns from slice 1)
+ parent_scan_id          UUID, nullable, FK → Scan
+ depth                   int, default 0
+ triggered_by_finding_id UUID, nullable, FK → Finding
```

### `parent_scan_id`

Points at the Scan whose output triggered this Scan's invocation, when the Scan was generated by recursion. `NULL` for root scans (depth 0) and for non-recursive `csak collect` invocations.

### `depth`

The recursion depth at which this Scan ran. `0` for root scans (the initial pass against the analyst's target). `1+` for recursion-triggered scans.

### `triggered_by_finding_id`

When a Scan was triggered by a specific Finding's content (e.g. nuclei produced a Finding whose `matched-at` URL became an httpx target at depth 2), this column records which Finding caused the spawn. `NULL` when the trigger was not a specific Finding (e.g. subfinder's bulk subdomain output where the recursion fanout is N typed targets, not one finding). The `parent_scan_id` is always set when this is set; the converse isn't true.

### Migration

The slice 3 schema change is additive — three nullable columns. Existing slice 1/slice 2 data is unaffected; old Scan rows have `NULL` for `parent_scan_id` and `triggered_by_finding_id` and `0` for `depth`. The migration runs at first slice 3 startup and is idempotent.

### Why not a separate `ScanLineage` junction

Considered — a junction table `ScanLineage(parent_scan_id, child_scan_id, triggered_by_finding_id)` would let one Scan have multiple parents (which can happen if structural dedup is loosened in the future, or if multiple findings could plausibly have triggered the same recursion candidate). Rejected for slice 3 because:

- **Single parent is correct now.** With strict structural dedup of `(tool, target, mode)`, a child Scan has exactly one parent — the first parent that queued it. Subsequent matches are dedup-dropped.
- **Three columns are queryable directly.** Reporting "show me the Scans triggered by this Finding" is a `WHERE triggered_by_finding_id = X` query, not a join. Same for "show me the Scans descended from this root" via recursive CTE on `parent_scan_id`.
- **Junction is a one-way migration.** If we ever need multiple parents, adding the junction is straightforward (the existing columns become the first row in the junction table). Going the other direction is harder.

### How reports surface lineage

The slice 1 report context already exposes Scans per Finding via `FindingScanOccurrence`. Slice 3 adds an optional "scan lineage" section in the Internal Review report showing the parent/depth structure for findings that came from recursive scans. Implementation: the report context builder follows `parent_scan_id` for each Scan in the report; renderers display the chain ("subfinder (depth 0) → httpx (depth 1) → nuclei (depth 2)"). Fix-it tickets don't show lineage — clients don't need it. JSON export includes the full lineage tree because LLM and downstream consumers can use it.

## Interface

### `csak collect` — extended

```
csak collect --org <org> --target <target> [--mode <mode>] [tool overrides] [--timeout-* <sec>]
             [--no-adaptive-rate] [--verbose] [--quiet] [--yes]
             [--recurse] [--max-depth <N>]
```

New flags:

- `--recurse` — opt-in recursion. Without this flag, behavior is identical to slice 2.
- `--max-depth <N>` — recursion depth ceiling. Default `3`. `0` = infinite. `1` = no recursion (equivalent to omitting `--recurse`). Ignored when `--recurse` is not set.

Examples:

```
csak collect --org acmecorp --target acmecorp.com --recurse
csak collect --org acmecorp --target acmecorp.com --recurse --max-depth 5
csak collect --org acmecorp --target acmecorp.com --recurse --max-depth 0   # infinite
csak collect --org acmecorp --target acmecorp.com --recurse --yes           # auto-continue prompts
```

### `csak tools` — new command group

```
csak tools list
csak tools show <tool-name>
```

See §`csak tools` above.

### `csak doctor` — extended

The slice 2 `csak doctor` already checks built-in tool binaries. Slice 3 adds:

- Plugin discovery validation (importable, registers correctly, no type collisions, no parent cycles, all references resolve).
- Plugin binary checks for any binary the plugin declares it depends on.
- Recursion graph validation (no orphan tools that produce types nothing accepts — these are warnings, not errors; an analyst may have a tool that produces outputs they intend to consume manually).

```
$ csak doctor
Checking external tool dependencies...
  ✓ subfinder    v2.6.4 (>= 2.6.0)
  ✓ httpx        v1.4.2 (>= 1.4.0)
  ✓ nuclei       v3.1.8 (>= 3.0.0)

Checking plugin tools (~/.csak/tools/)...
  ✓ asnmap       loaded; binary asnmap v0.0.4 present
  ⚠ testssl      loaded; binary testssl.sh not on PATH

Checking type registry...
  ✓ 7 built-in types, 0 plugin-introduced types
  ✓ no parent cycles
  ✓ all accepts/produces references resolve

Checking recursion graph...
  ✓ no orphan tools

CSAK collect is ready (1 warning: testssl plugin can't run without testssl.sh).
```

### Existing CLI surface unchanged

Every slice 1 and slice 2 command works identically:

```
csak collect --org acmecorp --target acmecorp.com           # slice 2 single-pass behavior
csak findings list --org acmecorp                           # shows findings from all depths
csak findings show <id>                                     # shows scan lineage including recursion chain
csak scan list --org acmecorp                               # recursion-spawned scans appear with depth column
csak report generate --org acmecorp --period today          # reports include all-depth findings
```

Backward compatibility is exact — `csak collect` without `--recurse` is bit-for-bit slice 2 behavior. The slice 3 additions are opt-in.

### Exit codes

Same as slice 2:

- `0` — collect ran end to end, all stages succeeded across all depths.
- Non-zero — one or more hard failures (binary not found, target invalid, type registry validation failure, all stages failed). Partial Artifacts and Findings are persisted.

A new soft case: when the user declines the prompt-to-continue at depth limit, exit code is `0` and the unscanned frontier is reported in the final summary. This is not a failure — it's the analyst making a deliberate choice.

## Storage

No new tables. Three new columns on `Scan` (see Data model additions above). The slice 1 ingest path is unchanged. The slice 2 collect path is unchanged except that the runner now consults the dedup set and threads `parent_scan_id` / `depth` / `triggered_by_finding_id` into the new Scan rows it creates.

## Module changes against current source

The slice 2 codebase is in `src/csak/collect/`. Slice 3's diff against it:

| Current file | Slice 3 change |
|---|---|
| `tool.py` | Extend `Tool` with `accepts: list[str]`, `produces: list[str]`, `extract_outputs(...)`. Keep `applies_to` as a thin wrapper over the subtype matcher for backward compatibility during migration. Existing slice 2 fields (`output_filename`, `rate_limit`, `override_flags`, `is_skipped_by_mode`, `parse_version`) untouched. The `TargetType = Literal["domain", ...]` alias becomes a string — the runtime registry takes over. |
| `detect.py` | Removed. The single `detect_target_type(target) -> str` function is replaced by `classify(value) -> TypedTarget` in the new `types.py`. |
| `router.py` | Replace `tool.applies_to(target_type)` calls with `matches(candidate.type, tool.accepts)` from the new type matcher (subtype widening). The router has the `TypedTarget` in hand from `classify()`, so calling `matches()` directly is the natural path; `applies_to` itself is kept available as a thin wrapper (per §Tool catalog) for external callers like `csak doctor` and any test code that wants to ask the legacy question. Skip-reason strings stay; they're user-facing and the routing outcome is the same for slice 2's flat target types. |
| `pipeline.py` | Add the recursion runner (frontier dedup set, depth loop, prompt-to-continue). Delete `_prepare_input_for_next_stage` and `_extract_field_to_list` — their behavior is now in each tool's `extract_outputs`. Thread `parent_scan_id` / `depth` / `triggered_by_finding_id` into Scan creation. The non-recursive path (no `--recurse`) is bit-for-bit slice 2: `run_collect` is called once at depth 0 and exits. |
| `runner.py` | Unchanged. Per-stage subprocess invocation, rate limiting, progress events stay as-is. |
| `tools/__init__.py` | `ALL_TOOLS` becomes the runtime tool registry consulted by the recursion runner; built-in tools are registered via the same `register_tool()` entry point plugins use. |
| `tools/subfinder.py`, `tools/httpx.py`, `tools/nuclei.py` | Each gains `accepts`, `produces`, and `extract_outputs(...)`. Existing `applies_to`, `invocation`, etc. unchanged. |

New files:

| New file | Responsibility |
|---|---|
| `csak/collect/types/__init__.py` | `TargetType`, `TypedTarget`, the runtime registry, `register_type()`, `classify(value)`, `matches(candidate_type, accepts)`, validation. The `types/` directory is a package mirroring the existing `csak/collect/tools/` layout — not a flat module file. |
| `csak/collect/types/builtin.py` | Registers the seven core types at import (`network_block`, `host`, `domain`, `subdomain`, `url`, `service`, `finding_ref`). Imported by `types/__init__.py` so a single `from csak.collect import types` pulls in the registry plus all built-ins. |
| `csak/collect/recursion.py` | The recursion runner extension — frontier dedup, depth loop, depth-aware progress. Wraps the existing per-stage runner. |
| `csak/collect/plugins.py` | Plugin discovery from `~/.csak/tools/`, fail-soft loading, type/tool registration entry points. |
| `csak/cli/tools.py` | The new `csak tools list` and `csak tools show <tool>` command group. |

Storage: `csak/storage/schema.py` bumps `SCHEMA_VERSION` from 1 to 2 and the `scans` table CREATE statement gains three columns (`parent_scan_id TEXT REFERENCES scans(id)`, `depth INTEGER NOT NULL DEFAULT 0`, `triggered_by_finding_id TEXT REFERENCES findings(id)`). `csak/storage/models.py` adds the matching dataclass fields with `None` / `0` defaults. `csak/storage/repository.py` insert / select helpers carry the new columns through.

## Dependencies

Same external binaries as slice 2 (subfinder, httpx, nuclei, plus Go for installation). No new runtime dependencies for the recursion mechanics — they're pure Python. Plugins may introduce their own binary dependencies; `csak doctor` reports them.

## What slice 3 explicitly does not solve

- **LLM-assisted recursion.** Considered and rejected; slice 3 stays deterministic. The LLM-layer slice may revisit.
- **Async / background `csak collect` runs.** Sync-only, same as slice 2. Long recursive runs block the terminal; live output makes them tolerable.
- **Wall-clock / cost / token budgets.** Structural dedup terminates naturally; depth is the brake.
- **New built-in tools.** The catalog stays at three (subfinder, httpx, nuclei), now recursion-aware. Adding tools is the analyst's job via plugins, or a slice 3.x effort.
- **Plugin sandboxing or isolation.** Plugins run as full Python under the analyst's permissions.
- **Cross-invocation persistent dedup.** Each `csak collect` is a fresh recursion.
- **Plugin distribution / marketplace.** `~/.csak/tools/` is a directory; analysts manage it.
- **Recursion config file.** No per-tool recursion-rule YAML. The graph comes from `accepts`/`produces` declarations.
- **Zeek and osquery recursion.** Stay ingest-only as in slices 1 and 2.
- **Nessus API orchestration.** Slice 2.5 or later, unchanged from slice 2.
- **Web UI, ticketing integration, multi-user, scheduling.** Same as slices 1 and 2.

## Exit criteria

Slice 3 is "done" when:

- `csak collect --recurse --target acmecorp.com` runs against a real target, recurses through subfinder → httpx → nuclei plus any depth-1+ outputs feeding back through the appropriate tools, and produces Findings indistinguishable from slice 2's single-pass output except that there are more of them.
- `--max-depth N` correctly bounds depth; default of `3` produces useful output for realistic targets; `0` means infinite; `1` is equivalent to omitting `--recurse`.
- Prompt-to-continue fires at depth limit when the frontier is non-empty, with `Y` (default) extending and `n` ending cleanly. `--yes` bypasses the prompt and continues without bound.
- Within-invocation structural dedup of `(tool, target, mode)` prevents redundant scans within a single recursion run. Verifiable by running `csak collect --recurse --target` against a target with cyclic discovery (e.g. nuclei finding a URL on a subdomain that subfinder already processed) and observing the dedup count in the live output.
- Type registry registers built-in types at startup, registers plugin-introduced types when plugins are present, and rejects collisions / cycles / unresolved references with clear errors pointing at the offending file.
- `classify(value)` correctly identifies all six core types from realistic inputs and returns the most-specific match for ambiguous strings (e.g. `"api.acmecorp.com"` returns `subdomain`, not `host`).
- Subtype widening in the matcher works: a tool declaring `accepts: [host]` runs against a `TypedTarget(type="domain")` candidate.
- `Tool.extract_outputs` is implemented for subfinder, httpx, and nuclei; their outputs flow into the recursion frontier; the metadata dict on `TypedTarget` is populated where the tool has it (httpx attaches status/tech/title).
- A plugin file dropped in `~/.csak/tools/` is discovered at startup, registers its tool (and any new types) into the same toolbox as built-ins, and participates in routing identically. Tested with at least one real plugin (a small `nmap` or `dig` wrapper would suffice for verification).
- `csak tools list` and `csak tools show <tool>` produce the documented output. The recursion graph in `tools show` reflects the live registry, including any loaded plugins.
- `csak doctor` validates the type registry and the plugin set with clear pass/warn/fail output. Failures are blocking; warnings (e.g. unbound binary) are advisory.
- Live output during `csak collect --recurse` shows depth headers, per-stage progress, frontier counts (queued / deduped / dropped), prompt-to-continue at depth limit, and a final summary with depths run and frontier-remaining count.
- Data model migration (three nullable columns on `Scan`) runs cleanly on an existing slice 1/slice 2 database. Old rows have `parent_scan_id = NULL`, `depth = 0`, `triggered_by_finding_id = NULL`; new recursion-triggered rows have the columns populated.
- `csak findings show <id>` includes scan lineage when the finding was produced by a recursion-spawned scan. Internal Review reports include an optional lineage section. Fix-it tickets don't surface lineage. JSON export includes the full lineage tree.
- Slice 1 surface (`findings list/show/update`, `target list/update`, `scan list`, `report generate`) works identically against recursion-produced data. Slice 2 surface (`csak collect` without `--recurse`, `csak doctor`) is bit-for-bit unchanged.
- At least one analyst (Eli) has used `csak collect --recurse` on a real client target and not hated it.

## Related

- [[specs/slice-1|Slice 1 — Ingest & Report]]
- [[specs/slice-2|Slice 2 — Tool Orchestration]]
- [[architecture/overview|Architecture Overview]]
- [[product/slices|Slice Plan]]
- [[product/scope|Scope]]
- [[product/glossary|Glossary]]
- [[synthesis/open-questions|Open Questions]]
- [[synthesis/deferred-features|Deferred Features — Review Backlog]]
- [[competitive/reconftw|reconFTW]] (recursion case study; reconFTW is what we deliberately don't look like)
- [[competitive/build-vs-adapt|Build vs Adapt]]
