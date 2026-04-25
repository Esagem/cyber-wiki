// src/test-helpers.ts
//
// Unit tests for the pure (no-GitHub) helpers — front matter parser/serializer,
// section parser, log parser, edit-application logic. Not bundled into the
// Worker; run with `npx tsx src/test-helpers.ts` for a quick local check
// before deploying.
//
// These tests are deliberately minimal — coverage of the wiki_edit and
// wiki_status_set integration paths is in the deploy-time smoke tests we run
// against a throwaway page in the live wiki.

import {
  bumpUpdatedField,
  decodeInlineList,
  encodeInlineList,
  encodeScalarValue,
  parseFrontMatter,
  reassemble,
  setScalarField,
  todayUtc,
} from "./frontmatter";
import {
  listTopLevelSections,
  parseSectionSpec,
  sliceSection,
  sliceSections,
} from "./sections";
import { parseLog, tail } from "./log";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function expect(name: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    failures.push(`✗ ${name}\n    expected: ${e}\n    actual:   ${a}`);
  }
}
function expectThrows(name: string, fn: () => unknown, msgIncludes?: string): void {
  try {
    fn();
    failed++;
    failures.push(`✗ ${name}: expected throw, got no throw`);
  } catch (e) {
    if (msgIncludes && !(e as Error).message.includes(msgIncludes)) {
      failed++;
      failures.push(`✗ ${name}: threw but message lacked '${msgIncludes}': ${(e as Error).message}`);
    } else {
      passed++;
    }
  }
}

// --- frontmatter ------------------------------------------------------------

const samplePage = `---
title: "Sample Page"
category: specs
tags: [a, b, c]
status: draft
confidence: medium
owner: shared
created: 2026-04-22
updated: 2026-04-23
---

# Sample Page

Body content here.
`;

const fm = parseFrontMatter(samplePage);
expect("fm hasFrontMatter", fm.hasFrontMatter, true);
expect("fm fmEndChar position", samplePage.slice(fm.fmEndChar, fm.fmEndChar + 1), "\n");
expect("fm body starts after fence", fm.body.startsWith("\n# Sample Page"), true);
expect("fm fields count", fm.fields.size, 8);
expect("fm tags inline", decodeInlineList(fm.fields.get("tags")!.rawInlineValue), ["a", "b", "c"]);

const noFm = parseFrontMatter("# Just a heading\nNo front matter here.\n");
expect("no fm detection", noFm.hasFrontMatter, false);

const malformed = parseFrontMatter("---\ntitle: x\n# never closes\n");
expect("malformed fm detection", malformed.hasFrontMatter, false);

// setScalarField: replace existing
const lines = setScalarField(fm.innerLines, fm.fields, "status", "active");
expect("setScalarField replaces value", lines.find((l) => l.startsWith("status:")), "status: active");

// setScalarField: append new
const linesAppend = setScalarField(fm.innerLines, fm.fields, "superseded_by", "specs/new.md");
expect("setScalarField appends new", linesAppend[linesAppend.length - 1], "superseded_by: specs/new.md");

// reassemble preserves body
const reassembled = reassemble(lines, fm.body);
expect("reassemble preserves body", reassembled.includes("# Sample Page\n\nBody content here.\n"), true);

// bumpUpdatedField
const bumped = bumpUpdatedField(samplePage);
expect("bumpUpdatedField sets today", bumped.includes(`updated: ${todayUtc()}`), true);
expect("bumpUpdatedField preserves body", bumped.includes("Body content here."), true);

// bumpUpdatedField on page without updated:
const noUpdated = `---\ntitle: x\nstatus: draft\n---\n\nBody.\n`;
expect("bumpUpdatedField no-op without updated:", bumpUpdatedField(noUpdated), noUpdated);

