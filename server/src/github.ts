// src/github.ts
//
// Thin client over the GitHub Contents API + Git Trees API.
// Reads are cached for a short TTL to keep the wiki responsive across chained
// tool calls; writes invalidate the cache.

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  wikiRoot: string;
  token: string;
  commitAuthorName: string;
  commitAuthorEmail: string;
}

interface TreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url: string;
}

interface TreeResponse {
  sha: string;
  url: string;
  tree: TreeEntry[];
  truncated: boolean;
}

interface ContentResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string; // base64
  encoding: "base64";
}

const GH_API = "https://api.github.com";
const UA = "cyber-wiki-mcp/0.1";

// In-Worker memoization for the lifetime of a single request batch.
// We don't use KV/Cache API here — the GitHub API is fast enough and this
// server typically issues a handful of reads per turn.
const moduleCache = {
  tree: null as { data: TreeResponse; expires: number } | null,
  files: new Map<string, { text: string; sha: string; expires: number }>(),
};

const CACHE_TTL_MS = 5_000;

function ghHeaders(cfg: GitHubConfig): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": UA,
  };
}

export function invalidateCache() {
  moduleCache.tree = null;
  moduleCache.files.clear();
}

/**
 * Fetch the full file tree of the wiki branch. Returns every blob path under
 * wikiRoot/, recursively. GitHub's git tree API is the cheapest way to do this
 * (one request for up to ~100k entries).
 */
export async function getTree(cfg: GitHubConfig): Promise<TreeResponse> {
  const now = Date.now();
  if (moduleCache.tree && moduleCache.tree.expires > now) {
    return moduleCache.tree.data;
  }

  // Resolve the branch head commit → its tree sha, then fetch the tree recursively.
  const branchUrl = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/branches/${cfg.branch}`;
  const branchResp = await fetch(branchUrl, { headers: ghHeaders(cfg) });
  if (!branchResp.ok) {
    throw new Error(`GitHub branch fetch failed: ${branchResp.status} ${await branchResp.text()}`);
  }
  const branchData = (await branchResp.json()) as { commit: { commit: { tree: { sha: string } } } };
  const treeSha = branchData.commit.commit.tree.sha;

  const treeUrl = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/git/trees/${treeSha}?recursive=1`;
  const treeResp = await fetch(treeUrl, { headers: ghHeaders(cfg) });
  if (!treeResp.ok) {
    throw new Error(`GitHub tree fetch failed: ${treeResp.status} ${await treeResp.text()}`);
  }
  const data = (await treeResp.json()) as TreeResponse;

  moduleCache.tree = { data, expires: now + CACHE_TTL_MS };
  return data;
}

/**
 * List all markdown file paths under wikiRoot/, relative to wikiRoot/.
 * Optionally filter by a leading folder (category).
 */
export async function listPages(cfg: GitHubConfig, category?: string): Promise<string[]> {
  const tree = await getTree(cfg);
  const rootPrefix = cfg.wikiRoot.endsWith("/") ? cfg.wikiRoot : cfg.wikiRoot + "/";
  const results: string[] = [];
  for (const entry of tree.tree) {
    if (entry.type !== "blob") continue;
    if (!entry.path.startsWith(rootPrefix)) continue;
    if (!entry.path.endsWith(".md")) continue;
    const relative = entry.path.slice(rootPrefix.length);
    if (category && !relative.startsWith(category.replace(/\/$/, "") + "/")) continue;
    results.push(relative);
  }
  results.sort();
  return results;
}

/**
 * Read a single markdown page by its path relative to wikiRoot.
 * Returns the decoded text and the blob sha (needed for updates).
 */
export async function readPage(
  cfg: GitHubConfig,
  relativePath: string,
): Promise<{ text: string; sha: string }> {
  return readPageInternal(cfg, relativePath, { bypassCache: false });
}

/**
 * Like readPage, but guaranteed to hit GitHub rather than returning a cached
 * copy. Used in the write path: the pre-write sha must reflect the true
 * current HEAD so that optimistic concurrency catches edits made between
 * when the LLM read the page and when it decided to write.
 */
export async function readPageFresh(
  cfg: GitHubConfig,
  relativePath: string,
): Promise<{ text: string; sha: string }> {
  return readPageInternal(cfg, relativePath, { bypassCache: true });
}

