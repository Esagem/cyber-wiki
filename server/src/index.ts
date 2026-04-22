// src/index.ts
//
// MCP server for the cyber-wiki, running as a Cloudflare Worker.
//
// Transport: Streamable HTTP at POST /mcp. The spec (2025-03-26) uses a single
// HTTP endpoint for JSON-RPC messages; this implementation supports the common
// subset that Claude custom connectors and the MCP Inspector expect.
//
// Backend: a shared GitHub repo containing the wiki markdown. Reads use the
// Contents API; writes are single-file commits. See ./github.ts.
//
// Auth: optional shared Bearer token. If MCP_BEARER_TOKEN is set as a Wrangler
// secret, clients must send `Authorization: Bearer <token>`. Leave it unset
// only if you want a public server (not recommended, since wiki_write is
// exposed).

import { listPages, readPage, writePage, NotFoundError, ConcurrentWriteError, type GitHubConfig } from "./github";
import { searchWiki } from "./search";

// ---------- Env -------------------------------------------------------------

interface Env {
  // vars (set in wrangler.jsonc)
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  WIKI_ROOT: string;
  COMMIT_AUTHOR_NAME: string;
  COMMIT_AUTHOR_EMAIL: string;
  // secrets (set via `wrangler secret put`)
  GITHUB_TOKEN: string;
  MCP_BEARER_TOKEN?: string;
}

function gh(env: Env): GitHubConfig {
  return {
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    branch: env.GITHUB_BRANCH,
    wikiRoot: env.WIKI_ROOT,
    token: env.GITHUB_TOKEN,
    commitAuthorName: env.COMMIT_AUTHOR_NAME,
    commitAuthorEmail: env.COMMIT_AUTHOR_EMAIL,
  };
}

// ---------- MCP protocol types ---------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcError {
  jsonrpc: "2.0";
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
}

interface JsonRpcResult {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "cyber-wiki", version: "0.1.0" };

// ---------- Tool catalog ----------------------------------------------------

const TOOLS = [
  {
    name: "wiki_index",
    description: "Return the master index of the wiki (_index.md). Read this first for any non-trivial query.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "wiki_list",
    description: "List all wiki pages, optionally filtered by category folder (e.g. 'triage', 'reporting', 'engagements/EXAMPLE-acme-2026-q2').",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Optional category / folder prefix. Omit for all pages.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "wiki_read",
    description: "Read a specific wiki page by its path relative to the wiki root (e.g. 'triage/severity-model.md').",
    inputSchema: {
      type: "object",
      properties: {
        page_path: {
          type: "string",
          description: "Path relative to the wiki root, e.g. 'triage/severity-model.md'.",
        },
      },
      required: ["page_path"],
      additionalProperties: false,
    },
  },
  {
    name: "wiki_search",
    description: "Full-text BM25 search across all wiki pages. Use content terms (technology, CVE IDs, finding IDs, asset names), not meta words like 'page' or 'wiki'. Returns top matching pages with snippets.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query. Use content terms, not meta words like 'page' or 'wiki'.",
        },
        max_results: {
          type: "number",
          description: "Max results to return (default 10).",
          default: 10,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "wiki_write",
    description: "Create or update a wiki page. Content must include YAML front matter per CYBER.md conventions. Also appends a dated entry to _log.md automatically. If the write is blocked because the page was modified concurrently (e.g. by a human editing in Obsidian), the tool returns an informative message — re-read the page with wiki_read, integrate the changes into your content, and call wiki_write again.",
    inputSchema: {
      type: "object",
      properties: {
        page_path: {
          type: "string",
          description: "Path relative to the wiki root, e.g. 'engagements/acme-2026-q2/findings/FIND-2026-001.md'.",
        },
        content: {
          type: "string",
          description: "Full markdown content, including YAML front matter.",
        },
        changelog_entry: {
          type: "string",
          description: "One-line description for the _log.md entry. Example: 'ingest | acme-2026-q2 | added FIND-2026-001 from Nessus export'.",
        },
      },
      required: ["page_path", "content"],
      additionalProperties: false,
    },
  },
];

// ---------- Request auth ----------------------------------------------------

