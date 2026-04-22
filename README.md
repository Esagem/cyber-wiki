# cyber-wiki

The collaborative design space for **CSAK** — Cybersecurity Swiss Army Knife. A tool (not yet built) that will ingest data from security tools, triage what matters, and emit consistent deliverables: internal reviews for analysts and fix-it tickets for the teams being monitored.

This repo is where the design lives. CSAK's eventual implementation code will live elsewhere.

**Phase: pre-design.** Most of the wiki is scoping, open questions, and early ADRs.

## How it's used

Contributors work with the wiki two ways:

- **Through Claude** via a custom MCP connector. Ask Claude to read, search, summarize, draft ADRs, or file session notes — it does the bookkeeping and the commits land in this repo.
- **Locally in Obsidian** with two-way git sync. Browse the wiki as a linked knowledge graph; edits auto-push back.

Both paths are live and in use. See [ONBOARDING.md](./ONBOARDING.md) for device setup.

## Architecture

```
Contributor ──► Claude ──► MCP connector ──► Cloudflare Worker ──► this repo
                                                                         ▲
                                                       Obsidian Git ─────┘
```

Reads and writes from Claude flow through a Cloudflare Worker (`server/`) that authenticates to GitHub with a fine-grained PAT and commits on the contributor's behalf. Local Obsidian edits flow directly through git. A short cache TTL and optimistic-concurrency check on the server keep the two paths from stepping on each other.

## Repo layout

```
cyber-wiki/
├── README.md                    # you are here
├── ONBOARDING.md                # per-device and per-contributor setup
├── llm-wiki.md                  # reference: the LLM Wiki pattern this implements
├── wiki/                        # the design knowledge base
│   ├── CYBER.md                 # operating schema — read this first
│   ├── _index.md                # master content index
│   ├── _log.md                  # append-only chronological log
│   ├── product/                 # vision, scope, users, glossary
│   ├── architecture/            # subsystem designs
│   ├── specs/                   # ingest, triage, report specs
│   ├── research/                # notes on the world outside CSAK
│   ├── competitive/             # adjacent and competing tools
│   ├── decisions/               # ADRs — the decisions backbone
│   ├── sessions/                # working-session notes
│   ├── synthesis/               # open questions, roadmap, lint reports
│   └── engagements-RESERVED/    # placeholder for possible future dogfooding
└── server/                      # MCP server source (Cloudflare Worker)
```

## Where to start

- **Reading**: [wiki/CYBER.md](./wiki/CYBER.md) explains the schema and conventions. [wiki/_index.md](./wiki/_index.md) is the catalog.
- **Contributing**: [ONBOARDING.md](./ONBOARDING.md) covers setting up Claude + Obsidian on your device.
- **Understanding the pattern**: [llm-wiki.md](./llm-wiki.md) describes the general LLM-Wiki idea this repo instantiates.

## Privacy

This is a private repo. No real client data. The `engagements-RESERVED/` folder is a deliberate empty placeholder — see [wiki/CYBER.md §1](./wiki/CYBER.md) for why.