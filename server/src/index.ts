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
// only if you want a public server (not recommended, since the mutating tools
// are exposed).

import { type GitHubConfig } from "./github";
import {
  toolDelete,
  toolEdit,
  toolIndex,
  toolList,
  toolLogTail,
  toolRead,
  toolReadMany,
  toolSearch,
  toolStatusSet,
  toolWrite,
  type TextResult,
} from "./tools";

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
const SERVER_INFO = { name: "cyber-wiki", version: "0.2.0" };

// ---------- Tool catalog ----------------------------------------------------

const TOOLS = [
  {
    name: "wiki_index",
    description:
      "Return the master index of the wiki (_index.md). Read this first for any non-trivial query.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "wiki_list",
    description:
      "List all wiki pages, optionally filtered by category folder (e.g. 'specs', 'competitive', 'engagements/EXAMPLE-acme-2026-q2').",
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
    description:
      "Read a wiki page by path. Pass `section` to return just one (or several) sections; pass `include_front_matter: false` to strip the YAML block. Default behavior with no extras returns the full page exactly as wiki_read always has.",
    inputSchema: {
      type: "object",
      properties: {
        page_path: {
          type: "string",
          description: "Path relative to the wiki root, e.g. 'specs/slice-1.md'.",
        },
        section: {
          description:
            "Optional section name to extract. String for one section, array for several. " +
            "Use the bare header text ('Modes') for any-level match, or prefix with `#`s ('## Modes') to pin the level. " +
            "Subsections are included.",
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        include_front_matter: {
          type: "boolean",
          description:
            "Whether to include the YAML front matter block in the returned text. Default true.",
          default: true,
        },
      },
      required: ["page_path"],
      additionalProperties: false,
    },
  },
  {
    name: "wiki_read_many",
    description:
      "Batched read of N pages. Provide `page_paths` (explicit list) OR `category` (folder), not both. Optional `section` filter applies to every page. Partial failures land in `errors`. Default max 10 pages, hard cap 25.",
    inputSchema: {
      type: "object",
      properties: {
        page_paths: {
          type: "array",
          items: { type: "string" },
          description: "Explicit list of page paths to read.",
        },
        category: {
          type: "string",
          description:
            "Folder prefix; reads every page under it. Mutually exclusive with page_paths.",
        },
        section: {
          description:
            "Optional section filter (same semantics as wiki_read). Pages where the section is missing land in `errors`.",
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        include_front_matter: {
          type: "boolean",
          description: "Whether to include each page's YAML front matter. Default true.",
          default: true,
        },
        max_pages: {
          type: "number",
          description: "Cap on pages returned. Default 10, hard cap 25.",
          default: 10,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "wiki_search",
    description:
      "Full-text BM25 search across all wiki pages. Use content terms (technology, CVE IDs, finding IDs, asset names), not meta words like 'page' or 'wiki'. Returns top matching pages with snippets.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query. Use content terms, not meta words like 'page' or 'wiki'.",
        },
        max_results: { type: "number", description: "Max results (default 10).", default: 10 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "wiki_write",
    description:
      "Create or replace an entire page. Content must include YAML front matter per CYBER.md conventions. Use `wiki_edit` for sub-page changes — `wiki_write` is for new pages or rewrites of more than ~50% of a page.",
    inputSchema: {
      type: "object",
      properties: {
        page_path: { type: "string", description: "Path relative to the wiki root." },
        content: {
          type: "string",
          description: "Full markdown content, including YAML front matter.",
        },
        changelog_entry: {
          type: "string",
          description:
            "One-line description for the _log.md entry. Auto-generated if omitted.",
        },
      },
      required: ["page_path", "content"],
      additionalProperties: false,
    },
  },
  {
    name: "wiki_edit",
    description:
      "Patch a page by replacing exact strings. Edits are applied in order and are transactional — a single uniqueness/overlap failure rolls back the whole batch. Refuses any edit that overlaps the YAML front matter (use `wiki_status_set`). Auto-bumps `updated:` and appends to `_log.md`.",
    inputSchema: {
      type: "object",
      properties: {
        page_path: { type: "string", description: "Path relative to the wiki root." },
        edits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              old_str: {
                type: "string",
                description:
                  "Exact string to replace. Must match exactly once at the time this edit is applied (after earlier edits in the batch).",
              },
              new_str: {
                type: "string",
                description: "Replacement string. Empty string deletes the matched text.",
              },
            },
            required: ["old_str", "new_str"],
            additionalProperties: false,
          },
          minItems: 1,
        },
        changelog_entry: {
          type: "string",
          description:
            "One-line description for the _log.md entry. Auto-generated if omitted.",
        },
      },
      required: ["page_path", "edits"],
      additionalProperties: false,
    },
  },
  {
    name: "wiki_status_set",
    description:
      "Mutate a page's YAML front matter only. Validates against the CYBER.md §4 schema (status, confidence vocabularies; superseded_by gating; mutually exclusive tag operations). Body content is untouched. Auto-bumps `updated:` and appends to `_log.md`.",
    inputSchema: {
      type: "object",
      properties: {
        page_path: { type: "string", description: "Path relative to the wiki root." },
        status: {
          type: "string",
          enum: ["seed", "draft", "active", "mature", "planned", "retired", "superseded"],
        },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        owner: { type: "string", description: "Free-text owner field." },
        superseded_by: {
          type: "string",
          description:
            "Path to the newer page. Requires status=superseded (in this call or already set).",
        },
        tags: {
          type: "object",
          properties: {
            add: { type: "array", items: { type: "string" } },
            remove: { type: "array", items: { type: "string" } },
            replace: {
              type: "array",
              items: { type: "string" },
              description: "Mutually exclusive with add/remove.",
            },
          },
          additionalProperties: false,
        },
        changelog_entry: { type: "string", description: "Auto-generated if omitted." },
      },
      required: ["page_path"],
      additionalProperties: false,
    },
  },
  {
    name: "wiki_log_tail",
    description:
      "Recent _log.md entries as structured records, optionally filtered by op or date. Cheap orientation tool — prefer this over reading the whole _log.md.",
    inputSchema: {
      type: "object",
      properties: {
        n: { type: "number", description: "Max entries (default 20, hard cap 100).", default: 20 },
        op: {
          description: "Filter by op type. String for one, array for several.",
          oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
        },
        since: {
          type: "string",
          description: "ISO date YYYY-MM-DD. Only entries on or after this date.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "wiki_delete",
    description:
      "Permanently delete a wiki page. By default refuses unless the path looks like a test artifact (starts with 'smoke-test', 'test-', or under 'tmp/'). Pass force=true to override. For stale design material, prefer `wiki_status_set(status='retired')` instead.",
    inputSchema: {
      type: "object",
      properties: {
        page_path: { type: "string" },
        reason: {
          type: "string",
          description: "Why this page is being deleted. Required. Lands in the commit message.",
        },
        force: {
          type: "boolean",
          description:
            "Bypass the test-artifact safety check. Use only when sure deletion is correct.",
          default: false,
        },
      },
      required: ["page_path", "reason"],
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
  return timingSafeEqual(match[1], env.MCP_BEARER_TOKEN);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- Dispatch --------------------------------------------------------

type ToolFn = (cfg: GitHubConfig, args: Record<string, unknown>) => Promise<TextResult>;

const DISPATCH: Record<string, ToolFn> = {
  wiki_index: (cfg) => toolIndex(cfg),
  wiki_list: toolList,
  wiki_read: toolRead,
  wiki_read_many: toolReadMany,
  wiki_search: toolSearch,
  wiki_write: toolWrite,
  wiki_edit: toolEdit,
  wiki_status_set: toolStatusSet,
  wiki_log_tail: toolLogTail,
  wiki_delete: toolDelete,
};

async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  env: Env,
): Promise<unknown> {
  const fn = DISPATCH[name];
  if (!fn) throw new Error(`Unknown tool: ${name}`);
  return fn(gh(env), args);
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
