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
  String.raw`
CREATE TABLE projects(id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '');
CREATE TABLE note_meta(noteId TEXT PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE, tags TEXT NOT NULL DEFAULT '[]', projectId TEXT REFERENCES projects(id) ON DELETE SET NULL, inbox INTEGER NOT NULL DEFAULT 1, reminderAt INTEGER, notificationId TEXT);
INSERT INTO note_meta(noteId) SELECT id FROM notes;
CREATE TRIGGER notes_meta AFTER INSERT ON notes BEGIN INSERT INTO note_meta(noteId) VALUES(new.id); END;
CREATE TABLE actions(id TEXT PRIMARY KEY, noteId TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, text TEXT NOT NULL, due TEXT NOT NULL DEFAULT '', priority TEXT NOT NULL DEFAULT 'normal', done INTEGER NOT NULL DEFAULT 0, completedAt INTEGER);
CREATE TABLE versions(id INTEGER PRIMARY KEY AUTOINCREMENT, noteId TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, title TEXT NOT NULL, body TEXT NOT NULL, createdAt INTEGER NOT NULL);
CREATE TRIGGER notes_history BEFORE UPDATE OF title,body ON notes WHEN (old.title<>new.title OR old.body<>new.body) BEGIN
INSERT INTO versions(noteId,title,body,createdAt) SELECT old.id,old.title,old.body,CAST(strftime('%s','now') AS INTEGER)*1000 WHERE NOT EXISTS(SELECT 1 FROM versions WHERE noteId=old.id AND createdAt>CAST(strftime('%s','now') AS INTEGER)*1000-60000);
END;
CREATE TABLE note_links(sourceId TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,targetId TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,PRIMARY KEY(sourceId,targetId),CHECK(sourceId<>targetId));
CREATE TABLE templates(id TEXT PRIMARY KEY,name TEXT NOT NULL,body TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'note');
INSERT INTO templates VALUES('meeting','Meeting','# Agenda\n\n# Decisions\n\n# Action items\n','note');
CREATE TABLE plans(day TEXT PRIMARY KEY, priorities TEXT NOT NULL DEFAULT '', reflection TEXT NOT NULL DEFAULT '');
CREATE TABLE attachments(id TEXT PRIMARY KEY,noteId TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,name TEXT NOT NULL,mime TEXT NOT NULL,data TEXT NOT NULL,extracted TEXT NOT NULL DEFAULT '');
CREATE TABLE segments(id TEXT PRIMARY KEY,recordingId TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,start REAL NOT NULL,end REAL NOT NULL,text TEXT NOT NULL,CHECK(start>=0 AND end>start));
CREATE TABLE vault(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
CREATE INDEX actions_note ON actions(noteId,done);
CREATE INDEX versions_note ON versions(noteId,createdAt);
`,
];
export function ftsQuery(query: string) {
  return (query.match(/[\p{L}\p{N}]+/gu) ?? [])
    .map((w) => `"${w}"*`)
    .join(" AND ");
}