// inline list encoding round-trip
expect("encodeInlineList empty", encodeInlineList([]), "[]");
expect("encodeInlineList one", encodeInlineList(["x"]), "[x]");
expect("encodeInlineList multi", encodeInlineList(["a", "b"]), "[a, b]");
expect("decodeInlineList empty", decodeInlineList("[]"), []);
expect("decodeInlineList multi", decodeInlineList("[a, b, c]"), ["a", "b", "c"]);
expect("decodeInlineList not list", decodeInlineList("scalar"), null);

// scalar encoding: bare-safe stays bare, special chars get quoted
expect("encodeScalarValue bare", encodeScalarValue("active"), "active");
expect("encodeScalarValue date", encodeScalarValue("2026-04-25"), "2026-04-25");
expect("encodeScalarValue path", encodeScalarValue("specs/slice-1.md"), "specs/slice-1.md");
expect("encodeScalarValue space", encodeScalarValue("two words"), '"two words"');
expect("encodeScalarValue empty", encodeScalarValue(""), '""');

// --- sections ---------------------------------------------------------------

const longPage = `---
title: x
status: active
---

# Top

Intro text.

## Modes

How modes work.

### Quick

Fast mode.

### Standard

Slow mode.

## Tool catalog

Tools here.

### One

A.

### Two

B.

## Other

other content.
`;

const fmLong = parseFrontMatter(longPage);
const slice = sliceSection(fmLong.body, parseSectionSpec("Modes"));
expect("section Modes contains nested ###", slice!.includes("### Quick"), true);
expect("section Modes excludes next ##", slice!.includes("Tool catalog"), false);

const sliceLevel = sliceSection(fmLong.body, parseSectionSpec("## Modes"));
expect("section ## Modes matches level-2", sliceLevel !== null, true);

const noLevel = sliceSection(fmLong.body, parseSectionSpec("### Modes"));
expect("section ### Modes mismatch", noLevel, null);

const both = sliceSections(fmLong.body, [
  parseSectionSpec("Modes"),
  parseSectionSpec("Tool catalog"),
]);
expect("multi-section combined contains both", both.combined.includes("Modes") && both.combined.includes("Tool catalog"), true);
expect("multi-section divider", both.combined.includes("\n\n---\n\n"), true);

const partial = sliceSections(fmLong.body, [
  parseSectionSpec("Modes"),
  parseSectionSpec("Nonexistent"),
]);
expect("multi-section reports missing", partial.missing.length, 1);
expect("multi-section missing name", partial.missing[0].text, "Nonexistent");

expect("listTopLevelSections", listTopLevelSections(fmLong.body), ["Modes", "Tool catalog", "Other"]);

// Case-insensitive header match
const ciSlice = sliceSection(fmLong.body, parseSectionSpec("MODES"));
expect("case-insensitive header match", ciSlice !== null && ciSlice.includes("How modes work."), true);

// --- log parsing ------------------------------------------------------------

const logSample = `# Wiki Log

Some intro text.

---

## [2026-04-21] schema | initial scaffold | first entry
## [2026-04-22] write | foo.md | wrote foo
## [2026-04-22] edit | foo.md | edited foo
## [2026-04-23] status | bar.md | status: draft -> active
## [2026-04-23] delete | tmp/test.md | cleanup
## [2026-04-24] write | baz.md | wrote baz
`;

const entries = parseLog(logSample);
expect("parseLog count", entries.length, 6);
expect("parseLog first op", entries[0].op, "schema");
expect("parseLog last context", entries[entries.length - 1].context, "baz.md");

const newest3 = tail(entries, 3, {});
expect("tail newest first", newest3[0].context, "baz.md");
expect("tail count", newest3.length, 3);

const writes = tail(entries, 100, { ops: new Set(["write"]) });
expect("tail filtered by op", writes.length, 2);

const since = tail(entries, 100, { sinceDate: "2026-04-23" });
expect("tail filtered by date", since.length, 3);

// --- preview helper not exported, skip ---

// --- summary ----------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  for (const f of failures) console.log(f);
  process.exit(1);
}
