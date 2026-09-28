import test from "node:test";
import assert from "node:assert/strict";
import {
  cosine,
  dayKey,
  greeting,
  localSuggestions,
  related,
  retryDelay,
  shouldGreet,
  type Note,
} from "../packages/domain/src/index";
import { responses, requests } from "../packages/ai-contracts/src/index";
test("greetings cover midnight and daily preference", () => {
  assert.equal(greeting(0), "Still thinking?");
  assert.equal(greeting(6), "Good morning.");
  assert.equal(greeting(12), "Good afternoon.");
  assert.equal(greeting(17), "Good evening.");
  assert.equal(
    shouldGreet(
      { greeting: "daily", lastGreeting: "2026-09-28" },
      "2026-09-28",
    ),
    false,
  );
  assert.equal(
    shouldGreet({ greeting: "never", lastGreeting: "" }, "2026-09-28"),
    false,
  );
  assert.equal(dayKey(new Date(2026, 0, 2, 1).getTime()), "2026-01-02");
});
test("suggestions preserve source and support multiple labels", () => {
  assert.deepEqual(
    localSuggestions("I realized I should research this idea tomorrow.").map(
      (s) => s.kind,
    ),
    ["task", "journal", "idea"],
  );
  assert.deepEqual(localSuggestions("The sky is blue."), []);
});
test("cosine handles zero and mismatched dimensions", () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([0, 0], [1, 2]), 0);
  assert.equal(cosine([1], [1, 2]), 0);
  assert.equal(cosine([1, 0], [0, 1]), 0);
});
test("retrieval excludes archived notes and caps the context", () => {
  const notes = Array.from(
    { length: 20 },
    (_, i) =>
      ({
        id: String(i),
        body: "operating scheduler",
        title: "Operating systems",
        archived: i === 0,
      }) as Note,
  );
  assert.equal(related(notes, "operating systems", "1").length, 8);
  assert.ok(
    related(notes, "operating systems", "1").every(
      (x) => !["0", "1"].includes(x.note.id),
    ),
  );
});
test("retry backoff is bounded", () => {
  assert.equal(retryDelay(0), 2000);
  assert.equal(retryDelay(99), 300000);
});
test("contracts reject oversized input and invalid model data", () => {
  assert.equal(
    requests.analyze.safeParse({ text: "x".repeat(16001) }).success,
    false,
  );
  assert.equal(
    responses.analyze.safeParse({ kind: "invented" }).success,
    false,
  );
  assert.equal(
    requests.ask.safeParse({ question: "hi", sources: [] }).success,
    false,
  );
});
