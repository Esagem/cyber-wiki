# cyber-wiki

The collaborative design space where a small team works out how to build **CSAK (Cybersecurity Swiss Army Knife)** — a tool that will ingest data from a wide range of security tools, triage what matters, and emit consistent deliverables (internal reviews and external fix-it tickets).

This wiki is **not** CSAK itself. It is where the team thinks out loud together about scope, architecture, specs, decisions, research, and open questions. CSAK — the product being designed here — doesn't exist yet. Phase: **pre-design.**

Maintained collaboratively by the team via a remote MCP server. Built on the [LLM Wiki pattern](./llm-wiki.md).

This repo contains two things:

- **`wiki/`** — the design knowledge base itself. Markdown files, YAML front matter, Obsidian-style wikilinks. Start with [`wiki/CYBER.md`](./wiki/CYBER.md) for the operating schema and [`wiki/_index.md`](./wiki/_index.md) for the master index.
- **`server/`** — a Cloudflare Worker that exposes the wiki to Claude as a remote MCP server. Reads and writes `wiki/` via the GitHub Contents API.

---

## How it works

```
User ──► Claude.ai ──► Custom Connector ──► Cloudflare Worker ──► GitHub repo
```

1. You ask Claude to do something wiki-shaped ("write an ADR for our storage backend decision", "summarize the working session we just had", "research DefectDojo for the competitive folder").
2. Claude calls the MCP server via a custom connector you've added to your Claude account.
3. The Worker reads from or writes to the shared GitHub repo on your behalf.
4. Writes are regular git commits — collaborators see each other's work in real time via `git pull` or on the GitHub web UI.

Both collaborators connect the **same** MCP URL to their **own** Claude accounts. Neither needs Claude Teams/Enterprise — custom connectors work on Pro and Max.

---

## One-time setup

### 1. Create the GitHub repo

Make a repo and push everything from this scaffold into it:

```bash
gh repo create <your-org>/cyber-wiki
git init
git remote add origin git@github.com:<your-org>/cyber-wiki.git
git add .
git commit -m "Initial cyber-wiki scaffold"
git branch -M main
git push -u origin main
```

Then invite any other collaborators with write access (Settings → Collaborators).

### 2. Generate a fine-grained GitHub PAT for the server

The Worker writes to the repo on your behalf, so it needs a PAT scoped exactly to this one repo.

- GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token.
- Resource owner: the GitHub user or organization that owns the repo.
- Repository access: **Only select repositories** → `cyber-wiki`.
- Repository permissions: **Contents: Read and write**. Everything else stays "No access".
- Expiration: pick something memorable for rotation (90 days is a reasonable default).
- Copy the token. You'll paste it in the next step.

### 3. Deploy the Cloudflare Worker

```bash
cd server
npm install
npx wrangler login                                  # one-time
npx wrangler secret put GITHUB_TOKEN                # paste the PAT from step 2
npx wrangler secret put MCP_BEARER_TOKEN            # pick a long random string; share it with every collaborator who needs access
npx wrangler deploy
```

The last command prints the deployed URL, something like:

```
https://cyber-wiki-mcp.<your-cf-account>.workers.dev
```

The MCP endpoint is that URL plus `/mcp`. Verify it's alive:

```bash
curl https://cyber-wiki-mcp.<your-cf-account>.workers.dev/health
```

You should see a JSON response listing the five tools.

### 4. Add the connector to Claude

In `claude.ai`:

- Click **+** in the composer → **Connectors** → **Add custom connector**.
- Name: `cyber-wiki`.
- Remote MCP server URL: `https://cyber-wiki-mcp.<your-cf-account>.workers.dev/mcp`.
- Advanced → Custom headers (or whatever the current UI calls it — Claude lets you set an `Authorization` header on custom connectors). Add:

  ```
  Authorization: Bearer <MCP_BEARER_TOKEN you set in step 3>
  ```

- Save. The connector should now show five tools: `wiki_index`, `wiki_list`, `wiki_read`, `wiki_search`, `wiki_write`.

If your client has no header UI, set `MCP_BEARER_TOKEN` to an empty secret (delete it and redeploy) to run the server public — but that means anyone who finds the URL can read and edit the wiki, so only do this for testing.

### 5. Onboard additional collaborators

Each additional collaborator:

1. Accepts the GitHub repo collaborator invite.
2. Adds the same custom connector in their own Claude account, pointing at the same URL.
3. Uses the same bearer token the server was deployed with. Alternatively, the server can be extended to accept a list of tokens — the simplest path for a small team is a shared secret.

Every collaborator is now talking to the same wiki through their own Claude account.

