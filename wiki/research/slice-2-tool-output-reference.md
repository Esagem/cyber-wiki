---
title: "Tool Output Reference — Slice 2 Catalog"
category: research
tags: [slice-2, collect, subfinder, httpx, nuclei, reference]
status: active
confidence: high
owner: shared
created: 2026-04-24
updated: 2026-04-24
sources:
  - "https://docs.projectdiscovery.io/tools/subfinder/usage"
  - "https://docs.projectdiscovery.io/opensource/subfinder/running"
  - "https://github.com/projectdiscovery/subfinder"
  - "https://docs.projectdiscovery.io/opensource/httpx/usage"
  - "https://github.com/projectdiscovery/httpx"
  - "https://github.com/projectdiscovery/nuclei"
  - "https://kb.offsec.nl/tools/framework/projectdiscovery/nuclei/"
  - "https://github.com/projectdiscovery/nuclei/issues/2375"
  - "https://github.com/orgs/projectdiscovery/discussions/2005"
---

# Tool Output Reference — Slice 2 Catalog

> Reference for slice 2 implementation. Documents the exact CLI flags, output formats, and stderr patterns for the three tools CSAK orchestrates. Compiled from official ProjectDiscovery documentation and verified GitHub issues. Read this before writing the catalog modules in `csak/collect/tools/<tool>.py`.
>
> **Why this page exists.** The slice 2 spec defines the catalog interface (`Tool` class with `applies_to`, `invocation`, `parse_progress`, `detect_rate_limit_signal`). The actual flag names and stderr patterns can't live in the spec — they're tool-specific implementation details. They could be discovered during build by running each tool, but that would risk missing important edge cases (e.g. nuclei's actual rate-limit signal isn't what you'd guess). Better to research them up front.

## Subfinder

**Binary:** `subfinder`. Installed via `go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest`. Current major version is v2.

**Version check:** `subfinder -version`. Output goes to stderr in the format `Current Version: v2.6.4`. Note: in older versions the version is part of the banner (the ASCII art block on stderr at startup), not a separate `-version` flag — modern versions support both.

### Useful flags (verified from docs)

| Flag | Purpose | Notes |
|------|---------|-------|
| `-d <domain>` | Single domain to enumerate | The standard input form for slice 2 |
| `-dL <file>` | List of domains | Not used in slice 2 (single target per collect run) |
| `-all` | Use all sources (slow but comprehensive) | Use for `standard` and `deep` modes |
| `-recursive` | Only sources that handle subdomains recursively | Don't use — narrows results |
| `-silent` | Output subdomains only, no banner/progress | **Critical:** without this we get banner noise |
| `-oJ` / `-json` | JSONL output | Required for structured ingest |
| `-o <file>` | Output file | Use this; don't rely on stdout capture |
| `-nW` | DNS-resolve subdomains, drop unresolved | **Required for JSON output to populate IP field**, per the official guide |
| `-rl <int>` | Max HTTP requests per second (global) | The rate-limit knob the adaptive limiter adjusts |
| `-rls "src1=N/s,src2=N/s"` | Per-source rate limits | Slice 2 doesn't use this |
| `-t <int>` | Concurrent goroutines for resolving (with `-active`) | Default 10; leave alone |
| `-duc` | Disable automatic update check | **Always pass this in CSAK** — we don't want subfinder phoning home mid-run |

### Mode-specific recipes (slice 2)

```python
# csak/collect/tools/subfinder.py
INVOCATIONS = {
    "quick": [
        "-silent", "-oJ", "-nW", "-duc",
        # passive sources only — subfinder's default behavior; no -all
        # source: reconFTW v4.0 modules/subdomains.sh (passive recipe)
    ],
    "standard": [
        "-silent", "-oJ", "-nW", "-duc", "-all",
        # source: reconFTW v4.0 modules/subdomains.sh (full passive recipe)
    ],
    "deep": [
        "-silent", "-oJ", "-nW", "-duc", "-all", "-recursive",
        # recursive enables sources that recurse on found subdomains
    ],
}
```

Plus `-d <target>` and `-o <output_file>` injected at runtime.

### Output format

JSONL — one JSON object per line. Verified shape from official docs:

```json
{"host":"www.hackerone.com","ip":"104.16.99.52"}
{"host":"mta-sts.hackerone.com","ip":"185.199.108.153"}
```

Fields:
- `host` — the discovered subdomain.
- `ip` — resolved IP, populated only when `-nW` is passed.
- `source` — (in newer versions) which passive source found it. Optional. CSAK can ignore.

The slice 1 probe parser already handles this format. No new parser work for slice 2 — just verify the existing parser handles `-nW`'s populated `ip` field gracefully.

### Stderr patterns

With `-silent`, stderr is mostly empty. Without `-silent`, the banner ASCII art appears, then `[INF]`-prefixed lines. CSAK uses `-silent` always, so we don't have rich stderr to parse.

**Progress detection:** subfinder doesn't expose a progress percentage. The catalog module's `parse_progress` returns `None` always; the runner falls back to "found N subdomains so far" by counting JSONL lines as they're written.

**Rate-limit detection:** subfinder's API-backed sources can hit per-source rate limits, but subfinder generally just slows down or drops a source rather than emitting a structured warning. The catalog's `detect_rate_limit_signal` returns `False` for subfinder — adaptive rate limiting is functionally a no-op for this tool. The `-rl` flag still gets honored, just nothing to react to.

### Gotchas (verified)

- **API keys.** Many passive sources (Binaryedge, C99, Censys, Chaos, GitHub, Shodan, etc.) require API keys. Without them those sources are silently skipped — subfinder exits cleanly but with fewer results. Keys live in `$HOME/.config/subfinder/provider-config.yaml`. **Slice 2 does not manage these.** The analyst is responsible for setting them up if they want maximum coverage. `csak doctor` could report on which keys are configured in a future revision; out of scope for slice 2.
- **First-run config file creation.** First subfinder invocation creates `$HOME/.config/subfinder/provider-config.yaml` (and a few other files) automatically. Harmless side effect; mention in CSAK docs.
- **`-nW` is mandatory for JSON.** Without `-nW`, the JSON output drops the `ip` field. The slice 1 probe parser tolerates this, but we lose data. Always pass `-nW`.

## httpx

**Binary:** `httpx`. Installed via `go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest`. Note: there is also a Python `httpx` library — the Go binary and the Python library are different things. CSAK depends on the Go binary.

**Version check:** `httpx -version`. Format: `Current Version: v1.6.7`.

### Useful flags (verified from docs)

| Flag | Purpose | Notes |
|------|---------|-------|
| `-l <file>` | Input file with hosts/URLs/CIDR | Slice 2 always uses this |
| `-u <target>` | Single target | Alternative to `-l` |
| `-j` / `-json` | JSON output | Required for structured ingest |
| `-o <file>` | Output file | Use this |
| `-sc` | Display status code | We want this |
| `-cl` | Content length | We want this |
| `-ct` | Content type | We want this |
| `-title` | Page title | We want this |
| `-server` / `-web-server` | Server header | We want this |
| `-td` / `-tech-detect` | Technology detection (wappalyzer) | We want this in `standard` and `deep` |
| `-ip` | Show IP | Useful |
| `-cname` | Show CNAME | Useful |
| `-silent` | Suppress banner and progress | **Critical** — same as subfinder |
| `-nc` / `-no-color` | Strip ANSI color codes | **Always pass this in CSAK** for clean parsing |
| `-stats` | Periodic stats to stderr | **Use this for progress reporting** |
| `-si <sec>` / `-stats-interval` | Stats interval, default 5 | Tune if 5s is too noisy or slow |
| `-rl <int>` / `-rate-limit` | Requests per second, default 150 | The rate-limit knob |
| `-rlm <int>` / `-rate-limit-minute` | Requests per minute | Alternative; use `-rl` |
| `-t <int>` / `-threads` | Threads, default 50 | Leave default |
| `-timeout <sec>` | Per-request timeout, default 10 | Leave default |
| `-retries <int>` | Retries, default depends on version | Leave default |
| `-maxhr <int>` / `-max-host-error` | Max errors per host before skipping, default 30 | Useful for tightening with `-maxhr 3` |
| `-fr` / `-follow-redirects` | Follow redirects | **Off by default in CSAK** — redirects can lead off-target; let nuclei see the redirect itself |
| `-fc <codes>` / `-filter-code` | Drop responses with these codes | Useful for `-fc 404,403` to reduce noise |
| `-fep` / `-filter-error-page` | ML-based error-page filter | Useful in `deep` mode |
| `-duc` | Disable update check | **Always pass this in CSAK** |

### Mode-specific recipes (slice 2)

```python
# csak/collect/tools/httpx.py
INVOCATIONS = {
    "quick": [
        "-silent", "-nc", "-j", "-duc", "-stats", "-si", "5",
        "-sc", "-title", "-server", "-ip",
        # source: reconFTW v4.0 modules/web.sh (lightweight probe recipe)
    ],
    "standard": [
        "-silent", "-nc", "-j", "-duc", "-stats", "-si", "5",
        "-sc", "-cl", "-ct", "-title", "-server", "-td", "-ip", "-cname",
        # source: reconFTW v4.0 modules/web.sh (default probe recipe)
    ],
    "deep": [
        "-silent", "-nc", "-j", "-duc", "-stats", "-si", "5",
        "-sc", "-cl", "-ct", "-title", "-server", "-td", "-ip", "-cname",
        "-favicon", "-jarm", "-tls-grab", "-fep",
        # source: reconFTW v4.0 modules/web.sh (deep probe recipe)
    ],
}
```

Plus `-l <input_file>` and `-o <output_file>` injected at runtime.

### Output format

JSONL — one JSON object per probed host/URL. Fields are gated by which probe flags were passed; the spec lists ~50 possible fields. Examples of what `standard` mode produces:

```json
{
  "url": "https://api.acmecorp.com",
  "host": "api.acmecorp.com",
  "input": "api.acmecorp.com",
  "scheme": "https",
  "port": "443",
  "status_code": 200,
  "content_length": 4521,
  "content_type": "application/json",
  "title": "Acme API v2",
  "webserver": "cloudflare",
  "tech": ["Cloudflare", "Express"],
  "ip": "104.21.42.18",
  "cname": ["api-prod.acmecorp.com"],
  "timestamp": "2026-04-24T08:30:22.123Z"
}
```

The slice 1 probe parser handles this. Verify the parser tolerates fields being absent (e.g. `tech` missing when target wasn't a webapp).

### Stderr patterns — for progress

With `-stats -si 5`, httpx prints periodic statistics to stderr. Format (verified from docs and screenshots):

```
[INF] Stats: 234/500 (46%) | RPS: 45 | Errors: 12 | Duration: 5s
```

The catalog's `parse_progress` for httpx parses this line:
- Total requests / completed (`234/500`).
- Percentage (`46%`).
- Requests per second (`45`).
- Error count.
- Elapsed.

This gives us real progress percentages and ETAs for the live output.

### Stderr patterns — for rate-limit detection

httpx logs HTTP errors per host but doesn't have a clean "rate limit hit" signal. The `-maxhr` flag (max-host-error) skips a host after N errors but doesn't reduce the global rate. **The honest signal is the error count in `-stats` output rising rapidly** — if errors jump from 12 to 45 between stats intervals, something is rate-limiting us.

The catalog's `detect_rate_limit_signal` for httpx watches:
1. `Stats:` lines where `Errors:` count rises by more than ~10 in one interval.
2. Lines containing `429` or `503` if any leak through despite `-silent` (they sometimes do in newer versions).

This is heuristic, not exact. Acceptable — false positives just slow the scan, false negatives are caught by the next interval.

### Gotchas

- **`-stats` flag silently failed in some older versions** (pre-1.4.0) when combined with `-json`. CSAK requires httpx ≥ 1.4.0 to avoid this.
- **`-fr` / follow-redirects can lead off-target.** Don't enable in slice 2; nuclei should follow them itself.
- **PDCP cloud upload is opt-in via `-pd`** — never pass this in CSAK (we don't want to silently upload analyst data to ProjectDiscovery's cloud).
- **First-run cloud auth check.** Recent httpx versions try to authenticate to ProjectDiscovery's cloud at startup if a credentials file exists. Pass `-duc` and don't run `httpx -auth`; CSAK's invocations stay local.

## Nuclei

**Binary:** `nuclei`. Installed via `go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest`. Major version is v3 (slice 2 minimum).

**Version check:** `nuclei -version`. Format: `Current Version: v3.1.8`.

### Useful flags (verified from docs)

| Flag | Purpose | Notes |
|------|---------|-------|
| `-l <file>` | Input list of targets | Slice 2 always uses this |
| `-u <target>` | Single target | Alternative; used for URL-mode collect |
| `-t <path>` | Templates path or comma-separated list | Override slot for `--nuclei-templates` |
| `-tags <tags>` | Run only templates with these tags | Useful for narrowing |
| `-severity <levels>` | Filter by severity (`info`, `low`, `medium`, `high`, `critical`) | Mode-controlled |
| `-jsonl` / `-j` | JSONL output | Required for ingest |
| `-o <file>` | Output file | Use this |
| `-irr` / `-include-rr` | Include request/response in JSON output | Useful in `deep` mode |
| `-silent` | Findings only, no banner/progress | **Use this** |
| `-nc` / `-no-color` | Strip ANSI | **Always pass** |
| `-stats` | Show stats to stderr | **Use this** for progress |
| `-sj` / `-stats-json` | Stats in JSONL format to stdout | Cleaner for parsing; consider over `-stats` |
| `-si <sec>` | Stats interval, default 5 | Default is fine |
| `-rl <int>` / `-rate-limit` | Global requests/second across all templates | **The rate-limit knob the adaptive limiter adjusts.** Default is high. |
| `-rlm <int>` / `-rate-limit-minute` | Per-minute limit alternative | Use `-rl` |
| `-c <int>` / `-concurrency` | Templates in parallel, default 25 | Tune for `quick` vs `deep` |
| `-bs <int>` / `-bulk-size` | Hosts per template in parallel, default 25 | Tune for `quick` vs `deep` |
| `-timeout <sec>` | Per-request timeout, default 5 | Default fine |
| `-retries <int>` | Retries, default 1 | Default fine |
| `-eh <hosts>` / `-exclude-hosts` | Skip these hosts | Useful |
| `-duc` | Disable update check | **Always pass** |
| `-disable-update-check-templates` (older) / template auto-update is on by default | Templates auto-update first run | See gotchas |
| `-au` / `-automatic-scan` | Wappalyzer-driven template selection | Interesting for slice 3 (smarter recipes); not slice 2 |

### Mode-specific recipes (slice 2)

```python
# csak/collect/tools/nuclei.py
INVOCATIONS = {
    "quick": None,  # nuclei skipped entirely in quick mode per spec

    "standard": [
        "-silent", "-nc", "-jsonl", "-duc", "-stats", "-si", "5",
        "-severity", "low,medium,high,critical",
        "-rl", "150",       # ProjectDiscovery default; adaptive limiter scales this
        "-c", "25",
        "-bs", "25",
        # source: reconFTW v4.0 modules/vulns.sh (default scan recipe)
    ],
    "deep": [
        "-silent", "-nc", "-jsonl", "-duc", "-stats", "-si", "5",
        "-severity", "info,low,medium,high,critical",
        "-irr",             # include req/resp for forensics
        "-rl", "150",
        "-c", "50",
        "-bs", "25",
        "-tags", "cve,oast,exposure,misconfiguration,tech",
        # source: reconFTW v4.0 modules/vulns.sh (deep scan recipe)
    ],
}
```

Plus `-l <input_file>` and `-o <output_file>` injected at runtime. The `-t <override>` is appended when `--nuclei-templates` override is passed.

### Output format

JSONL — one JSON object per finding. Verified shape from official docs:

```json
{
  "template-id": "CVE-2021-44228",
  "template-path": "http/cves/2021/CVE-2021-44228.yaml",
  "info": {
    "name": "Apache Log4j2 RCE",
    "author": ["pdteam"],
    "tags": ["cve", "cve2021", "rce", "log4j"],
    "severity": "critical",
    "description": "...",
    "reference": ["https://..."],
    "classification": {
      "cve-id": ["cve-2021-44228"],
      "cvss-score": 10.0,
      "cwe-id": ["cwe-77"]
    }
  },
  "type": "http",
  "host": "https://api.acmecorp.com",
  "matched-at": "https://api.acmecorp.com/path",
  "extracted-results": ["..."],
  "request": "...",
  "response": "...",
  "timestamp": "2026-04-24T08:35:11.123Z",
  "matcher-status": true,
  "matched-line": "..."
}
```

The slice 1 nuclei parser handles this format. Slice 2 needs no new parser work for nuclei findings — only the runner-side stderr handling is new.

### Stderr patterns — for progress

With `-stats -si 5`, nuclei prints periodic stats to stderr. Format (verified from real run output):

```
[INF] Templates loaded for current scan: 7324
[INF] Targets loaded for current scan: 87
[INF] Stats: requests=1234, errors=23, RPS=45, percent=15
```

(Exact format varies by version; the `Stats:` prefix and key=value pairs are stable.)

For cleaner parsing, use `-sj` (stats-json) instead, which writes JSONL stats to stdout in a structured format. Tradeoff: `-sj` mixes findings and stats in stdout, requiring the catalog parser to demultiplex by JSON shape (findings have `template-id`, stats have `requests`).

**Recommendation: stick with `-stats` (stderr text)** because it keeps the data path clean — findings on stdout, telemetry on stderr.

### Stderr patterns — for rate-limit detection

**This is the gotcha.** Nuclei does not emit a clean "429 detected, rate-limited by target" message. From a verified GitHub issue: when nuclei hits target rate limits, the output is typically:

```
[WRN] [<template-id>] Could not execute request for : context deadline exceeded
```

or

```
[WRN] [<template-id>] no port specified, defaulting to 80/443
[ERR] Could not run nuclei: ...
```

The honest signal is **a sustained rise in `[WRN]` lines containing "context deadline exceeded" or "connection refused"**, not a structured 429 string. Nuclei's stderr also doesn't generally surface the underlying HTTP status code.

The catalog's `detect_rate_limit_signal` for nuclei watches:
1. `[WRN]` lines containing `context deadline exceeded`.
2. `[WRN]` lines containing `connection refused` or `connection reset`.
3. `Stats:` lines where `errors` count rises by more than ~20 between intervals.

When 3+ such signals appear within a ~30s window, the runner halves the `-rl` value and re-invokes (or, ideally, sends SIGUSR1 if nuclei supports runtime rate adjustment — verify in build).

**This is heuristic.** False positives mean the scan slows down unnecessarily. False negatives mean we miss the rate limit and the scan produces partial results. The 30-second window threshold is tunable.

### Gotchas (verified)

- **First-run template download.** Nuclei auto-downloads ~10,000 templates from `github.com/projectdiscovery/nuclei-templates` on first invocation. Takes 30-90 seconds and ~150MB of disk. **Pre-warm in `csak doctor`** to avoid the cold-start surprise on first `csak collect`. Doctor invocation: `nuclei -ut -duc -silent`.
- **Templates auto-update on every run** unless `-duc` is passed. Always pass `-duc` so we control when templates change.
- **Scan results upload to PDCP cloud is opt-in via `-pd` / `-dashboard`.** Never pass this in CSAK.
- **The `-jsonl` flag was added in v2.x; older versions used `-json`** which produced a single JSON array (not JSONL). Slice 2 requires nuclei v3, so `-jsonl` is safe.
- **Honeypot detection (`-hpd`) was added in recent versions.** Could be useful in `deep` mode but adds latency. Defer.
- **Memory profiling and pprof flags exist but are debug-only.** Don't ship in CSAK invocations.

## `csak doctor` install commands (consolidated)

For the doctor CLI's auto-install path:

```python
INSTALL_COMMANDS = {
    "subfinder": "go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest",
    "httpx":     "go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest",
    "nuclei":    "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
}

# Plus a one-time post-install for nuclei:
NUCLEI_FIRST_RUN = "nuclei -ut -duc -silent"  # download templates, no update check
```

Minimum versions for slice 2:

| Tool | Minimum | Reason |
|------|---------|--------|
| subfinder | v2.6.0 | Stable `-oJ` JSONL format |
| httpx | v1.4.0 | `-stats` works correctly with `-json` |
| nuclei | v3.0.0 | `-jsonl` flag, current template format |
| go | 1.21 | Required by all three install commands |

## What this page does NOT cover

- **The Python implementation of the catalog modules.** That's `csak/collect/tools/<tool>.py` — Code's job to write.
- **The runner subprocess wrapper.** Generic, not tool-specific.
- **The progress-reporter terminal renderer.** Generic, not tool-specific.
- **The adaptive rate-limit policy engine** (when to halve, when to ramp back, floor/ceiling defaults). Per-tool details for the *signals* are above; the policy is in `csak/collect/runner.py`.
- **API key management for subfinder.** Out of scope for slice 2.
- **Nessus REST API.** Slice 2.5+.

## Why this page lives in the wiki

This is reference material that Code needs to write the catalog modules correctly. It could live in the repo as a docstring or a comment, but:

1. The wiki is the existing reference layer for CSAK.
2. Multiple Code sessions over time will benefit from re-reading this rather than re-researching.
3. When tool versions change and flag names shift, this page is the single place to update — not scattered across three catalog modules.

When the catalog modules are written, they should reference back here in their module docstrings: `# Tool flags and output format documented at cyber-wiki/research/slice-2-tool-output-reference.md`.

## Related

- [[specs/slice-2|Slice 2 — Tool Orchestration]]
- [[architecture/overview|Architecture Overview]]
- [[competitive/reconftw|reconFTW]] (case study; recipe attribution source)
- [[competitive/build-vs-adapt|Build vs Adapt]]
