import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { Directory, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import {
  defaults,
  type Note,
  type Recording,
  type Settings,
  type CanvasNode,
} from "@veynoa/domain";
import { analysis, type Analysis } from "@veynoa/ai-contracts";
import { migrations, ftsQuery, fullTextSchema } from "./schema";

export type Job = {
  id: string;
  noteId: string;
  type: "analyze" | "transcribe";
  payload: string;
  attempts: number;
  nextAt: number;
  state: string;
  error: string | null;
};
let database: Promise<SQLite.SQLiteDatabase> | undefined;
export const audioDirectory = () => new Directory(Paths.document, "recordings");
async function db() {
  if (!database) database = SQLite.openDatabaseAsync("veynoa.db");
  return database;
}
function toNote(row: Note): Note {
  return {
    ...row,
    pinned: !!row.pinned,
    archived: !!row.archived,
    completed: !!row.completed,
  };
}
export const repository = {
  async init() {
    const d = await db();
    await d.execAsync("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
    const row = await d.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    for (let i = row?.user_version ?? 0; i < migrations.length; i++)
      await d.withTransactionAsync(async () => {
        await d.execAsync(migrations[i]);
        if (i === 0 && Platform.OS !== "web") await d.execAsync(fullTextSchema);
        await d.execAsync(`PRAGMA user_version=${i + 1}`);
      });
    await d.runAsync("UPDATE jobs SET state='pending' WHERE state='running'");
  },
  async list() {
    return (
      await (
        await db()
      ).getAllAsync<Note>(
        "SELECT * FROM notes ORDER BY pinned DESC, updatedAt DESC",
      )
    ).map(toNote);
  },
  async get(id: string) {
    const n = await (
      await db()
    ).getFirstAsync<Note>("SELECT * FROM notes WHERE id=?", id);
    return n ? toNote(n) : null;
  },
  async create(kind: Note["kind"] = "note", body = "", title = "") {
    const now = Date.now();
    const n: Note = {
      id: randomUUID(),
      title,
      body,
      kind,
      createdAt: now,
      updatedAt: now,
      pinned: false,
      archived: false,
      completed: false,
      revision: 0,
    };
    await (
      await db()
    ).runAsync(
      "INSERT INTO notes(id,title,body,kind,createdAt,updatedAt) VALUES(?,?,?,?,?,?)",
      n.id,
      title,
      body,
      kind,
      now,
      now,
    );
    return n;
  },
  async save(n: Note) {
    await (
      await db()
    ).runAsync(
      "UPDATE notes SET title=?,body=?,kind=?,updatedAt=?,pinned=?,archived=?,completed=?,revision=? WHERE id=?",
      n.title,
      n.body,
      n.kind,
      n.updatedAt,
      +n.pinned,
      +n.archived,
      +n.completed,
      n.revision,
      n.id,
    );
  },
  async remove(id: string) {
    await (await db()).runAsync("DELETE FROM notes WHERE id=?", id);
  },
  async search(query: string) {
    if (Platform.OS === "web") {
      const words = (query.match(/[\p{L}\p{N}]+/gu) ?? []).map((w) =>
        w.toLowerCase(),
      );
      if (!words.length) return [];
      return (await this.list())
        .filter(
          (n) =>
            !n.archived &&
            words.every((w) =>
              (n.title + " " + n.body).toLowerCase().includes(w),
            ),
        )
        .slice(0, 50);
    }
    const q = ftsQuery(query);
    if (!q) return [];
    return (
      await (
        await db()
      ).getAllAsync<Note>(
        "SELECT n.* FROM notes n JOIN notes_fts f ON n.rowid=f.rowid WHERE notes_fts MATCH ? AND n.archived=0 ORDER BY rank LIMIT 50",
        q,
      )
    ).map(toNote);
  },
  async settings(): Promise<Settings> {
    const r = await (
      await db()
    ).getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key='preferences'",
    );
    if (r) return { ...defaults, ...JSON.parse(r.value) };
    const s = { ...defaults, installationId: randomUUID() };
    await this.setSettings(s);
    return s;
  },
  async setSettings(settings: Settings) {
    await (
      await db()
    ).runAsync(
      "INSERT OR REPLACE INTO settings(key,value) VALUES('preferences',?)",
      JSON.stringify(settings),
    );
  },
  async analysis(id: string): Promise<Analysis | null> {
    const r = await (
      await db()
    ).getFirstAsync<{ data: string }>(
      "SELECT a.data FROM analyses a JOIN notes n ON a.noteId=n.id AND a.revision=n.revision WHERE a.noteId=?",
      id,
    );
    return r ? analysis.parse(JSON.parse(r.data)) : null;
  },
  async analyses() {
    const rows = await (
      await db()
    ).getAllAsync<{ noteId: string; data: string }>(
      "SELECT a.noteId,a.data FROM analyses a JOIN notes n ON a.noteId=n.id AND a.revision=n.revision",
    );
    return Object.fromEntries(
      rows.map((r) => [r.noteId, analysis.parse(JSON.parse(r.data))]),
    );
  },
  async saveAnalysis(id: string, revision: number, data: Analysis) {
    await (
      await db()
    ).runAsync(
      "INSERT OR REPLACE INTO analyses(noteId,revision,data) SELECT id,revision,? FROM notes WHERE id=? AND revision=?",
      JSON.stringify(data),
      id,
      revision,
    );
  },
  async addRecording(r: Recording) {
    await (
      await db()
    ).runAsync(
      "INSERT INTO recordings(id,noteId,uri,createdAt,duration) VALUES(?,?,?,?,?)",
      r.id,
      r.noteId,
      r.uri,
      r.createdAt,
      r.duration,
    );
  },
  async recordings(noteId: string) {
    return (await db()).getAllAsync<Recording>(
      "SELECT * FROM recordings WHERE noteId=? ORDER BY createdAt",
      noteId,
    );
  },
  async markTranscribed(id: string) {
    await (
      await db()
    ).runAsync("UPDATE recordings SET transcribed=1 WHERE id=?", id);
  },
  async saveCapture(r: Recording, transcribe: boolean) {
    const d = await db();
    await d.withTransactionAsync(async () => {
      await this.addRecording(r);
      if (transcribe)
        await this.enqueue({
          id: `transcribe:${r.id}`,
          noteId: r.noteId,
          type: "transcribe",
          payload: JSON.stringify({ recordingId: r.id }),
        });
    });
  },
  async applyTranscript(note: Note, recordingId: string) {
    const d = await db();
    await d.withTransactionAsync(async () => {
      await this.save(note);
      await this.markTranscribed(recordingId);
    });
  },
  async enqueue(j: Pick<Job, "id" | "noteId" | "type" | "payload">) {
    await (
      await db()
    ).runAsync(
      "INSERT OR IGNORE INTO jobs(id,noteId,type,payload) VALUES(?,?,?,?)",
      j.id,
      j.noteId,
      j.type,
      j.payload,
    );
  },
  async jobs() {
    return (await db()).getAllAsync<Job>("SELECT * FROM jobs ORDER BY rowid");
  },
  async jobState(
    id: string,
    state: string,
    attempts = 0,
    nextAt = 0,
    error: string | null = null,
  ) {
    await (
      await db()
    ).runAsync(
      "UPDATE jobs SET state=?,attempts=?,nextAt=?,error=? WHERE id=?",
      state,
      attempts,
      nextAt,
      error,
      id,
    );
  },
  async deleteJob(id: string) {
    await (await db()).runAsync("DELETE FROM jobs WHERE id=?", id);
  },
  async retryJobs() {
    await (
      await db()
    ).runAsync(
      "UPDATE jobs SET state='pending',attempts=0,nextAt=0,error=NULL WHERE state='failed'",
    );
  },
  async saveEmbedding(
    noteId: string,
    revision: number,
    model: string,
    vector: number[],
  ) {
    await (
      await db()
    ).runAsync(
      "INSERT OR REPLACE INTO embeddings(noteId,revision,model,vector) SELECT id,revision,?,? FROM notes WHERE id=? AND revision=?",
      model,
      JSON.stringify(vector),
      noteId,
      revision,
    );
  },
  async embeddings(model: string) {
    const rows = await (
      await db()
    ).getAllAsync<{ noteId: string; vector: string }>(
      "SELECT e.noteId,e.vector FROM embeddings e JOIN notes n ON n.id=e.noteId AND n.revision=e.revision WHERE e.model=? AND n.archived=0",
      model,
    );
    return rows.map((r) => ({
      noteId: r.noteId,
      vector: JSON.parse(r.vector) as number[],
    }));
  },
  async canvas(noteId: string) {
    return (await db()).getAllAsync<CanvasNode>(
      "SELECT * FROM canvas_nodes WHERE noteId=?",
      noteId,
    );
  },
  async saveNode(n: CanvasNode) {
    await (
      await db()
    ).runAsync(
      "INSERT OR REPLACE INTO canvas_nodes(id,noteId,text,x,y,parentId) VALUES(?,?,?,?,?,?,?)",
      n.id,
      n.noteId,
      n.text,
      n.x,
      n.y,
      n.parentId,
    );
  },
  async exportData() {
    const d = await db();
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: await this.list(),
      analyses: await this.analyses(),
      recordings: await d.getAllAsync("SELECT * FROM recordings"),
      canvas: await d.getAllAsync("SELECT * FROM canvas_nodes"),
    };
  },
  async clear() {
    if (Platform.OS !== "web") {
      const directory = audioDirectory();
      if (directory.exists) directory.delete();
    }
    const d = await db();
    await d.withTransactionAsync(async () => {
      await d.runAsync("DELETE FROM notes");
      await d.runAsync("DELETE FROM settings");
    });
  },
};
