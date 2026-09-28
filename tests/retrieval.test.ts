import test from "node:test";
import assert from "node:assert/strict";
import type { Note } from "../packages/domain/src/index";
import { hybridRank, relevantExcerpt } from "../packages/domain/src/retrieval";
const note = (id: string, body: string, archived = false) =>
  ({ id, title: "", body, archived, updatedAt: 0 }) as Note;
test("hybrid retrieval retains useful keyword matches without embeddings", () => {
  const rows = [
    note("1", "scheduler design"),
    note("2", "machine intelligence"),
    note("3", "scheduler", true),
  ];
  assert.deepEqual(
    hybridRank(rows, "scheduler", [{ id: "2", score: 0.8 }]).map((n) => n.id),
    ["1", "2"],
  );
});
test("relevant excerpt finds evidence beyond the beginning of a long note", () => {
  const body =
    "Unrelated introduction. ".repeat(150) +
    "\n\nThe scheduler uses priority queues.\n\nUnrelated conclusion.";
  assert.equal(
    relevantExcerpt(body, "scheduler queues"),
    "The scheduler uses priority queues.",
  );
  assert.equal(relevantExcerpt(body, "unmatched").length, 2000);
});