async function readPageInternal(
  cfg: GitHubConfig,
  relativePath: string,
  opts: { bypassCache: boolean },
): Promise<{ text: string; sha: string }> {
  const now = Date.now();
  if (!opts.bypassCache) {
    const cached = moduleCache.files.get(relativePath);
    if (cached && cached.expires > now) {
      return { text: cached.text, sha: cached.sha };
    }
  }

  const fullPath = joinPath(cfg.wikiRoot, relativePath);
  const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodePath(fullPath)}?ref=${cfg.branch}`;
  const resp = await fetch(url, { headers: ghHeaders(cfg) });
  if (resp.status === 404) {
    throw new NotFoundError(`Wiki page not found: ${relativePath}`);
  }
  if (!resp.ok) {
    throw new Error(`GitHub read failed: ${resp.status} ${await resp.text()}`);
  }
  const data = (await resp.json()) as ContentResponse;
  const text = b64decode(data.content);
  moduleCache.files.set(relativePath, { text, sha: data.sha, expires: now + CACHE_TTL_MS });
  return { text, sha: data.sha };
}

/**
 * Read many pages by relative path in parallel. Missing pages are returned as null.
 */
export async function readPagesBulk(
  cfg: GitHubConfig,
  relativePaths: string[],
): Promise<Array<{ path: string; text: string | null }>> {
  const results = await Promise.allSettled(relativePaths.map((p) => readPage(cfg, p)));
  return results.map((r, i) => ({
    path: relativePaths[i],
    text: r.status === "fulfilled" ? r.value.text : null,
  }));
}

/**
 * Create or update a single markdown page. Uses the Contents API single-file
 * endpoint (simpler than building a tree+commit for one file).
 *
 * If the page already exists, its current sha is fetched automatically and
 * included in the PUT so GitHub treats this as an update, not a create.
 */
export async function writePage(
  cfg: GitHubConfig,
  relativePath: string,
  content: string,
  commitMessage: string,
): Promise<{ sha: string; commitSha: string }> {
  // Discover existing sha if the file is already there. CRITICAL: this must
  // bypass the cache. The cache exists to make chained LLM reads cheap, but
  // in the write path we need the true current sha from GitHub so that the
  // optimistic-concurrency check below catches any edit that landed between
  // the LLM's original read and this write. Without this, an edit made in
  // Obsidian (and pushed by the local auto-push plugin) during the cache TTL
  // window would be silently clobbered.
  let existingSha: string | undefined;
  try {
    const existing = await readPageFresh(cfg, relativePath);
    existingSha = existing.sha;
  } catch (e) {
    if (!(e instanceof NotFoundError)) throw e;
  }

  const fullPath = joinPath(cfg.wikiRoot, relativePath);
  const url = `${GH_API}/repos/${cfg.owner}/${cfg.repo}/contents/${encodePath(fullPath)}`;

  const body: Record<string, unknown> = {
    message: commitMessage,
    content: b64encode(content),
    branch: cfg.branch,
    committer: {
      name: cfg.commitAuthorName,
      email: cfg.commitAuthorEmail,
    },
  };
  if (existingSha) body.sha = existingSha;

  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      ...ghHeaders(cfg),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (resp.status === 409 || resp.status === 422) {
    // GitHub returns 409 when the `sha` we supplied no longer matches the
    // current blob, and 422 for some related conflict conditions. Both mean:
    // the page changed out from under us between read and write. Surface
    // this distinctly so the LLM knows to re-read and retry rather than
    // treating it as a generic error.
    const detail = await resp.text();
    throw new ConcurrentWriteError(
      `Page '${relativePath}' was modified by another editor between the read ` +
      `and this write. Re-read the page with wiki_read, integrate any changes, ` +
      `and try writing again. (GitHub ${resp.status}: ${detail})`,
    );
  }
  if (!resp.ok) {
    throw new Error(`GitHub write failed: ${resp.status} ${await resp.text()}`);
  }
  const data = (await resp.json()) as {
    content: { sha: string };
    commit: { sha: string };
  };

  invalidateCache();
  return { sha: data.content.sha, commitSha: data.commit.sha };
}

export class NotFoundError extends Error {}
export class ConcurrentWriteError extends Error {}

// --- helpers -----------------------------------------------------------------

function joinPath(root: string, rel: string): string {
  const r = root.replace(/\/+$/, "");
  const p = rel.replace(/^\/+/, "");
  return `${r}/${p}`;
}

function encodePath(path: string): string {
  // Encode each segment so special characters are safe, but keep the slashes.
  return path.split("/").map(encodeURIComponent).join("/");
}

function b64encode(s: string): string {
  // Workers have btoa but it only handles latin-1. Use TextEncoder to support UTF-8.
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decode(s: string): string {
  // GitHub wraps content in newlines; atob doesn't mind but strip to be safe.
  const clean = s.replace(/\s/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
