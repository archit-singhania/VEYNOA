import test from "node:test";
import assert from "node:assert/strict";
import {
  AIRequestError,
  retryAfter,
  retryPlan,
} from "../packages/domain/src/retry";
test("Retry-After handles seconds, dates and malicious values with a cap", () => {
  assert.equal(retryAfter("60", 0), 60000);
  assert.equal(retryAfter("Thu, 01 Jan 1970 00:01:00 GMT", 0), 60000);
  assert.equal(retryAfter("bad", 0), 0);
  assert.equal(retryAfter("999999", 0), 900000);
  assert.equal(retryAfter("-1", 0), 0);
});
test("permanent errors stop immediately; rate limits preserve the server delay", () => {
  assert.equal(
    retryPlan(new AIRequestError("Invalid", false), 0, 100).state,
    "failed",
  );
  assert.equal(
    retryPlan(new AIRequestError("Limit", true, 60000), 0, 100).nextAt,
    60100,
  );
  assert.equal(retryPlan(new Error("Network"), 4, 100).state, "failed");
});
test("user cancellation does not consume retry attempts", () => {
  const result = retryPlan(new AIRequestError("Paused", true, 0, true), 3, 100);
  assert.deepEqual(result, { state: "pending", attempts: 3, nextAt: 2100 });
});
