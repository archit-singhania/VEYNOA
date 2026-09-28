export const fullTextSchema = String.raw`
CREATE VIRTUAL TABLE notes_fts USING fts5(title, body, content='notes', content_rowid='rowid');
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN INSERT INTO notes_fts(rowid,title,body) VALUES(new.rowid,new.title,new.body); END;
CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN INSERT INTO notes_fts(notes_fts,rowid,title,body) VALUES('delete',old.rowid,old.title,old.body); END;
CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN INSERT INTO notes_fts(notes_fts,rowid,title,body) VALUES('delete',old.rowid,old.title,old.body); INSERT INTO notes_fts(rowid,title,body) VALUES(new.rowid,new.title,new.body); END;
`;
export const migrations = [
  String.raw`
CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'note', createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, pinned INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE analyses (noteId TEXT PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE, revision INTEGER NOT NULL, data TEXT NOT NULL);
CREATE TABLE recordings (id TEXT PRIMARY KEY, noteId TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, uri TEXT NOT NULL, createdAt INTEGER NOT NULL, duration REAL NOT NULL, transcribed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE jobs (id TEXT PRIMARY KEY, noteId TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, type TEXT NOT NULL, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, nextAt INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL DEFAULT 'pending', error TEXT);
CREATE TABLE embeddings (noteId TEXT PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE, revision INTEGER NOT NULL, model TEXT NOT NULL, vector TEXT NOT NULL);
CREATE TABLE canvas_nodes (id TEXT PRIMARY KEY, noteId TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, text TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, parentId TEXT);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX jobs_due ON jobs(state,nextAt);
CREATE INDEX notes_updated ON notes(archived,pinned,updatedAt);
`,
  String.raw`
ALTER TABLE notes ADD COLUMN deletedAt INTEGER;
CREATE INDEX notes_deleted ON notes(deletedAt);
`,
];
export function ftsQuery(query: string) {
  return (query.match(/[\p{L}\p{N}]+/gu) ?? [])
    .map((w) => `"${w}"*`)
    .join(" AND ");
}
