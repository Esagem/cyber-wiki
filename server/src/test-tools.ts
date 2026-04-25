// src/test-tools.ts
//
// Integration tests for the tool functions, with the GitHub HTTP layer
// stubbed at the global `fetch` boundary. This exercises the real github.ts
// code paths (encoding, sha handling, concurrent-write detection) end-to-end.
//
// Run: `npx tsx src/test-tools.ts`. Not bundled into the Worker.

import { todayUtc } from "./frontmatter";

// --- In-memory mock GitHub (intercepts at fetch) ---------------------------

interface MockFile {
  text: string;
  sha: string;
}

class MockRepo {
  files = new Map<string, MockFile>();
  shaCounter = 0;
  /** When set, the next write to this path returns 409 once. */
  forceConflict: string | null = null;

  set(path: string, text: string): void {
    this.shaCounter++;
    this.files.set(path, { text, sha: `sha${this.shaCounter}` });
  }
  read(path: string): MockFile | undefined {
    return this.files.get(path);
  }
  delete(path: string): boolean {
    return this.files.delete(path);
  }
}

const repo = new MockRepo();

function b64encode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}
function b64decode(s: string): string {
  return Buffer.from(s, "base64").toString("utf8");
}

const cfg = {
  owner: "test-owner",
  repo: "test-repo",
  branch: "main",
  wikiRoot: "wiki",
  token: "test-token",
  commitAuthorName: "test-bot",
  commitAuthorEmail: "bot@example.com",
};

// Match the URL patterns github.ts uses.
const CONTENTS_RE = new RegExp(
  `^https://api\\.github\\.com/repos/${cfg.owner}/${cfg.repo}/contents/(.+?)(?:\\?ref=.*)?$`,
);
const TREE_RE = new RegExp(
  `^https://api\\.github\\.com/repos/${cfg.owner}/${cfg.repo}/git/trees/`,
);
const BRANCH_RE = new RegExp(
  `^https://api\\.github\\.com/repos/${cfg.owner}/${cfg.repo}/branches/${cfg.branch}$`,
);

const wikiPrefix = `${cfg.wikiRoot}/`;

function relativeFromFullPath(fullPath: string): string {
  if (!fullPath.startsWith(wikiPrefix)) return fullPath;
  return fullPath.slice(wikiPrefix.length);
}
function fullFromRelative(rel: string): string {
  return `${cfg.wikiRoot}/${rel}`;
}

const realFetch = globalThis.fetch;

function mockResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input.toString();
  const method = (init?.method ?? "GET").toUpperCase();

  // Branch endpoint: returns a fake commit sha → tree sha.
  if (BRANCH_RE.test(url)) {
    return mockResponse(200, { commit: { commit: { tree: { sha: "tree-sha" } } } });
  }

  // Tree endpoint: synthesize from repo.files.
  if (TREE_RE.test(url)) {
    const tree = [...repo.files.keys()].map((rel) => ({
      path: fullFromRelative(rel),
      mode: "100644",
      type: "blob",
      sha: repo.read(rel)!.sha,
      url: "",
    }));
    return mockResponse(200, { sha: "tree-sha", url: "", tree, truncated: false });
  }

  // Contents endpoint: GET (read), PUT (create/update), DELETE.
  const m = url.match(CONTENTS_RE);
  if (m) {
    const fullPath = decodeURIComponent(m[1]);
    const rel = relativeFromFullPath(fullPath);

    if (method === "GET") {
      const f = repo.read(rel);
      if (!f) return mockResponse(404, { message: "Not Found" });
      return mockResponse(200, {
        name: rel.split("/").pop(),
        path: fullPath,
        sha: f.sha,
        size: f.text.length,
        content: b64encode(f.text),
        encoding: "base64",
      });
    }

    if (method === "PUT") {
      const body = JSON.parse(init!.body as string) as {
        message: string;
        content: string;
        sha?: string;
      };
      const existing = repo.read(rel);

      // Optimistic concurrency: if file exists and either no sha was supplied
      // or the supplied sha doesn't match, return 409.
      if (existing && body.sha !== existing.sha) {
        return mockResponse(409, { message: "sha mismatch" });
      }
      // Forced conflict for one shot.
      if (repo.forceConflict === rel) {
        repo.forceConflict = null;
        return mockResponse(409, { message: "forced conflict" });
      }

      repo.set(rel, b64decode(body.content));
      const f = repo.read(rel)!;
      return mockResponse(200, {
        content: { sha: f.sha },
        commit: { sha: `commit-${f.sha}` },
      });
    }

    if (method === "DELETE") {
      const body = JSON.parse(init!.body as string) as { sha: string };
      const existing = repo.read(rel);
      if (!existing) return mockResponse(404, { message: "Not Found" });
      if (body.sha !== existing.sha) return mockResponse(409, { message: "sha mismatch" });
      repo.delete(rel);
      return mockResponse(200, { commit: { sha: `commit-del-${rel}` } });
    }
  }

  throw new Error(`unmocked fetch: ${method} ${url}`);
}) as typeof fetch;

