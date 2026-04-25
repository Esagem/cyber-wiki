# Changelog

## 0.2.0 — 2026-04-25

Five new tools, doubling the catalog from six to eleven. Backwards compatibility preserved — the existing tools' behavior is unchanged for callers that don't pass new optional parameters.

### Added

- **`wiki_edit`** — Patch a page by replacing exact strings. Multi-edit transactional (a single uniqueness or front-matter-overlap failure rolls back the whole batch). Refuses any edit that overlaps the YAML front matter; routes the caller to `wiki_status_set` instead. Auto-bumps the `updated:` field and appends to `_log.md`.
- **`wiki_read_many`** — Batched read of N pages by explicit list or by `category=`. Optional `section=` filter applies to every page. Partial-failure tolerated: missing pages or sections land in `errors`, the rest in `pages`. Default cap 10, hard cap 25.
- **`wiki_status_set`** — Mutate page front matter only. Validates against the CYBER.md §4 vocabularies (status, confidence). Idempotent `tags.add` / `tags.remove`; `tags.replace` is mutually exclusive with the additive ops. `superseded_by` requires `status=superseded`. Body content is never touched.
- **`wiki_log_tail`** — Recent `_log.md` entries as structured records, optionally filtered by op type or `since` date. Default 20 entries, hard cap 100.

### Changed

- **`wiki_read`** gained two optional parameters: `section` (string or string array — extracts just that section, including nested subsections) and `include_front_matter` (default `true`). Default behavior with no extras is bit-identical to the previous version.

### Internal

- Extracted shared helpers used by both old and new tools: `parseFrontMatter`, `reassemble`, `setScalarField`, `bumpUpdatedField`, `appendToLog`, markdown section parser, log parser/tail. The optimistic-concurrency path in `writePage` already lived in `github.ts`; new mutating tools route through it.
- Test suites in `src/test-helpers.ts` (pure-helper unit tests) and `src/test-tools.ts` (tool integration tests with `fetch` mocked at the HTTP boundary). 75 tests total, all green. Run with `npx tsx src/test-helpers.ts && npx tsx src/test-tools.ts`.
