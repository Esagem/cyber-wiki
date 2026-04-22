---
title: "Onboarding"
category: meta
tags: [onboarding, setup, devices]
status: active
confidence: high
owner: shared
created: 2026-04-22
updated: 2026-04-22
---

# Onboarding — cyber-wiki

This is the per-device and per-contributor setup guide. It's written tight for the core team (Eli and Christopher). If the team grows later, rewrite this for strangers.

## What you're setting up

A design wiki backed by a GitHub repo, accessible two ways:

- **Through Claude** via an MCP custom connector. Read and write the wiki from any Claude chat on any device.
- **Locally in Obsidian** with two-way git sync. Browse the wiki as a linked knowledge base; edits auto-push back.

The two paths are independent. A new device can use one, both, or neither. Pick what matters for that device.

## Prerequisites (once per contributor)

You need these before setting up any device:

1. **Write access to the GitHub repo** `Esagem/cyber-wiki`. Eli grants this via Settings → Collaborators.
2. **A Claude account** (Pro, Max, Team, or Enterprise — custom connectors don't work on Free).

That's it. The MCP server itself is already deployed and requires no per-contributor secrets, since it runs in public mode with the URL as the shared secret. Treat `https://cyber-wiki-mcp.esagem.workers.dev/mcp` as confidential — don't paste it into a public Slack, a screenshot, or a repo outside this one.

---

## Desktop setup (Windows, macOS, Linux)

Full two-way sync. The primary setup. Takes about 15 minutes.

### 1. Clone the repo

```bash
git clone git@github.com:Esagem/cyber-wiki.git
# or HTTPS if you don't have SSH set up
git clone https://github.com/Esagem/cyber-wiki.git
```

Pick a location you won't move — Obsidian remembers absolute paths. `~/vaults/cyber-wiki` on macOS/Linux or `C:\Users\<you>\cyber-wiki` on Windows is fine.

### 2. Add the Claude custom connector

In claude.ai (browser, Desktop app, or mobile):

1. Profile → **Settings** → **Connectors** → **Add custom connector**.
2. Name: `cyber-wiki`
3. Remote MCP server URL: `https://cyber-wiki-mcp.esagem.workers.dev/mcp`
4. Leave both OAuth fields blank.
5. Click **Add**.

Connectors are account-scoped, so once you add it here it's available in every Claude client you sign into.

Test it: start a new chat, click **+** next to the composer → **Connectors** → toggle `cyber-wiki` on. Ask:

> Read the master index of the cyber-wiki and tell me what's in it.

If Claude responds with a summary of the wiki content, the connector works.

### 3. Install Obsidian and open the vault

1. Download Obsidian from https://obsidian.md and install.
2. Open Obsidian → **Open folder as vault**.
3. Navigate to the `wiki/` subdirectory of your clone (not the repo root). Example: `C:\Users\<you>\cyber-wiki\wiki`.
4. Trust the vault when Obsidian asks.

Opening `wiki/` instead of the repo root keeps the graph view clean — no `server/` code files or `node_modules/` cluttering the graph.

### 4. Install Obsidian plugins

In Obsidian → **Settings → Community plugins** → turn on community plugins if prompted.

Browse and install:

- **Obsidian Git** by Vinzent — required for two-way sync.
- **Dataview** — optional but useful; lets pages query YAML front matter.

### 5. Configure Obsidian Git

**Settings → Community plugins → Obsidian Git → Options**. Set:

| Setting | Value |
|---------|-------|
| Auto commit-and-sync interval (minutes) | `1` |
| Auto commit-and-sync after stopping file edits | **on** |
| Auto pull interval (minutes) | `1` |
| Pull on startup | **on** |
| Merge strategy | `Merge` |
| Merge strategy on conflicts | `None (git default)` |
| Push on commit-and-sync | **on** |
| Pull on commit-and-sync | **on** |
| Disable informative notifications | **on** |
| Commit message on auto commit-and-sync | `obsidian: {{numFiles}} files` |

Under **Commit author**:

- Author name for commit: your name or handle.
- Author email: your GitHub noreply email (found at https://github.com/settings/emails — looks like `<id>+<username>@users.noreply.github.com`).

Under **Advanced**:

- Custom base path: `..` (because the vault is `wiki/` but the `.git` directory is one level up at the repo root).

### 6. Verify sync works

**Outbound (your edits → GitHub → Claude):**

1. Open any page in Obsidian, add a space, save with Ctrl+S.
2. Wait ~1 minute.
3. Check https://github.com/Esagem/cyber-wiki/commits/main — you should see a new commit from your git identity with message `obsidian: 1 files`.

**Inbound (Claude's edits → GitHub → your vault):**

1. Open a new Claude chat with the `cyber-wiki` connector enabled.
2. Ask: "Read `synthesis/roadmap.md` and then update its `updated` date to today."
3. Wait ~1 minute.
4. Open `synthesis/roadmap.md` in Obsidian — the change should be visible.

If both work, desktop setup is complete.

---

## Android setup

Android has a working Obsidian Git plugin (unlike iOS). You can get full two-way sync on your phone, though it's more fiddly than desktop.

If you just want to chat with Claude about the wiki on your phone, **skip Obsidian entirely** — the Claude mobile app already has the connector from step 2 above (connectors sync across your Claude account). For reading the wiki structured, https://github.com/Esagem/cyber-wiki in any browser renders markdown fine.

### Full Obsidian sync on Android

Takes about 20 minutes the first time.

1. **Generate a fine-grained GitHub PAT for the phone.** This one needs Contents: Read and write on the repo (so the plugin can push). Resource owner: Esagem (or wherever the repo lives). Repository access: Only select repositories → `cyber-wiki`. Copy the token. Treat the phone as a secondary device — if it's lost, revoke this PAT.

2. **Clone the repo into the Obsidian vault folder on the phone.** This is the fiddly part. The phone plugin can't clone over SSH — it uses HTTPS with token auth.
   - Open Obsidian on Android → create a new vault called `cyber-wiki`. Note where Obsidian created it (usually `/storage/emulated/0/Documents/cyber-wiki/` or similar).
   - Install the **Obsidian Git** community plugin inside the vault.
   - In the plugin settings, find "Clone existing remote repo" (usually under Advanced or the main Git section).
   - Repo URL: `https://<username>:<PAT>@github.com/Esagem/cyber-wiki.git`
   - After cloning, the vault will fill with the full repo, including `server/`, `tools/`, and `README.md`. You only want `wiki/` visible.

3. **Scope the vault to `wiki/`.** You have two options:
   - **Option A — change the vault to point at the `wiki/` subfolder.** In Obsidian → close the current vault → Open folder as vault → navigate to `<your cloned path>/wiki`. This is the same setup as desktop. Requires the "Custom base path" trick: `..` in the Obsidian Git advanced settings.
   - **Option B — exclude non-wiki folders.** Keep the vault at the repo root and in **Settings → Files and links → Excluded files**, add `server`, `tools`, `node_modules`, `.git`. Easier on mobile but the file tree still shows these folders until the sort settles.

   Option A is cleaner; option B is faster to set up.

4. **Configure Obsidian Git the same as desktop** (step 5 above). The settings screen is the same; same values apply. Mobile might have slightly fewer knobs — set whatever's available.

5. **Add the Claude custom connector** — already done if you did it on desktop (connectors follow your account). Just open the Claude Android app and verify the connector is listed under Settings → Connectors.

### Lightweight Android (no Obsidian)

If full sync is more trouble than it's worth on the phone:

1. Install the **Claude app** from Play Store. Sign in. The `cyber-wiki` connector should already be there from your desktop setup.
2. Install the **GitHub app** from Play Store. Sign in. Navigate to `Esagem/cyber-wiki`. You can browse all files, read pages as rendered markdown, and make small edits through the GitHub web editor in the app.

That covers 90% of what you'd do on a phone anyway.

---

## iPhone setup

Claude app works fine. Obsidian Git on iOS is unreliable — iOS sandboxes filesystem access in ways the plugin struggles with. Don't bother with Obsidian sync on iPhone.

Follow the "Lightweight Android" path above — Claude app for chat, GitHub mobile app for browsing and light edits. This is the honest recommendation.

---

## New contributor onboarding checklist

When a new person joins the team, run through this in order:

- [ ] Eli invites them to `Esagem/cyber-wiki` as a collaborator with write access.
- [ ] They accept the invite in their GitHub notifications.
- [ ] They read [[CYBER|CYBER.md]] end to end. This is the operating manual; Claude will behave according to it on every session.
- [ ] They skim [[_index|_index.md]] to see the shape of the wiki.
- [ ] They skim [[synthesis/open-questions|synthesis/open-questions.md]] to see what's being thought about right now.
- [ ] They pick a device and follow the setup for it above.
- [ ] They do a test write (ask Claude to make a trivial edit to their own "intro" page under `product/` or similar, verify it shows up in their Obsidian/GitHub).
- [ ] They read the ADR format in [[decisions/README|decisions/README.md]] so they can participate in design decisions.

Estimated total onboarding time for a new contributor with Claude Pro: about 30 minutes end-to-end.

---

## What to do if something breaks

**Claude can't reach the wiki.**
Check https://cyber-wiki-mcp.esagem.workers.dev/health in a browser. If it returns JSON with `"ok": true`, the server is fine — the problem is the connector config in Claude. Remove and re-add the connector.

**Obsidian Git won't pull or push.**
Open the Obsidian developer console with Ctrl+Shift+I → Console tab. The plugin logs its errors there. Most common causes:
- Authentication failure → PAT expired or was revoked. Generate a new one, update the remote URL.
- Unstaged changes blocking rebase → `git status` from the terminal, decide what to do with the dirty files (see the rebase-fallback note below).
- Git not found → Obsidian can't find the git binary. On Windows, ensure git is in your system PATH and restart Obsidian.

**Rebase failures after a concurrent edit.**
Obsidian Git's rebase fallback kicks in when your local branch has commits the remote doesn't. If rebase fails cleanly, the plugin aborts and leaves the repo usable. Open the terminal in the repo root and run `git status` — if you see a conflict marker, open the file, resolve manually in Obsidian, then `git rebase --continue`. If the repo is stuck mid-rebase, `git rebase --abort` is always safe and puts you back where you started.

**Concurrent write errors from Claude.**
When two editors try to write the same page at the same time, the MCP server refuses the second write and tells Claude to re-read. You'll occasionally see a "Write blocked" message in chat — that's the system working correctly. Just ask Claude to try again.

**Something else.**
Ping Eli or Christopher. The wiki is small enough that we can debug anything quickly together.

---

## Rotation and hygiene

These are hygiene items to revisit every quarter or so:

- **PATs expire.** The Worker's GitHub PAT and each contributor's mobile PAT have expiration dates. Set a calendar reminder to rotate a week before each expires.
- **URL rotation.** If the MCP URL ever leaks outside the team, treat the wiki as compromised. Rotation means redeploying the Worker under a new subdomain (edit `server/wrangler.jsonc`, redeploy, update the connector URL in every contributor's Claude account). Annoying but doable in under an hour.
- **New ADRs trigger index updates.** Every new ADR should be added to [[decisions/README|decisions/README.md]]'s index table. Claude usually does this automatically; a lint pass catches what it missed.
- **Periodic lint passes.** Ask Claude roughly monthly: "Run a lint pass on the wiki and write the results to `synthesis/lint-report.md`." Keeps the wiki healthy as it grows.

---

## Related

- [[CYBER|CYBER.md]] — the operating schema
- [[_index|Master Index]]
- [[synthesis/roadmap|Roadmap]]
