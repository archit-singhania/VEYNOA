import test from "node:test";
import assert from "node:assert/strict";
import { infer } from "../apps/mobile/src/services/ai";
import { defaults } from "../packages/domain/src/index";
test("local-only blocks inference before fetch", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("Unexpected request");
  };
  try {
    await assert.rejects(
      () =>
        infer(
          "analyze",
          { text: "private" },
          {
            ...defaults,
            installationId: "test",
            gatewayUrl: "https://example.com",
          },
        ),
      /Cloud AI is off/,
    );
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("cloud client rejects insecure external gateway", async () => {
  await assert.rejects(
    () =>
      infer(
        "analyze",
        { text: "private" },
        {
          ...defaults,
          localOnly: false,
          installationId: "test",
          gatewayUrl: "http://example.com",
        },
      ),
    /HTTPS/,
  );
});
