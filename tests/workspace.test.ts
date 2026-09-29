import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { migrations } from "../apps/mobile/src/database/schema";
import {
  wikiTargets,
  dueTime,
  replaceSelection,
} from "../packages/domain/src/workspace";
import {
  deriveVaultKey,
  sealVault,
  openVault,
  vaultSalt,
} from "../apps/mobile/src/services/vaultCrypto";
import { requests, responses } from "../packages/ai-contracts/src";
import type { Note } from "../packages/domain/src";
function database() {
  const d = new DatabaseSync(":memory:");
  d.exec("PRAGMA foreign_keys=ON");
  migrations.forEach((m) => d.exec(m));
  d.exec(
    "INSERT INTO notes(id,title,body,createdAt,updatedAt) VALUES('a','Alpha','Original',1,1),('b','Beta','Other',2,2)",
  );
  return d;
}
test("workspace migration enrolls notes in inbox and preserves tags across kinds", () => {
  const d = database();
  assert.equal(
    d.prepare("SELECT count(*) n FROM note_meta WHERE inbox=1").get()?.n,
    2,
  );
  d.exec(
    `UPDATE note_meta SET tags='["work","ideas"]',inbox=0 WHERE noteId='a'; UPDATE notes SET kind='task' WHERE id='a'`,
  );
  assert.equal(
    d.prepare("SELECT tags FROM note_meta WHERE noteId='a'").get()?.tags,
    '["work","ideas"]',
  );
  d.close();
});
test("history preserves original content and throttles rapid autosaves", () => {
  const d = database();
  d.exec(
    "UPDATE notes SET body='Changed' WHERE id='a'; UPDATE notes SET body='Changed again' WHERE id='a'",
  );
  assert.equal(
    d.prepare("SELECT body FROM versions WHERE noteId='a'").get()?.body,
    "Original",
  );
  assert.equal(d.prepare("SELECT count(*) n FROM versions").get()?.n, 1);
  d.close();
});
test("project removal preserves notes; note purge cascades relationships and actions", () => {
  const d = database();
  d.exec(
    "INSERT INTO projects VALUES('p','Launch','Description');UPDATE note_meta SET projectId='p' WHERE noteId='a';INSERT INTO actions(id,noteId,text) VALUES('t','a','Do it');INSERT INTO note_links VALUES('a','b');DELETE FROM projects WHERE id='p'",
  );
  assert.equal(
    d.prepare("SELECT projectId FROM note_meta WHERE noteId='a'").get()
      ?.projectId,
    null,
  );
  assert.throws(() => d.exec("INSERT INTO note_links VALUES('a','a')"));
  d.exec("DELETE FROM notes WHERE id='a'");
  assert.equal(d.prepare("SELECT count(*) n FROM actions").get()?.n, 0);
  assert.equal(d.prepare("SELECT count(*) n FROM note_links").get()?.n, 0);
  d.close();
});
test("transcript segments reject reversed times and cascade with recordings", () => {
  const d = database();
  d.exec(
    "INSERT INTO recordings(id,noteId,uri,createdAt,duration) VALUES('r','a','file',1,10)",
  );
  assert.throws(() =>
    d.exec("INSERT INTO segments VALUES('s','r',5,2,'Invalid')"),
  );
  d.exec(
    "INSERT INTO segments VALUES('s','r',0,4,'Speech');DELETE FROM recordings WHERE id='r'",
  );
  assert.equal(d.prepare("SELECT count(*) n FROM segments").get()?.n, 0);
  d.close();
});
test("wiki links resolve IDs and unambiguous titles without guessing duplicate titles", () => {
  const notes = [
    { id: "a", title: "Alpha" },
    { id: "b", title: "Beta" },
    { id: "c", title: "Beta" },
  ] as Note[];
  assert.deepEqual(
    wikiTargets("[[Alpha]] [[Beta]] [[b]] [[missing]] [[Alpha]]", notes),
    ["a", "b"],
  );
});
test("reminder parser rejects past, malformed and calendar-overflow dates", () => {
  assert.throws(() => dueTime("2027-02-30 14:00"));
  assert.throws(() => dueTime("2020-01-01 01:00"));
  assert.throws(() => dueTime("tomorrow"));
  assert.equal(new Date(dueTime("2099-12-01 14:30")).getHours(), 14);
});
test("formatting preserves text outside a selected span", () => {
  assert.equal(
    replaceSelection("one two three", 4, 7, "**", "**"),
    "one **two** three",
  );
});
test("rewrite and timestamp contracts reject unsupported modes and backwards segments", () => {
  assert.equal(
    requests.rewrite.safeParse({ text: "hello", mode: "clarify" }).success,
    true,
  );
  assert.equal(
    requests.rewrite.safeParse({ text: "hello", mode: "execute" }).success,
    false,
  );
  assert.equal(
    responses.transcribe.safeParse({
      text: "hello",
      segments: [{ start: 2, end: 1, text: "hello" }],
    }).success,
    false,
  );
});
test("vault round trip authenticates ciphertext and rejects a wrong key or tampering", async () => {
  const salt = randomBytes(16);
  const key = await deriveVaultKey("a synthetic test passphrase", salt);
  const sealed = sealVault(
    JSON.stringify([{ title: "Private title", body: "Private body" }]),
    key,
    salt,
    randomBytes(12),
  );
  assert.equal(sealed.includes("Private"), false);
  assert.deepEqual(vaultSalt(sealed), new Uint8Array(salt));
  assert.match(openVault(sealed, key), /Private body/);
  assert.throws(() => openVault(sealed, randomBytes(32)));
  const damaged = JSON.parse(sealed);
  damaged.ciphertext =
    (damaged.ciphertext[0] === "a" ? "b" : "a") + damaged.ciphertext.slice(1);
  assert.throws(() => openVault(JSON.stringify(damaged), key));
  const next = sealVault("same", key, salt, randomBytes(12));
  assert.notEqual(next, sealed);
  key.fill(0);
});
