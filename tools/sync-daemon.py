#!/usr/bin/env python3
"""
cyber-wiki-sync — local daemon that keeps an Obsidian vault in sync with the
shared GitHub repo. Polls the GitHub commits API for new commits on the
configured branch and runs `git pull` when something lands.

This is a "functional webhook" — polling at 3-5 second intervals feels
indistinguishable from a push webhook, but requires zero inbound network
configuration on the contributor's machine. Survives sleep, offline periods,
and laptop moves transparently.

Usage:
    # one-time config
    export GITHUB_TOKEN=<fine-grained PAT with metadata:read on the repo>
    export CYBER_WIKI_PATH=/path/to/your/cloned/cyber-wiki
    export CYBER_WIKI_REPO=<your-org>/cyber-wiki        # optional, auto-detected from git remote
    export CYBER_WIKI_BRANCH=main                         # optional, default 'main'
    export CYBER_WIKI_POLL_SECONDS=3                      # optional, default 3

    # run
    python3 tools/sync-daemon.py

Recommended: run under a launchd agent (macOS) or systemd user service (Linux)
so it starts automatically. See README §Obsidian setup for details.
"""

from __future__ import annotations

import json
import logging
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Config:
    repo: str
    branch: str
    path: Path
    token: str
    poll_seconds: int
    use_etag: bool = True


def die(msg: str, code: int = 1) -> "None":
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


def load_config() -> Config:
    path_str = os.environ.get("CYBER_WIKI_PATH")
    if not path_str:
        die("CYBER_WIKI_PATH not set. Point it at your local clone of the wiki repo.")
    path = Path(path_str).expanduser().resolve()
    if not (path / ".git").is_dir():
        die(f"{path} is not a git repo (no .git directory).")

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        die("GITHUB_TOKEN not set. Create a fine-grained PAT with Metadata: read on the repo.")

    # Auto-detect repo from `git remote get-url origin` if not provided.
    repo = os.environ.get("CYBER_WIKI_REPO")
    if not repo:
        try:
            url = run_git(path, ["remote", "get-url", "origin"]).strip()
            repo = parse_owner_repo(url)
        except Exception as e:
            die(f"could not auto-detect repo from git remote: {e}. Set CYBER_WIKI_REPO explicitly.")

    branch = os.environ.get("CYBER_WIKI_BRANCH", "main")

    try:
        poll_seconds = int(os.environ.get("CYBER_WIKI_POLL_SECONDS", "3"))
    except ValueError:
        die("CYBER_WIKI_POLL_SECONDS must be an integer.")
    if poll_seconds < 1:
        die("CYBER_WIKI_POLL_SECONDS must be >= 1.")

    return Config(repo=repo, branch=branch, path=path, token=token, poll_seconds=poll_seconds)


def parse_owner_repo(remote_url: str) -> str:
    """Accept either SSH (git@github.com:owner/repo.git) or HTTPS (https://github.com/owner/repo(.git))."""
    url = remote_url.strip()
    if url.startswith("git@"):
        # git@github.com:owner/repo.git
        _, path = url.split(":", 1)
    elif url.startswith("http"):
        # https://github.com/owner/repo(.git)
        path = url.split("github.com/", 1)[1]
    else:
        raise ValueError(f"unrecognized remote url format: {remote_url}")
    if path.endswith(".git"):
        path = path[:-4]
    return path


def run_git(cwd: Path, args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def current_local_sha(cfg: Config) -> str:
    return run_git(cfg.path, ["rev-parse", "HEAD"]).strip()


def pull(cfg: Config) -> "tuple[bool, str]":
    """
    Pull new commits from the remote.

    Strategy: try --ff-only first (the common case — no local commits to worry
    about). If that fails because local branch has diverged, fall back to
    --rebase. This is the right posture when Obsidian Git is committing your
    local edits on a short interval behind us: most of the time we fast-forward,
    and when we can't, rebasing our local commits on top of the remote is
    usually safe for text-file edits. Real conflicts surface loudly rather
    than being auto-resolved.
    """
    # First attempt: fast-forward only. Fails instantly if there's anything to rebase.
    ff = subprocess.run(
        ["git", "pull", "--ff-only", "origin", cfg.branch],
        cwd=cfg.path,
        check=False,
        capture_output=True,
        text=True,
    )
    if ff.returncode == 0:
        return True, (ff.stdout + ff.stderr).strip()

    # FF failed. Check whether the local branch has commits the remote doesn't —
    # if so, rebase is the right fallback. If the failure was for some other
    # reason (dirty working tree, detached HEAD, etc.), don't try to rebase.
    status = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=cfg.path,
        check=False,
        capture_output=True,
        text=True,
    )
    if status.stdout.strip():
        return False, (
            "local working tree has uncommitted changes; refusing to rebase. "
            "Commit or stash them (or let Obsidian Git auto-commit) and the "
            f"daemon will recover. git pull output:\n{ff.stderr.strip()}"
        )

    # Working tree is clean; attempt rebase.
    rb = subprocess.run(
        ["git", "pull", "--rebase", "origin", cfg.branch],
        cwd=cfg.path,
        check=False,
        capture_output=True,
        text=True,
    )
    if rb.returncode == 0:
        return True, "(rebased) " + (rb.stdout + rb.stderr).strip()

    # Rebase hit a real conflict. Abort the rebase so the repo stays usable,
    # then surface the error. The user resolves manually.
    subprocess.run(
        ["git", "rebase", "--abort"],
        cwd=cfg.path,
        check=False,
        capture_output=True,
    )
    return False, (
        "rebase conflict — a file was edited both locally and on the remote. "
        "Rebase was aborted so the repo is in a clean state. Resolve with "
        "`git pull --rebase` from the terminal and fix the conflict in "
        f"Obsidian. Details:\n{rb.stdout.strip()}\n{rb.stderr.strip()}"
    )


