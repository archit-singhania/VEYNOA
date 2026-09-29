import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { migrations } from "../apps/mobile/src/database/schema";
import {
  asOf,
  textChanges,
  knowledgeGraph,
  graphClusters,
  resurface,
  scheduleReview,
  validatePlan,
  canComplete,
  dailyActivity,
} from "../packages/domain/src/intelligence";
import type { Note } from "../packages/domain/src";
import { createIntelligence } from "../apps/mobile/src/database/intelligenceCore";
import type { SQLiteDatabase } from "expo-sqlite";
function harness() {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys=ON");
  migrations.forEach((m) => d.exec(m));
  d.exec(
    "INSERT INTO notes(id,title,body,createdAt,updatedAt) VALUES('a','A','source',1,1)",
  );
  let id = 0;
  const adapter = {
    getAllAsync: async (sql: string, ...params: any[]) =>
      d.prepare(sql).all(...params),
    getFirstAsync: async (sql: string, ...params: any[]) =>
      d.prepare(sql).get(...params) || null,
    runAsync: async (sql: string, ...params: any[]) =>
      d.prepare(sql).run(...params),
    withTransactionAsync: async (f: () => Promise<void>) => {
      d.exec("BEGIN");
      try {
        await f();
        d.exec("COMMIT");
      } catch (e) {
        d.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return {
    d,
    api: createIntelligence(
      async () => adapter as unknown as SQLiteDatabase,
      () => String(++id),
    ),
  };
}
test("actual goal repository creates no action until approval, gates dependencies and records audit events", async () => {
  const { d, api } = harness();
  await api.propose("Release", ["a"], ["Research", "Build"]);
  let state = await api.load();
  assert.equal(d.prepare("SELECT count(*) n FROM actions").get()!.n, 0);
  const [first, second] = state.steps;
  await api.transition(second.id, "approve");
  await assert.rejects(
    () => api.transition(second.id, "complete"),
    /dependencies/,
  );
  await api.transition(first.id, "approve");
  await assert.rejects(() => api.transition(first.id, "approve"), /Already/);
  await api.transition(first.id, "complete");
  await api.transition(second.id, "complete");
  state = await api.load();
  assert.ok(state.steps.every((s) => s.state === "done"));
  assert.equal(state.events.length, 5);
  assert.equal(
    d.prepare("SELECT count(*) n FROM actions WHERE done=1").get()!.n,
    2,
  );
  d.close();
});
test("approval reversal preserves edited actions and deleted sources cannot be approved", async () => {
  const { d, api } = harness();
  await api.propose("Release", ["a"], ["Step"]);
  let step = (await api.load()).steps[0];
  await api.transition(step.id, "approve");
  await api.transition(step.id, "revert");
  assert.equal(d.prepare("SELECT count(*) n FROM actions").get()!.n, 0);
  await api.transition(step.id, "approve");
  d.exec("UPDATE actions SET due='2026-10-01'");
  await assert.rejects(() => api.transition(step.id, "revert"), /edited/);
  assert.equal(d.prepare("SELECT count(*) n FROM actions").get()!.n, 1);
  d.exec("UPDATE notes SET deletedAt=10 WHERE id='a'");
  await assert.rejects(() => api.transition(step.id, "complete"), /Restore/);
  d.close();
});
test("actual decision, study and evidence repositories persist data and replace indexed locators", async () => {
  const { d, api } = harness();
  await api.decision(
    {
      noteId: "a",
      question: "Which?",
      choice: "A",
      alternatives: "B",
      assumptions: "Speed",
    },
    [],
  );
  await api.card("a", "What?", "Source");
  let state = await api.load();
  await api.outcome(state.decisions[0].id, "Observed result");
  await api.review(state.cards[0].id, 2);
  const row = {
    noteId: "a",
    attachmentId: null,
    recordingId: null,
    kind: "text",
    locator: "page 1",
    text: "source",
    vector: null,
    model: null,
    sourceRevision: 0,
  };
  await api.evidence([row]);
  await api.evidence([{ ...row, text: "replacement" }]);
  state = await api.load();
  assert.equal(state.evidence.length, 1);
  assert.equal(state.evidence[0].text, "replacement");
  assert.equal(state.decisions[0].outcome, "Observed result");
  assert.equal(state.cards[0].reviews, 1);
  d.exec("UPDATE notes SET revision=1 WHERE id='a'");
  assert.equal((await api.load()).evidence.length, 0);
  await assert.rejects(() =>
    api.decision(
      {
        noteId: "a",
        question: "Q",
        choice: "A",
        alternatives: "",
        assumptions: "",
      },
      ["missing"],
    ),
  );
  d.close();
});
const note = (id: string, body = ""): Note => ({
  id,
  title: id,
  body,
  kind: "note",
  createdAt: 100,
  updatedAt: 100,
  pinned: false,
  archived: false,
  completed: false,
  revision: 0,
});
test("historical cutoff excludes future knowledge and resolves equal timestamps by snapshot ID", () => {
  const snapshots = [
    { id: 1, noteId: "a", revision: 0, title: "a", body: "old", at: 100 },
    { id: 2, noteId: "a", revision: 1, title: "a", body: "new", at: 200 },
    { id: 3, noteId: "b", revision: 0, title: "b", body: "later", at: 300 },
    { id: 4, noteId: "a", revision: 2, title: "a", body: "newest", at: 200 },
  ];
  assert.deepEqual(asOf(snapshots, 99), []);
  assert.equal(asOf(snapshots, 150)[0].body, "old");
  assert.equal(asOf(snapshots, 200)[0].body, "newest");
  assert.equal(asOf(snapshots, 200).length, 1);
  assert.deepEqual(textChanges("one\ntwo", "two\nthree"), {
    added: ["three"],
    removed: ["one"],
  });
});
test("knowledge graph preserves evidence and distinguishes generated entities from accepted links", () => {
  const graph = knowledgeGraph(
    [note("a", "[[b]]"), note("b"), note("c")],
    [{ noteId: "a", tags: '["work"]', projectId: "p" }],
    [{ id: "p", name: "Project" }],
    [{ sourceId: "a", targetId: "missing" }],
    { a: ["Acme"] },
  );
  assert.ok(graph.edges.some((e) => e.inferred && e.evidence[0] === "a"));
  assert.ok(
    graph.edges.some((e) => e.label === "wiki reference" && e.target === "b"),
  );
  assert.ok(!graph.edges.some((e) => e.target === "missing"));
  assert.equal(graphClusters(graph.nodes, graph.edges).length, 2);
});
test("resurfacing suppresses snoozed and archived notes and explains context matches", () => {
  const notes = [
    note("a", "launch prototype"),
    note("b", "launch"),
    { ...note("c", "launch"), archived: true },
  ];
  const ranked = resurface(
    notes,
    [],
    [{ noteId: "b", rating: 1, snoozeUntil: 1001 }],
    "launch",
    "",
    1000,
  );
  assert.deepEqual(
    ranked.map((r) => r.note.id),
    ["a"],
  );
  assert.match(ranked[0].reasons.join(" "), /launch/);
  assert.equal(
    resurface(
      notes,
      [],
      [{ noteId: "b", rating: 1, snoozeUntil: 1001 }],
      "launch",
      "",
      1002,
    )[0].note.id,
    "b",
  );
});
test("spaced repetition uses ten-minute lapses and bounded ease without accepting invalid grades", () => {
  const c = { intervalDays: 0, ease: 2.5, reviews: 0, lapses: 0 };
  assert.equal(scheduleReview(c, 0, 0).dueAt, 600000);
  assert.equal(scheduleReview(c, 2, 0).dueAt, 86400000);
  assert.equal(scheduleReview(c, 3, 0).dueAt, 4 * 86400000);
  assert.equal(scheduleReview({ ...c, ease: 1.3 }, 0).ease, 1.3);
  assert.throws(() => scheduleReview(c, 4));
});
test("goal dependencies reject cycles, missing steps and duplicate IDs and gate completion", () => {
  const a = { id: "a", dependencies: [], state: "approved" },
    b = { id: "b", dependencies: ["a"], state: "approved" };
  assert.equal(validatePlan([a, b]), true);
  assert.equal(canComplete(b, [a, b]), false);
  assert.equal(canComplete(b, [{ ...a, state: "done" }, b]), true);
  assert.throws(() => validatePlan([{ ...a, dependencies: ["b"] }, b]));
  assert.throws(() => validatePlan([b]));
  assert.throws(() => validatePlan([a, a]));
});
test("dashboard day buckets include their drilldown sources", () => {
  const at = new Date(2026, 8, 29, 12).getTime();
  const rows = dailyActivity([{ ...note("a"), createdAt: at }], 3, at);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[2].noteIds, ["a"]);
  assert.deepEqual(rows[0].noteIds, []);
});
test("migration records observed history without backdating legacy content and cascades private derivatives", () => {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys=ON");
  migrations.slice(0, 3).forEach((m) => d.exec(m));
  d.exec(
    "INSERT INTO notes(id,title,body,createdAt,updatedAt) VALUES('a','A','legacy',1,1)",
  );
  d.exec(migrations[3]);
  assert.ok(Number(d.prepare("SELECT at FROM memory_snapshots").get()!.at) > 1);
  d.exec(
    "UPDATE notes SET body='new',revision=1,updatedAt=2000000000000 WHERE id='a'",
  );
  assert.equal(
    d.prepare("SELECT count(*) n FROM memory_snapshots").get()!.n,
    2,
  );
  d.exec("UPDATE notes SET pinned=1 WHERE id='a'");
  assert.equal(
    d.prepare("SELECT count(*) n FROM memory_snapshots").get()!.n,
    2,
  );
  d.exec(
    "INSERT INTO study_cards(id,noteId,question,answer,sourceRevision,dueAt) VALUES('c','a','q','a',1,1); INSERT INTO study_reviews VALUES('r','c',2,1); INSERT INTO recommendation_feedback VALUES('a',1,0,1); INSERT INTO evidence_chunks VALUES('e','a',NULL,NULL,'text','line 1','new',NULL,NULL,1,1)",
  );
  d.exec("UPDATE notes SET deletedAt=3 WHERE id='a'");
  assert.equal(d.prepare("SELECT count(*) n FROM study_cards").get()!.n, 1);
  d.exec("DELETE FROM notes WHERE id='a'");
  for (const table of [
    "memory_snapshots",
    "study_cards",
    "study_reviews",
    "recommendation_feedback",
    "evidence_chunks",
  ])
    assert.equal(d.prepare(`SELECT count(*) n FROM ${table}`).get()!.n, 0);
  d.close();
});