function authOk(req: Request, env: Env): boolean {
  if (!env.MCP_BEARER_TOKEN) return true; // public mode
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  // Constant-time compare to avoid timing leaks.
  return timingSafeEqual(match[1], env.MCP_BEARER_TOKEN);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- Tool handlers ---------------------------------------------------

async function handleToolCall(name: string, args: Record<string, unknown>, env: Env): Promise<unknown> {
  const cfg = gh(env);

  switch (name) {
    case "wiki_index": {
      try {
        const { text } = await readPage(cfg, "_index.md");
        return toolText(text);
      } catch (e) {
        if (e instanceof NotFoundError) {
          return toolText("_index.md not found. Has the wiki been initialized?");
        }
        throw e;
      }
    }

    case "wiki_list": {
      const category = typeof args.category === "string" ? args.category : undefined;
      const paths = await listPages(cfg, category);
      if (paths.length === 0) {
        return toolText(`No pages found${category ? ` under category "${category}"` : ""}.`);
      }
      const body = paths.map((p) => `- ${p}`).join("\n");
      return toolText(`Found ${paths.length} page${paths.length === 1 ? "" : "s"}${category ? ` under ${category}` : ""}:\n\n${body}`);
    }

    case "wiki_read": {
      const page = args.page_path;
      if (typeof page !== "string" || page.length === 0) {
        throw new Error("page_path is required");
      }
      if (!page.endsWith(".md")) {
        throw new Error("page_path must end with .md");
      }
      try {
        const { text } = await readPage(cfg, page);
        return toolText(text);
      } catch (e) {
        if (e instanceof NotFoundError) return toolText(`Page not found: ${page}`);
        throw e;
      }
    }

    case "wiki_search": {
      const query = args.query;
      if (typeof query !== "string" || query.length === 0) {
        throw new Error("query is required");
      }
      const maxRaw = args.max_results;
      const max = typeof maxRaw === "number" && maxRaw > 0 ? Math.min(maxRaw, 50) : 10;
      const hits = await searchWiki(cfg, query, max);
      if (hits.length === 0) {
        return toolText(`No matches for "${query}".`);
      }
      const out = hits
        .map((h, i) => `${i + 1}. **${h.title}** — \`${h.path}\` (score ${h.score.toFixed(2)})\n   ${h.snippet}`)
        .join("\n\n");
      return toolText(`Top ${hits.length} match${hits.length === 1 ? "" : "es"} for "${query}":\n\n${out}`);
    }

    case "wiki_write": {
      const pagePath = args.page_path;
      const content = args.content;
      const changelog = typeof args.changelog_entry === "string" ? args.changelog_entry : "";
      if (typeof pagePath !== "string" || pagePath.length === 0) throw new Error("page_path is required");
      if (!pagePath.endsWith(".md")) throw new Error("page_path must end with .md");
      if (typeof content !== "string" || content.length === 0) throw new Error("content is required");
      if (pagePath.startsWith("/") || pagePath.includes("..")) throw new Error("page_path must be a safe relative path");
      if (!/^---\s*\n[\s\S]*?\n---/.test(content)) {
        throw new Error("content must begin with YAML front matter (---...---). See CYBER.md §3.");
      }

      const commitMsg = changelog
        ? `wiki: ${pagePath} — ${changelog}`
        : `wiki: update ${pagePath}`;

      let writeResult;
      try {
        writeResult = await writePage(cfg, pagePath, content, commitMsg);
      } catch (e) {
        if (e instanceof ConcurrentWriteError) {
          // Return this as a successful tool call with an informative message
          // rather than throwing — the LLM can read the result and retry.
          return toolText(
            `Write blocked: the page was modified concurrently (likely by a human ` +
            `editor in Obsidian pushing through Obsidian Git). Re-read '${pagePath}' ` +
            `with wiki_read, integrate the changes into your new content, and call ` +
            `wiki_write again.\n\nDetails: ${e.message}`,
          );
        }
        throw e;
      }

      // Append to _log.md. Best-effort: if the log is missing or the append
      // fails, we still succeed on the primary write. We retry once on a
      // concurrent-write error, since the log is a high-contention file
      // (every LLM write touches it).
      let logStatus = "log updated";
      const appendToLog = async (): Promise<void> => {
        const date = new Date().toISOString().slice(0, 10);
        const line = changelog
          ? `\n## [${date}] write | ${pagePath} | ${changelog}\n`
          : `\n## [${date}] write | ${pagePath} | (no changelog entry supplied)\n`;
        let existing = "";
        try {
          existing = (await readPage(cfg, "_log.md")).text;
        } catch (e) {
          if (e instanceof NotFoundError) {
            existing = "# Wiki Log\n\nAppend-only chronological record. Most recent at the bottom.\n";
          } else {
            throw e;
          }
        }
        const newLog = existing.endsWith("\n") ? existing + line : existing + "\n" + line;
        await writePage(cfg, "_log.md", newLog, `log: ${date} ${pagePath}`);
      };

      try {
        await appendToLog();
      } catch (e) {
        if (e instanceof ConcurrentWriteError) {
          // Someone else wrote to _log.md between our read and write. Retry
          // once — our line is append-only so merging is safe.
          try {
            await appendToLog();
          } catch (e2) {
            logStatus = `log append failed after retry: ${(e2 as Error).message}`;
          }
        } else {
          logStatus = `log append failed: ${(e as Error).message}`;
        }
      }

      return toolText(
        `Wrote ${pagePath} (blob sha ${writeResult.sha.slice(0, 7)}, commit ${writeResult.commitSha.slice(0, 7)}). ${logStatus}.`,
      );
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function toolText(text: string) {
  return { content: [{ type: "text", text }] };
}

// ---------- JSON-RPC router -------------------------------------------------

async function handleRpc(msg: JsonRpcRequest, env: Env): Promise<JsonRpcResult | JsonRpcError | null> {
  const id = msg.id ?? null;

  try {
    switch (msg.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER_INFO,
          },
        };

      case "notifications/initialized":
      case "notifications/cancelled":
        // Notifications get no response.
        return null;

      case "ping":
        return { jsonrpc: "2.0", id, result: {} };

      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: TOOLS } };

      case "tools/call": {
        const params = (msg.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
        if (!params.name) throw new Error("tools/call requires 'name'");
        const result = await handleToolCall(params.name, params.arguments ?? {}, env);
        return { jsonrpc: "2.0", id, result };
      }

      case "resources/list":
        return { jsonrpc: "2.0", id, result: { resources: [] } };

      case "prompts/list":
        return { jsonrpc: "2.0", id, result: { prompts: [] } };

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${msg.method}` },
        };
    }
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: (err as Error).message ?? "Internal error" },
    };
  }
}

// ---------- HTTP entrypoint -------------------------------------------------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // CORS preflight for browser-based MCP clients.
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Health check / landing page.
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        ok: true,
        server: SERVER_INFO,
        endpoint: "/mcp",
        transport: "streamable-http",
        tools: TOOLS.map((t) => t.name),
      });
    }

    if (url.pathname !== "/mcp") {
      return new Response("Not found", { status: 404 });
    }

    if (!authOk(req, env)) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="cyber-wiki"' },
      });
    }

    // Streamable HTTP: GET is used for server-initiated streams. We don't push
    // anything, so respond with 405. Claude's custom connector only POSTs.
    if (req.method === "GET") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return rpcError(null, -32700, "Parse error");
    }

    // A payload can be a single JSON-RPC message or a batch. Handle both.
    if (Array.isArray(payload)) {
      const responses = await Promise.all(
        payload.map((m) => handleRpc(m as JsonRpcRequest, env)),
      );
      const filtered = responses.filter((r): r is JsonRpcResult | JsonRpcError => r !== null);
      if (filtered.length === 0) return new Response(null, { status: 202, headers: corsHeaders() });
      return json(filtered);
    }

    const resp = await handleRpc(payload as JsonRpcRequest, env);
    if (resp === null) return new Response(null, { status: 202, headers: corsHeaders() });
    return json(resp);
  },
};

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Mcp-Session-Id",
  };
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function rpcError(id: string | number | null, code: number, message: string): Response {
  return json({ jsonrpc: "2.0", id, error: { code, message } }, 200);
}