---

## Browsing the wiki

The wiki is a folder of plain markdown files in the GitHub repo. There are three reasonable ways to read it:

- **On github.com** — zero setup. GitHub renders markdown including wikilinks. Good enough for read-mostly access and multi-device use, but no graph view, no backlinks panel, no live queries over front matter.
- **In Obsidian (recommended)** — clone the repo locally, open the `wiki/` folder as a vault. The scaffold is already Obsidian-compatible: pipe-syntax wikilinks resolve, YAML front matter is readable by Dataview, and the folder structure maps 1:1 to Obsidian categories.
- **In any markdown editor** — VS Code, Typora, Zed. You lose the graph view but everything else works.

### Obsidian setup (recommended)

```bash
git clone git@github.com:<your-org>/cyber-wiki.git ~/vaults/cyber-wiki
```

Open Obsidian → "Open folder as vault" → pick `~/vaults/cyber-wiki/wiki` (the `wiki/` subdirectory, not the repo root — you don't want the `server/` code in your vault).

Recommended plugins:

- **Obsidian Git** (community plugin) — **required** for the two-way sync described in the next section. Pushes your Obsidian edits back to GitHub so Claude can see them.
- **Dataview** (core community plugin) — lets pages query YAML front matter. Useful for generating "all pages with `status: seed`" views, ADR indexes that stay current automatically, etc.

---

## Keeping your local vault in sync (two-way, webhook-style)

The wiki is genuinely two-way: Claude writes through the MCP server (commits land in GitHub) **and** contributors edit in Obsidian (commits should land in GitHub too). Both directions need to propagate quickly and safely.

The design is two decoupled systems, each handling one direction:

- **Outbound (your Obsidian edits → GitHub → Claude)**: the **Obsidian Git** community plugin auto-commits and pushes when you edit a file. Latency: a few seconds.
- **Inbound (Claude's edits → GitHub → your vault)**: a small Python daemon included in `tools/` polls GitHub for new commits and runs `git pull` when they land. Latency: 2–6 seconds.

Concurrent writes (you and Claude editing the same page at the same time) are caught by an optimistic-concurrency check on the server: the MCP server refuses any write where the page has changed since the LLM last read it, and tells Claude to re-read and retry. You'll rarely hit this in practice given your mostly-reading usage pattern, but the protection is there.

### Step 1 — Configure Obsidian Git (outbound)

Install the plugin (Settings → Community plugins → Browse → "Obsidian Git") and open its settings. The settings that matter:

| Setting | Value | Why |
|---------|-------|-----|
| Vault backup interval | `0` (disabled) | We don't want a periodic timer; we want to push on every change. |
| Auto commit-and-sync after file change | **enabled** | This is the key setting. Commits and pushes when you stop typing. |
| Auto commit-and-sync after stopping file edits (seconds) | `5` | Debounce. Fires 5 seconds after your last keystroke on a file. |
| Auto pull interval | `0` (disabled) | The sync daemon handles pulls; don't let two things fight. |
| Disable notifications | **enabled** | Otherwise you'll get a toast on every auto-push. Silent is better. |
| Commit message on auto-sync | `obsidian: {{files}}` or similar | Distinguishes human-authored commits from MCP-authored ones in the log. |
| Pull on startup | **enabled** | Catches up if you were offline. |

Authentication: the plugin uses your existing SSH key or stored HTTPS credentials. If you cloned with `git@github.com:...` and your SSH key is in the agent, it just works. On Windows, install and configure Git Credential Manager first.

Once this is set up, try editing a page in Obsidian. Five seconds after you stop typing, check GitHub's commit history — you should see the commit appear.

### Step 2 — Install the sync daemon (inbound)

1. **Generate a fine-grained GitHub PAT for the daemon.** This one only needs **Metadata: Read-only** on the repo — it never writes. The PAT the Worker uses has broader permissions; keeping the two separate is a defense-in-depth choice.

2. **Run the daemon once, manually, to confirm it works:**

   ```bash
   export CYBER_WIKI_PATH=~/vaults/cyber-wiki
   export GITHUB_TOKEN=<the metadata:read PAT from step 1>
   python3 ~/vaults/cyber-wiki/tools/sync-daemon.py
   ```

   You should see a log line like:

   ```
   cyber-wiki-sync: watching <org>/cyber-wiki@main in /Users/<you>/vaults/cyber-wiki, polling every 3s
   ```

   Ask Claude to write a page to the wiki. Within ~5 seconds you should see the daemon log `remote advanced: abc1234 -> def5678. Pulling.` and your Obsidian vault should auto-refresh the file.

3. **Run it as a background service** so it's always on. Templates are included in `tools/`:

   **macOS (launchd):**

   ```bash
   cp ~/vaults/cyber-wiki/tools/com.cyber-wiki.sync.plist ~/Library/LaunchAgents/
   # edit the file to replace the /REPLACE/... paths and the PAT
   launchctl load ~/Library/LaunchAgents/com.cyber-wiki.sync.plist
   ```

   **Linux (systemd user service):**

   ```bash
   mkdir -p ~/.config/systemd/user
   cp ~/vaults/cyber-wiki/tools/cyber-wiki-sync.service ~/.config/systemd/user/
   # edit the file to replace the /REPLACE/... paths and the PAT
   systemctl --user daemon-reload
   systemctl --user enable --now cyber-wiki-sync.service
   ```

   Both templates are annotated with inline comments covering install, logs, and teardown.

### Tunables

All configuration is via environment variables, read at daemon startup:

| Variable | Default | Purpose |
|----------|---------|---------|
| `CYBER_WIKI_PATH` | (required) | Path to the local clone of the repo |
| `GITHUB_TOKEN` | (required) | Fine-grained PAT with Metadata: Read on the repo |
| `CYBER_WIKI_REPO` | auto-detected | `<owner>/<repo>`; read from `git remote origin` if unset |
| `CYBER_WIKI_BRANCH` | `main` | Branch to track |
| `CYBER_WIKI_POLL_SECONDS` | `3` | Interval between polls |
| `CYBER_WIKI_LOG_LEVEL` | `INFO` | Python logging level |

A 3-second poll interval uses about 1200 requests/hour against a 5000/hour per-PAT rate limit, and most of those return 304 Not Modified, which GitHub doesn't count in a way that matters for this workload. You can drop it to 2 seconds without concern.

### How the daemon handles local commits

The daemon tries `git pull --ff-only` first — this is the fast path, used whenever you haven't made local edits since the last pull. If fast-forward fails because your local branch has commits the remote doesn't (normal when Obsidian Git is auto-pushing your edits in the background), the daemon falls back to `git pull --rebase`. This keeps the two sync systems — Obsidian Git pushing your edits up, the daemon pulling Claude's edits down — from stepping on each other.

If a rebase hits a real conflict (both sides edited the same lines of the same file), the daemon aborts the rebase cleanly and logs a message pointing you at the file. You fix it once in Obsidian, the daemon resumes automatically.

### When sync fails

If the daemon logs a failure, it's almost always one of these:

- **Dirty working tree.** You have uncommitted local edits and Obsidian Git hasn't auto-committed them yet. The daemon refuses to rebase on top of a dirty tree. Fix: wait a few seconds for Obsidian Git's auto-commit, or commit manually.
- **Rebase conflict.** Both you and Claude edited the same lines of the same file. The daemon aborts the rebase and logs the file. Fix: open the file in Obsidian, resolve manually, `git rebase --continue` from the terminal (or just commit the fix — Obsidian Git will push it).
- **Network / auth / 404.** Rare. The daemon backs off and retries. If it persists, check your PAT expiration and the repo slug.

### Concurrent-write protection (server side)

Beyond the git-level safety in the daemon, the MCP server itself has an optimistic-concurrency check for the specific race of "LLM read a page → human edited it in Obsidian → human's push reached GitHub → LLM tries to write." The server refuses any write where the page's GitHub blob sha has changed since the LLM last saw it. When this happens, the LLM receives a clear message telling it to re-read the page, integrate your changes, and write again.

You'll rarely hit this in practice — it requires simultaneous editing, which is unusual for a mostly-reading workflow. But when it does fire, Claude will handle it cleanly rather than silently overwriting your edit.

One consequence worth knowing about: Claude may occasionally report "write blocked" in the chat and then retry. That's the system working correctly, not an error.

### If you prefer a true push webhook

The polling approach is deliberate — it's zero-config per contributor and works through any network. If you want true push notifications anyway, you have two paths:

- **GitHub webhook → local tunnel** (ngrok, Cloudflare Tunnel, Tailscale Funnel): configure the repo to POST to a tunnel URL that forwards to a tiny HTTP listener on your machine. Sub-second latency. Each contributor runs their own tunnel.
- **GitHub webhook → MCP Worker → SSE stream to contributors**: extend the Worker to accept GitHub webhook POSTs on `/webhook` and fan them out to connected contributor clients via Server-Sent Events. More code but no per-contributor tunnel.

Neither is included in this scaffold. For a team of 2–5, the polling daemon is the pragmatic choice.

---

## Local development

The server runs locally with `wrangler dev`:

```bash
cd server
npx wrangler secret put GITHUB_TOKEN      # once, for the local dev env
npx wrangler secret put MCP_BEARER_TOKEN  # once
npx wrangler dev
```

That starts a server at `http://localhost:8787`. You can test it with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Point the Inspector at `http://localhost:8787/mcp` with transport "Streamable HTTP" and your bearer token, and you can call every tool interactively without touching Claude.

---

## How to use it day-to-day

The full conventions live in [`wiki/CYBER.md`](./wiki/CYBER.md). The short version:

- **Drop research in.** Paste a link, a paper, a competitor blog post, a screenshot of a vendor page. "Ingest this into research" gets Claude to read it, write a summary page under `wiki/research/`, and update any pages it affects (often `synthesis/open-questions.md`).
- **Log working sessions.** After a collaboration call: "log the session we just had about storage backends." Claude writes to `wiki/sessions/YYYY-MM-DD-<slug>.md` and nudges `open-questions.md` to reflect what was raised, resolved, or re-prioritized.
- **Record decisions.** When you converge: "write ADR-003 capturing our decision to use sqlite for v0." Claude writes the ADR, links it from every affected page, and updates the ADR index.
- **Evolve the specs.** As design firms up, pages under `wiki/specs/` (ingestion model, triage model, report formats) grow from seeds to something detailed enough to code from.
- **Lint periodically.** "Run a lint pass on the wiki." Claude finds orphan pages, stale seeds, planned-but-missing pages, and unresolved contradictions.

The goal is that the wiki compounds — every session, research dive, and decision leaves a permanent, interlinked trace. When CSAK eventually ships, this wiki will be the reason the product makes sense instead of being a mess of crossed assumptions.

---

## Cost

Cloudflare Workers free tier gives you 100,000 requests/day. This server uses a handful per tool call, and you'll make maybe a few hundred calls per day on an active engagement. You'll stay well inside the free tier.

GitHub is free for a private repo with two collaborators. The API rate limit (5000/hour with a PAT) is far beyond anything a two-analyst workflow hits.

---

## Security notes

- **Keep the repo private.** Even though the wiki holds design material rather than client data, your competitive analysis, architecture decisions, and commercial thinking aren't things you want leaking. The `engagements-RESERVED/` folder is also a load-bearing commitment: we do not put real client data anywhere in this repo unless and until an ADR activates it, per [[CYBER|CYBER.md §1 and §8]].
- **Rotate the MCP bearer token** if it ever leaks. `wrangler secret put MCP_BEARER_TOKEN` with a new value, then redeploy, then update both connectors in Claude.
- **Rotate the GitHub PAT** on its expiration date. Same procedure.
- **The Worker runs on Cloudflare infrastructure**, which is what lets Claude's cloud reach it — Claude custom connectors call the MCP URL from Anthropic's servers, not from your laptop. This is a hard requirement for remote MCP; the server must be on the public internet.

---

## Repo layout

```
cyber-wiki/
├── README.md                    # this file
├── llm-wiki.md                  # reference: the original LLM Wiki idea doc
├── wiki/
│   ├── CYBER.md                 # operating schema (read first)
│   ├── _index.md                # master content index
│   ├── _log.md                  # chronological changelog
│   ├── product/                 # vision, scope, users & jobs, glossary
│   ├── architecture/            # how CSAK is structured (diagrams + narratives)
│   ├── specs/                   # detailed specs: ingestion, triage, reports
│   ├── research/                # notes on the world outside CSAK
│   │   └── sources/             # raw reference artifacts (immutable)
│   ├── competitive/             # one page per existing/adjacent tool
│   ├── decisions/               # ADRs — the decisions backbone
│   ├── sessions/                # notes from collaborative working sessions
│   ├── synthesis/               # open questions, roadmap, lint reports
│   └── engagements-RESERVED/    # placeholder for future dogfooding (empty)
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── wrangler.jsonc
│   └── src/
│       ├── index.ts             # MCP entry point, Streamable HTTP
│       ├── github.ts            # GitHub Contents API client
│       └── search.ts            # BM25 search over wiki pages
└── tools/                       # local helpers for contributors
    ├── sync-daemon.py            # polls GitHub, runs `git pull` on new commits
    ├── com.cyber-wiki.sync.plist # launchd agent template (macOS)
    └── cyber-wiki-sync.service   # systemd user unit template (Linux)
```

---

## Attribution

The LLM Wiki pattern this project implements is described in `llm-wiki.md`, included here as a reference. This scaffold instantiates that pattern for a cybersecurity product-design context.
