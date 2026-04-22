// src/search.ts
//
// BM25 full-text search over all wiki pages. Recomputed from scratch on each
// call — cheap at moderate scale (hundreds of pages), and avoids the pain of
// keeping an index in sync with a GitHub-backed corpus.
//
// If the wiki grows past ~2000 pages we can swap this out for a precomputed
// index stored in KV or R2 and refreshed on write, but the interface stays the
// same.

import { listPages, readPagesBulk, type GitHubConfig } from "./github";

export interface SearchHit {
  path: string;
  score: number;
  title: string;
  snippet: string;
}

// Standard BM25 knobs.
const K1 = 1.2;
const B = 0.75;

const STOPWORDS = new Set([
  "the","a","an","and","or","but","of","in","to","for","on","with","at","by",
  "is","are","was","were","be","been","being","has","have","had","do","does",
  "did","this","that","these","those","it","its","as","if","then","so","not",
]);

function tokenize(text: string): string[] {
  // Lowercase, split on anything that's not a letter or digit.
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export async function searchWiki(
  cfg: GitHubConfig,
  query: string,
  maxResults: number,
): Promise<SearchHit[]> {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  // Pull every page. This is a batch of parallel GETs — at ~300 pages it runs
  // in a few seconds on the free Cloudflare tier. We dedupe query tokens to
  // avoid re-weighting a single term that appears twice in the query.
  const paths = await listPages(cfg);
  const docs = await readPagesBulk(cfg, paths);

  // Build per-doc token arrays, skip pages that failed to load.
  const docTokens: { path: string; tokens: string[]; text: string }[] = [];
  for (const d of docs) {
    if (d.text == null) continue;
    docTokens.push({ path: d.path, tokens: tokenize(d.text), text: d.text });
  }
  if (docTokens.length === 0) return [];

  const N = docTokens.length;
  const avgDL = docTokens.reduce((a, d) => a + d.tokens.length, 0) / N;

  // Document frequency for each unique query token.
  const df = new Map<string, number>();
  const uniqueQueryTokens = [...new Set(queryTokens)];
  for (const qt of uniqueQueryTokens) {
    let count = 0;
    for (const d of docTokens) {
      if (d.tokens.includes(qt)) count++;
    }
    df.set(qt, count);
  }

  // Compute BM25 scores.
  const hits: SearchHit[] = [];
  for (const d of docTokens) {
    const dl = d.tokens.length;
    if (dl === 0) continue;

    // Term frequencies within this doc.
    const tf = new Map<string, number>();
    for (const t of d.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

    let score = 0;
    for (const qt of uniqueQueryTokens) {
      const f = tf.get(qt) ?? 0;
      if (f === 0) continue;
      const n = df.get(qt) ?? 0;
      // BM25 IDF with the +1 smoothing that keeps it non-negative.
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const num = f * (K1 + 1);
      const den = f + K1 * (1 - B + B * (dl / avgDL));
      score += idf * (num / den);
    }

    if (score > 0) {
      hits.push({
        path: d.path,
        score,
        title: extractTitle(d.text, d.path),
        snippet: buildSnippet(d.text, queryTokens),
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, maxResults);
}

function extractTitle(text: string, fallbackPath: string): string {
  // Prefer YAML front matter `title`, fall back to first H1, then filename.
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const titleLine = fmMatch[1].split("\n").find((l) => /^title\s*:/.test(l));
    if (titleLine) {
      const t = titleLine.replace(/^title\s*:\s*/, "").trim().replace(/^["']|["']$/g, "");
      if (t) return t;
    }
  }
  const h1 = text.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return fallbackPath.split("/").pop() ?? fallbackPath;
}

function buildSnippet(text: string, queryTokens: string[]): string {
  // Find the line with the most query-token hits and return up to ~240 chars
  // around it. Strip front matter so the snippet is never YAML.
  const body = text.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
  const lines = body.split("\n");
  const lineScores = lines.map((line) => {
    const lower = line.toLowerCase();
    let s = 0;
    for (const qt of queryTokens) if (lower.includes(qt)) s++;
    return s;
  });
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < lineScores.length; i++) {
    if (lineScores[i] > bestScore) {
      bestScore = lineScores[i];
      bestIdx = i;
    }
  }
  // Widen around the best line a bit for context.
  const from = Math.max(0, bestIdx - 1);
  const to = Math.min(lines.length, bestIdx + 3);
  let snippet = lines.slice(from, to).join(" ").replace(/\s+/g, " ").trim();
  if (snippet.length > 240) snippet = snippet.slice(0, 237) + "...";
  return snippet;
}
