import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { migrations, ftsQuery, fullTextSchema } from "../apps/mobile/src/database/schema";
test("real SQLite migrations, FTS maintenance, revision guard and cascades", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const migration of migrations) db.exec(migration);
  db.exec(fullTextSchema);
  db.prepare(
    "INSERT INTO notes(id,title,body,createdAt,updatedAt) VALUES(?,?,?,?,?)",
  ).run("one", "OS idea", "Explore scheduler", 1, 1);
  const search = () =>
    db
      .prepare(
        "SELECT n.id FROM notes n JOIN notes_fts f ON n.rowid=f.rowid WHERE notes_fts MATCH ?",
      )
      .all(ftsQuery("scheduler"));
  assert.equal(search().length, 1);
  db.prepare("UPDATE notes SET body=?,revision=1 WHERE id=?").run(
    "Explore memory",
    "one",
  );
  assert.equal(search().length, 0);
  db.prepare(
    "INSERT INTO analyses(noteId,revision,data) SELECT id,revision,? FROM notes WHERE id=? AND revision=?",
  ).run("{}", "one", 0);
  assert.equal(db.prepare("SELECT * FROM analyses").all().length, 0);
  db.prepare("INSERT INTO jobs(id,noteId,type,payload) VALUES(?,?,?,?)").run(
    "job",
    "one",
    "analyze",
    "{}",
  );
  db.prepare("DELETE FROM notes WHERE id=?").run("one");
  assert.equal(db.prepare("SELECT * FROM jobs").all().length, 0);
  db.close();
});
test("FTS quoting neutralizes syntax and supports Unicode", () => {
  assert.equal(
    ftsQuery('hello OR " -- café'),
    '"hello"* AND "OR"* AND "café"*',
  );
  assert.equal(ftsQuery("!@#$"), "");
});
test("transcript transaction rollback leaves recording retryable", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  migrations.forEach((x) => db.exec(x));
  db.exec(
    "INSERT INTO notes(id,createdAt,updatedAt) VALUES('n',1,1); INSERT INTO recordings(id,noteId,uri,createdAt,duration) VALUES('r','n','file',1,2)",
  );
  db.exec("BEGIN");
  db.exec(
    "UPDATE notes SET body='transcript' WHERE id='n'; UPDATE recordings SET transcribed=1 WHERE id='r'",
  );
  db.exec("ROLLBACK");
  assert.equal(
    db.prepare("SELECT body FROM notes WHERE id='n'").get()?.body,
    "",
  );
  assert.equal(
    db.prepare("SELECT transcribed FROM recordings WHERE id='r'").get()
      ?.transcribed,
    0,
  );
  db.close();
});
