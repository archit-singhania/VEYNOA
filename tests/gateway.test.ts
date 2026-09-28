import test from "node:test";
import assert from "node:assert/strict";
import worker, { type Env,withDeadline } from "../services/ai-gateway/src/index";
test('provider deadline rejects stalled work',async()=>{await assert.rejects(()=>withDeadline(new Promise(()=>{}),5),/Provider timeout/);});
const id = "11111111-1111-4111-8111-111111111111";
const makeEnv = (output: unknown): Env => ({
  AI: { run: async () => output },
  INSTALL_LIMITER: { limit: async () => ({ success: true }) },
  IP_LIMITER: { limit: async () => ({ success: true }) },
  ALLOWED_ORIGINS: "http://localhost:8081",
  LLM_MODEL: "test",
});
const request = (path: string, payload: unknown) =>
  new Request("https://test/v1/" + path, {
    method: "POST",
    headers: { "X-Installation-Id": id, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
test("gateway validates requests before inference", async () => {
  let called = false;
  const env = makeEnv({});
  env.AI.run = async () => {
    called = true;
    return {};
  };
  const result = await worker.fetch(request("analyze", { text: "" }), env);
  assert.equal(result.status, 400);
  assert.equal(called, false);
});
test("gateway enforces IP limits even with valid installation", async () => {
  const env = makeEnv({});
  env.IP_LIMITER.limit = async () => ({ success: false });
  assert.equal(
    (await worker.fetch(request("analyze", { text: "hello" }), env)).status,
    429,
  );
});
test("gateway rejects fabricated citations", async () => {
  const result = await worker.fetch(
    request("ask", {
      question: "What?",
      sources: [{ id: "one", title: "Note", text: "Evidence" }],
    }),
    makeEnv({
      response: JSON.stringify({ answer: "Answer", sourceIds: ["invented"] }),
    }),
  );
  assert.equal(result.status, 502);
});
test("gateway returns validated grounded answer with no-store", async () => {
  const result = await worker.fetch(
    request("ask", {
      question: "What?",
      sources: [{ id: "one", title: "Note", text: "Evidence" }],
    }),
    makeEnv({
      response: JSON.stringify({ answer: "Evidence", sourceIds: ["one"] }),
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await result.json(), {
    answer: "Evidence",
    sourceIds: ["one"],
  });
});
test("gateway rejects disallowed browser origins and unknown routes", async () => {
  assert.equal(
    (
      await worker.fetch(
        new Request("https://test/v1/analyze", {
          headers: { Origin: "https://untrusted.example" },
        }),
        makeEnv({}),
      )
    ).status,
    403,
  );
  assert.equal(
    (await worker.fetch(request("unknown", {}), makeEnv({}))).status,
    404,
  );
});
test("transcription uses the validated base64 audio payload", async () => {
  const result = await worker.fetch(
    request("transcribe", { audio: "YXVkaW8=" }),
    makeEnv({ text: "A thought" }),
  );
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { text: "A thought" });
});
test("health check reports readiness without inference", async () => {
  const env = makeEnv({});
  env.AI.run = async () => {
    throw new Error("Should not infer");
  };
  const result = await worker.fetch(new Request("https://test/v1/health"), env);
  assert.equal(result.status, 200);
  assert.equal(((await result.json()) as { ready: boolean }).ready, true);
  assert.ok(result.headers.get("X-Request-Id"));
});
test("limiter failures fail closed and rate limits include Retry-After", async () => {
  const env = makeEnv({});
  env.IP_LIMITER.limit = async () => {
    throw new Error("Offline");
  };
  assert.equal(
    (await worker.fetch(request("analyze", { text: "hello" }), env)).status,
    503,
  );
  env.IP_LIMITER.limit = async () => ({ success: false });
  const limited = await worker.fetch(
    request("analyze", { text: "hello" }),
    env,
  );
  assert.equal(limited.headers.get("Retry-After"), "60");
});
test("gateway rejects mixed embedding dimensions and wrong content type", async () => {
  const bad = await worker.fetch(
    request("embed", { texts: ["one", "two"] }),
    makeEnv({ data: [[1, 2], [1]] }),
  );
  assert.equal(bad.status, 502);
  const req = new Request("https://test/v1/analyze", {
    method: "POST",
    headers: { "X-Installation-Id": id },
    body: "hello",
  });
  assert.equal((await worker.fetch(req, makeEnv({}))).status, 415);
});