class RemotePoller:
    """
    Wraps the GitHub commits API with ETag support so we only do real work when
    the remote branch actually advances. ETag handling means 304 Not Modified
    responses don't count against the 5000/hr rate limit in any way that matters.
    """

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.etag: "str | None" = None
        self.last_sha: "str | None" = None

    def latest_remote_sha(self) -> "str | None":
        url = f"https://api.github.com/repos/{self.cfg.repo}/commits/{self.cfg.branch}"
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {self.cfg.token}")
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        req.add_header("User-Agent", "cyber-wiki-sync/1.0")
        if self.etag and self.cfg.use_etag:
            req.add_header("If-None-Match", self.etag)

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                new_etag = resp.headers.get("ETag")
                if new_etag:
                    self.etag = new_etag
                data = json.loads(resp.read().decode("utf-8"))
                sha = data.get("sha")
                if not sha:
                    logging.warning("commits endpoint returned no sha; unexpected payload")
                    return None
                self.last_sha = sha
                return sha
        except urllib.error.HTTPError as e:
            if e.code == 304:
                # Not modified since our last ETag — remote hasn't moved.
                return self.last_sha
            if e.code == 401:
                die("GitHub returned 401 Unauthorized. Check GITHUB_TOKEN.")
            if e.code == 403:
                logging.warning("GitHub 403 (likely rate limit). Sleeping 60s.")
                time.sleep(60)
                return self.last_sha
            if e.code == 404:
                die(f"repo or branch not found: {self.cfg.repo}@{self.cfg.branch}. Check config.")
            logging.warning(f"GitHub HTTP error {e.code}: {e.reason}. Backing off.")
            time.sleep(10)
            return self.last_sha
        except urllib.error.URLError as e:
            logging.warning(f"network error: {e.reason}. Backing off.")
            time.sleep(10)
            return self.last_sha
        except Exception as e:
            logging.warning(f"unexpected error while polling: {e}. Backing off.")
            time.sleep(10)
            return self.last_sha


_should_stop = False


def _handle_signal(signum, frame):
    global _should_stop
    _should_stop = True


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("CYBER_WIKI_LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(message)s",
    )

    cfg = load_config()
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    logging.info(
        f"cyber-wiki-sync: watching {cfg.repo}@{cfg.branch} in {cfg.path}, "
        f"polling every {cfg.poll_seconds}s"
    )

    poller = RemotePoller(cfg)

    while not _should_stop:
        try:
            local = current_local_sha(cfg)
            remote = poller.latest_remote_sha()
            if remote and remote != local:
                logging.info(f"remote advanced: {local[:7]} -> {remote[:7]}. Pulling.")
                ok, msg = pull(cfg)
                if ok:
                    logging.info(f"pulled cleanly: {current_local_sha(cfg)[:7]}")
                else:
                    logging.error(
                        "git pull failed. Almost always caused by local uncommitted changes "
                        f"or a non-fast-forward history. Fix the repo manually. Details:\n{msg}"
                    )
                    # Back off harder so we don't spam errors.
                    time.sleep(30)
        except subprocess.CalledProcessError as e:
            logging.error(f"git command failed: {e.stderr.strip() if e.stderr else e}")
            time.sleep(10)
        except Exception as e:
            logging.error(f"unexpected error in poll loop: {e}")
            time.sleep(10)

        # Sleep in short slices so SIGINT is responsive.
        slept = 0.0
        while slept < cfg.poll_seconds and not _should_stop:
            time.sleep(0.2)
            slept += 0.2

    logging.info("cyber-wiki-sync: stopping.")


if __name__ == "__main__":
    main()