function restore(): void {
  globalThis.fetch = realFetch;
}

// Now import tools (after fetch is patched) and reset the github cache.
import { invalidateCache } from "./github";
import {
  toolEdit,
  toolLogTail,
  toolRead,
  toolReadMany,
  toolStatusSet,
} from "./tools";

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
  invalidateCache();
  repo.files.clear();
  repo.shaCounter = 0;
  repo.forceConflict = null;
  try {
    await fn();
    passed++;
  } catch (e) {
    failed++;
    failures.push(`✗ ${name}: ${(e as Error).message}\n${(e as Error).stack ?? ""}`);
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}
function assertEq(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

const samplePage = `---
title: "Test Page"
category: specs
tags: [a, b]
status: draft
confidence: medium
owner: shared
created: 2026-04-22
updated: 2026-04-22
---

# Test Page

## Modes

Modes content here.

### Quick

Fast mode notes.

## Tool catalog

Catalog content.
`;

async function main(): Promise<void> {
  // --- wiki_edit ---

  await check("wiki_edit: single edit succeeds, updated bumped, log appended", async () => {
    repo.set("test-page.md", samplePage);
    const r = await toolEdit(cfg, {
      page_path: "test-page.md",
      edits: [{ old_str: "Modes content here.", new_str: "Updated modes content." }],
    });
    const newText = repo.read("test-page.md")!.text;
    assert(newText.includes("Updated modes content."), "edit applied");
    assert(newText.includes(`updated: ${todayUtc()}`), "updated bumped");
    assert(repo.read("_log.md")!.text.includes("edit | test-page.md"), "log appended");
    const struct = (r as any).structured;
    assertEq(struct.edits_applied, 1, "edits_applied");
  });

  await check("wiki_edit: zero matches → page unchanged", async () => {
    repo.set("test-page.md", samplePage);
    const before = repo.read("test-page.md")!.text;
    const r = await toolEdit(cfg, {
      page_path: "test-page.md",
      edits: [{ old_str: "this string is not in the page", new_str: "x" }],
    });
    const after = repo.read("test-page.md")!.text;
    assertEq(after, before, "page unchanged on miss");
    const text = (r as any).content[0].text;
    assert(text.includes("not found"), `error message includes 'not found': got ${text}`);
  });

  await check("wiki_edit: multi-edit transactional — 2nd edit fails, no commit", async () => {
    repo.set("test-page.md", samplePage);
    const before = repo.read("test-page.md")!.text;
    const r = await toolEdit(cfg, {
      page_path: "test-page.md",
      edits: [
        { old_str: "Modes content here.", new_str: "First edit applied." },
        { old_str: "this is missing", new_str: "x" },
      ],
    });
    const after = repo.read("test-page.md")!.text;
    assertEq(after, before, "page unchanged when batch contains a miss");
    const text = (r as any).content[0].text;
    assert(text.includes("edit 2"), `error names edit 2: got ${text}`);
  });

  await check("wiki_edit: sequential edits — each applies post-previous", async () => {
    repo.set("test-page.md", samplePage);
    await toolEdit(cfg, {
      page_path: "test-page.md",
      edits: [
        { old_str: "Modes content here.", new_str: "FIRST EDIT" },
        { old_str: "FIRST EDIT", new_str: "SECOND EDIT" },
      ],
    });
    const after = repo.read("test-page.md")!.text;
    assert(after.includes("SECOND EDIT"), "final text reflects last sequential edit");
    assert(!after.includes("FIRST EDIT"), "intermediate string was overwritten");
  });

  await check("wiki_edit: multiple matches → page unchanged", async () => {
    const dup = `---
title: x
status: draft
updated: 2026-04-22
---

repeat
repeat
`;
    repo.set("test-page.md", dup);
    const r = await toolEdit(cfg, {
      page_path: "test-page.md",
      edits: [{ old_str: "repeat", new_str: "x" }],
    });
    const text = (r as any).content[0].text;
    assert(text.includes("matches 2 times"), `error mentions count: got ${text}`);
    assertEq(repo.read("test-page.md")!.text, dup, "page unchanged");
  });

  await check("wiki_edit: front-matter overlap → rejected", async () => {
    repo.set("test-page.md", samplePage);
    const before = repo.read("test-page.md")!.text;
    const r = await toolEdit(cfg, {
      page_path: "test-page.md",
      edits: [{ old_str: "status: draft", new_str: "status: active" }],
    });
    const text = (r as any).content[0].text;
    assert(text.includes("front matter"), `error mentions front matter: got ${text}`);
    assert(text.includes("wiki_status_set"), `error redirects to wiki_status_set: got ${text}`);
    assertEq(repo.read("test-page.md")!.text, before, "page unchanged");
  });

  await check("wiki_edit: empty edits array → rejected", async () => {
    repo.set("test-page.md", samplePage);
    let threw = false;
    try {
      await toolEdit(cfg, { page_path: "test-page.md", edits: [] });
    } catch (e) {
      threw = (e as Error).message.includes("empty");
    }
    assert(threw, "empty edits array throws");
  });

  await check("wiki_edit: concurrent modification → 409 surfaced", async () => {
    repo.set("test-page.md", samplePage);
    repo.forceConflict = "test-page.md";
    const r = await toolEdit(cfg, {
      page_path: "test-page.md",
      edits: [{ old_str: "Modes content here.", new_str: "Updated." }],
    });
    const text = (r as any).content[0].text;
    assert(
      text.includes("page modified since last read"),
      `expected concurrency message: got ${text}`,
    );
  });

  // --- wiki_read with section ---

  await check("wiki_read: no section → bit-identical to today", async () => {
    repo.set("test-page.md", samplePage);
    const r = await toolRead(cfg, { page_path: "test-page.md" });
    assertEq((r as any).content[0].text, samplePage, "raw text returned unchanged");
  });

  await check("wiki_read: section returns just that section + nested subs", async () => {
    repo.set("test-page.md", samplePage);
    const r = await toolRead(cfg, { page_path: "test-page.md", section: "Modes" });
    const out = (r as any).content[0].text;
    assert(out.includes("## Modes"), "includes the matched header");
    assert(out.includes("### Quick"), "includes nested subsections");
    assert(!out.includes("Tool catalog"), "excludes the next same-level section");
  });

  await check("wiki_read: multi-section with divider", async () => {
    repo.set("test-page.md", samplePage);
    const r = await toolRead(cfg, {
      page_path: "test-page.md",
      section: ["Modes", "Tool catalog"],
    });
    const out = (r as any).content[0].text;
    assert(out.includes("## Modes") && out.includes("## Tool catalog"), "both sections present");
    assert(out.includes("---"), "divider present");
  });

  await check("wiki_read: missing section returns helpful error", async () => {
    repo.set("test-page.md", samplePage);
    const r = await toolRead(cfg, { page_path: "test-page.md", section: "Nonexistent" });
    const out = (r as any).content[0].text;
    assert(out.includes("not found"), "error mentions not found");
    assert(out.includes("Modes") && out.includes("Tool catalog"), "lists available sections");
  });

  await check("wiki_read: include_front_matter:false strips YAML", async () => {
    repo.set("test-page.md", samplePage);
    const r = await toolRead(cfg, {
      page_path: "test-page.md",
      section: "Modes",
      include_front_matter: false,
    });
    const out = (r as any).content[0].text;
    assert(!out.includes("title:"), "front matter stripped");
  });

  // --- wiki_read_many ---

  await check("wiki_read_many: explicit page_paths returns all", async () => {
    for (let i = 0; i < 3; i++) {
      repo.set(`p${i}.md`, `---\ntitle: p${i}\n---\n\nbody ${i}\n`);
    }
    const r = await toolReadMany(cfg, { page_paths: ["p0.md", "p1.md", "p2.md"] });
    const struct = (r as any).structured;
    assertEq(Object.keys(struct.pages).length, 3, "3 pages returned");
    assertEq(Object.keys(struct.errors).length, 0, "no errors");
    assertEq(struct.truncated, false, "not truncated");
  });

  await check("wiki_read_many: category mode", async () => {
    for (let i = 0; i < 3; i++) {
      repo.set(`competitive/x${i}.md`, `---\ntitle: x${i}\n---\n\nbody ${i}\n`);
    }
    repo.set("other.md", `---\ntitle: other\n---\n\nbody\n`);
    const r = await toolReadMany(cfg, { category: "competitive" });
    const struct = (r as any).structured;
    assertEq(Object.keys(struct.pages).length, 3, "3 competitive pages");
    assert(!("other.md" in struct.pages), "other.md excluded");
  });

  await check("wiki_read_many: partial failure", async () => {
    repo.set("p1.md", "---\ntitle: p1\n---\n\nbody\n");
    const r = await toolReadMany(cfg, { page_paths: ["p1.md", "missing.md"] });
    const struct = (r as any).structured;
    assertEq(Object.keys(struct.pages).length, 1, "1 page found");
    assertEq(Object.keys(struct.errors).length, 1, "1 error");
    assert("missing.md" in struct.errors, "missing.md is in errors");
  });

  await check("wiki_read_many: max_pages truncation", async () => {
    for (let i = 0; i < 8; i++) repo.set(`p${i}.md`, `---\ntitle: p${i}\n---\n\nbody\n`);
    const r = await toolReadMany(cfg, {
      page_paths: ["p0.md", "p1.md", "p2.md", "p3.md", "p4.md", "p5.md", "p6.md", "p7.md"],
      max_pages: 5,
    });
    const struct = (r as any).structured;
    assertEq(Object.keys(struct.pages).length, 5, "truncated to 5");
    assertEq(struct.truncated, true, "truncated flag set");
  });

  await check("wiki_read_many: max_pages > 25 rejected", async () => {
    let threw = false;
    try {
      await toolReadMany(cfg, { page_paths: ["a.md"], max_pages: 30 });
    } catch (e) {
      threw = (e as Error).message.includes("25");
    }
    assert(threw, "max_pages>25 rejected");
  });

  await check("wiki_read_many: both page_paths and category rejected", async () => {
    let threw = false;
    try {
      await toolReadMany(cfg, { page_paths: ["a.md"], category: "x" });
    } catch (e) {
      threw = (e as Error).message.includes("not both");
    }
    assert(threw, "both modes rejected");
  });

  // --- wiki_status_set ---

  await check("wiki_status_set: status flip updates only FM, body unchanged", async () => {
    repo.set("test-page.md", samplePage);
    const bodyBefore = samplePage.split("---\n").slice(2).join("---\n");
    await toolStatusSet(cfg, { page_path: "test-page.md", status: "active" });
    const after = repo.read("test-page.md")!.text;
    assert(after.includes("status: active"), "status updated");
    assert(after.includes(`updated: ${todayUtc()}`), "updated bumped");
    const bodyAfter = after.split("---\n").slice(2).join("---\n");
    assertEq(bodyAfter, bodyBefore, "body unchanged");
    assert(repo.read("_log.md")!.text.includes("status | test-page.md"), "log appended with status op");
  });

  await check("wiki_status_set: invalid status rejected", async () => {
    repo.set("test-page.md", samplePage);
    let threw = false;
    try {
      await toolStatusSet(cfg, { page_path: "test-page.md", status: "bogus" });
    } catch (e) {
      threw = (e as Error).message.includes("seed, draft, active");
    }
    assert(threw, "invalid status rejected with valid list");
  });

  await check("wiki_status_set: tags.add idempotent", async () => {
    repo.set("test-page.md", samplePage);
    await toolStatusSet(cfg, { page_path: "test-page.md", tags: { add: ["a"] } }); // 'a' already present
    const after = repo.read("test-page.md")!.text;
    assert(after.includes("tags: [a, b]"), "tags unchanged when adding existing tag");
  });

  await check("wiki_status_set: tags.add new + remove", async () => {
    repo.set("test-page.md", samplePage);
    await toolStatusSet(cfg, {
      page_path: "test-page.md",
      tags: { add: ["c"], remove: ["b"] },
    });
    const after = repo.read("test-page.md")!.text;
    assert(after.includes("tags: [a, c]"), `tags updated: got ${after.match(/tags:.*/)?.[0]}`);
  });

  await check("wiki_status_set: tags.replace", async () => {
    repo.set("test-page.md", samplePage);
    await toolStatusSet(cfg, {
      page_path: "test-page.md",
      tags: { replace: ["x", "y"] },
    });
    const after = repo.read("test-page.md")!.text;
    assert(after.includes("tags: [x, y]"), "tags replaced wholesale");
  });

  await check("wiki_status_set: tags.replace with add rejected", async () => {
    repo.set("test-page.md", samplePage);
    let threw = false;
    try {
      await toolStatusSet(cfg, {
        page_path: "test-page.md",
        tags: { replace: ["x"], add: ["y"] },
      });
    } catch (e) {
      threw = (e as Error).message.includes("mutually exclusive");
    }
    assert(threw, "replace+add rejected");
  });

  await check("wiki_status_set: superseded_by without superseded status rejected", async () => {
    repo.set("test-page.md", samplePage);
    const r = await toolStatusSet(cfg, {
      page_path: "test-page.md",
      superseded_by: "specs/new.md",
    });
    const text = (r as any).content[0].text;
    assert(text.includes("status=superseded"), `expected gating error: got ${text}`);
  });

  await check("wiki_status_set: superseded_by with status=superseded works", async () => {
    repo.set("test-page.md", samplePage);
    await toolStatusSet(cfg, {
      page_path: "test-page.md",
      status: "superseded",
      superseded_by: "specs/new.md",
    });
    const after = repo.read("test-page.md")!.text;
    assert(after.includes("status: superseded"), "status set");
    assert(after.includes("superseded_by: specs/new.md"), "superseded_by set");
  });

  await check("wiki_status_set: page without front matter rejected", async () => {
    repo.set("plain.md", "# Just a heading\n\nNo front matter.\n");
    const r = await toolStatusSet(cfg, { page_path: "plain.md", status: "active" });
    const text = (r as any).content[0].text;
    assert(text.includes("no YAML front matter"), `expected fm error: got ${text}`);
  });

  await check("wiki_status_set: appends new field when not present", async () => {
    const noOwner = `---
title: x
status: draft
updated: 2026-04-22
---

body
`;
    repo.set("test-page.md", noOwner);
    await toolStatusSet(cfg, { page_path: "test-page.md", owner: "eli" });
    const after = repo.read("test-page.md")!.text;
    assert(after.includes("owner: eli"), "owner field appended");
  });

  await check("wiki_status_set: concurrent modification → 409 surfaced", async () => {
    repo.set("test-page.md", samplePage);
    repo.forceConflict = "test-page.md";
    const r = await toolStatusSet(cfg, { page_path: "test-page.md", status: "active" });
    const text = (r as any).content[0].text;
    assert(
      text.includes("page modified since last read"),
      `expected concurrency message: got ${text}`,
    );
  });

  // --- wiki_log_tail ---

  await check("wiki_log_tail: defaults to 20 newest", async () => {
    const lines = ["# Log\n"];
    for (let i = 0; i < 30; i++) {
      const day = String((i % 30) + 1).padStart(2, "0");
      lines.push(`## [2026-04-${day}] write | p${i}.md | wrote p${i}\n`);
    }
    repo.set("_log.md", lines.join(""));
    const r = await toolLogTail(cfg, {});
    const struct = (r as any).structured as Array<{ context: string }>;
    assertEq(struct.length, 20, "20 entries returned");
    assertEq(struct[0].context, "p29.md", "newest first");
  });

  await check("wiki_log_tail: op filter", async () => {
    const log = `# Log
## [2026-04-23] write | a.md | wrote a
## [2026-04-23] edit | a.md | edited a
## [2026-04-24] status | a.md | status update
`;
    repo.set("_log.md", log);
    const r = await toolLogTail(cfg, { op: "edit" });
    const struct = (r as any).structured as Array<{ op: string }>;
    assertEq(struct.length, 1, "one edit entry");
    assertEq(struct[0].op, "edit", "op is edit");
  });

  await check("wiki_log_tail: since filter", async () => {
    const log = `# Log
## [2026-04-22] write | a.md | x
## [2026-04-23] write | b.md | y
## [2026-04-24] write | c.md | z
`;
    repo.set("_log.md", log);
    const r = await toolLogTail(cfg, { since: "2026-04-23" });
    const struct = (r as any).structured as Array<{ context: string }>;
    assertEq(struct.length, 2, "two entries on/after 2026-04-23");
  });

  await check("wiki_log_tail: n>100 rejected", async () => {
    let threw = false;
    try {
      await toolLogTail(cfg, { n: 150 });
    } catch (e) {
      threw = (e as Error).message.includes("100");
    }
    assert(threw, "n>100 rejected");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    for (const f of failures) console.log(f);
    restore();
    process.exit(1);
  }
  restore();
}

main().catch((e) => {
  console.error(e);
  restore();
  process.exit(1);
});
