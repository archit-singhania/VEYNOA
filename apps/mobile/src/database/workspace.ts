import { randomUUID } from "expo-crypto";
import { db } from "./repository";
import type { Kind } from "@veynoa/domain";
import { validDate } from "@veynoa/domain/src/workspace";
export type Meta = {
  noteId: string;
  tags: string;
  projectId: string | null;
  inbox: number;
  reminderAt: number | null;
  notificationId: string | null;
};
export type Project = { id: string; name: string; description: string };
export type Action = {
  id: string;
  noteId: string;
  text: string;
  due: string;
  priority: string;
  done: number;
  completedAt: number | null;
};
export type Version = {
  id: number;
  noteId: string;
  title: string;
  body: string;
  createdAt: number;
};
export type Template = { id: string; name: string; body: string; kind: Kind };
export type Attachment = {
  id: string;
  noteId: string;
  name: string;
  mime: string;
  data: string;
  extracted: string;
};
export type Segment = {
  id: string;
  recordingId: string;
  start: number;
  end: number;
  text: string;
};
export const workspace = {
  async recordingInbox() {
    return (await db()).getAllAsync<{
      id: string;
      noteId: string;
      duration: number;
      title: string;
    }>(
      "SELECT r.id,r.noteId,r.duration,n.title FROM recordings r JOIN notes n ON n.id=r.noteId WHERE n.deletedAt IS NULL AND n.archived=0 AND r.transcribed=0 ORDER BY r.createdAt DESC",
    );
  },
  async meta() {
    return (await db()).getAllAsync<Meta>(
      "SELECT m.* FROM note_meta m JOIN notes n ON n.id=m.noteId WHERE n.deletedAt IS NULL",
    );
  },
  async organize(
    id: string,
    tags: string[],
    projectId: string | null,
    inbox: boolean,
  ) {
    await (
      await db()
    ).runAsync(
      "UPDATE note_meta SET tags=?,projectId=?,inbox=? WHERE noteId=?",
      JSON.stringify(
        [
          ...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)),
        ].slice(0, 30),
      ),
      projectId,
      +inbox,
      id,
    );
  },
  async reminder(id: string, at: number | null, notification: string | null) {
    await (
      await db()
    ).runAsync(
      "UPDATE note_meta SET reminderAt=?,notificationId=? WHERE noteId=?",
      at,
      notification,
      id,
    );
  },
  async projects() {
    return (await db()).getAllAsync<Project>(
      "SELECT * FROM projects ORDER BY name",
    );
  },
  async saveProject(name: string, description: string, id = randomUUID()) {
    if (!name.trim()) throw new Error("Give the project a name.");
    await (
      await db()
    ).runAsync(
      "INSERT INTO projects(id,name,description) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description",
      id,
      name.trim(),
      description,
    );
    return id;
  },
  async actions() {
    return (await db()).getAllAsync<Action>(
      "SELECT a.* FROM actions a JOIN notes n ON n.id=a.noteId WHERE n.deletedAt IS NULL AND n.archived=0 ORDER BY a.done,a.due,a.rowid",
    );
  },
  async action(
    noteId: string,
    text: string,
    due = "",
    priority = "normal",
    id = randomUUID(),
  ) {
    if (!text.trim()) throw new Error("Write an action first.");
    if (due && !validDate(due))
      throw new Error("Use YYYY-MM-DD for due dates.");
    if (!["low", "normal", "high"].includes(priority))
      throw new Error("Choose a valid priority.");
    await (
      await db()
    ).runAsync(
      "INSERT INTO actions(id,noteId,text,due,priority) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET text=excluded.text,due=excluded.due,priority=excluded.priority WHERE actions.noteId=excluded.noteId",
      id,
      noteId,
      text.trim(),
      due,
      priority,
    );
  },
  async complete(id: string, done: boolean) {
    await (
      await db()
    ).runAsync(
      "UPDATE actions SET done=?,completedAt=? WHERE id=?",
      +done,
      done ? Date.now() : null,
      id,
    );
  },
  async versions(id: string) {
    return (await db()).getAllAsync<Version>(
      "SELECT * FROM versions WHERE noteId=? ORDER BY id DESC LIMIT 100",
      id,
    );
  },
  async checkpoint(id: string) {
    await (
      await db()
    ).runAsync(
      "INSERT INTO versions(noteId,title,body,createdAt) SELECT id,title,body,? FROM notes WHERE id=? AND deletedAt IS NULL",
      Date.now(),
      id,
    );
  },
  async links() {
    return (await db()).getAllAsync<{ sourceId: string; targetId: string }>(
      "SELECT l.* FROM note_links l JOIN notes a ON a.id=l.sourceId JOIN notes b ON b.id=l.targetId WHERE a.deletedAt IS NULL AND b.deletedAt IS NULL",
    );
  },
  async link(source: string, target: string) {
    if (source === target) return;
    await (
      await db()
    ).runAsync("INSERT OR IGNORE INTO note_links VALUES(?,?)", source, target);
  },
  async unlink(source: string, target: string) {
    await (
      await db()
    ).runAsync(
      "DELETE FROM note_links WHERE sourceId=? AND targetId=?",
      source,
      target,
    );
  },
  async templates() {
    return (await db()).getAllAsync<Template>(
      "SELECT * FROM templates ORDER BY name",
    );
  },
  async template(
    name: string,
    body: string,
    kind: Kind = "note",
    id = randomUUID(),
  ) {
    if (!name.trim()) throw new Error("Give the template a name.");
    await (
      await db()
    ).runAsync(
      "INSERT OR REPLACE INTO templates VALUES(?,?,?,?)",
      id,
      name.trim(),
      body,
      kind,
    );
  },
  async plan(day: string) {
    return (
      (await (
        await db()
      ).getFirstAsync<{ priorities: string; reflection: string }>(
        "SELECT * FROM plans WHERE day=?",
        day,
      )) ?? { priorities: "", reflection: "" }
    );
  },
  async savePlan(day: string, priorities: string, reflection: string) {
    await (
      await db()
    ).runAsync(
      "INSERT OR REPLACE INTO plans VALUES(?,?,?)",
      day,
      priorities,
      reflection,
    );
  },
  async attachments(id: string) {
    return (await db()).getAllAsync<Attachment>(
      "SELECT * FROM attachments WHERE noteId=?",
      id,
    );
  },
  async attach(a: Attachment) {
    await (
      await db()
    ).runAsync(
      "INSERT INTO attachments VALUES(?,?,?,?,?,?)",
      a.id,
      a.noteId,
      a.name,
      a.mime,
      a.data,
      a.extracted,
    );
  },
  async extract(id: string, text: string) {
    await (
      await db()
    ).runAsync("UPDATE attachments SET extracted=? WHERE id=?", text, id);
  },
  async segments(recordingId: string) {
    return (await db()).getAllAsync<Segment>(
      "SELECT * FROM segments WHERE recordingId=? ORDER BY start",
      recordingId,
    );
  },
  async segment(s: Segment) {
    if (
      !Number.isFinite(s.start) ||
      !Number.isFinite(s.end) ||
      s.start < 0 ||
      s.end <= s.start
    )
      throw new Error("The end time must be after the start time.");
    await (
      await db()
    ).runAsync(
      "INSERT OR REPLACE INTO segments VALUES(?,?,?,?,?)",
      s.id,
      s.recordingId,
      s.start,
      s.end,
      s.text,
    );
  },
  async vault() {
    return (await db()).getAllAsync<{ id: string; payload: string }>(
      "SELECT * FROM vault",
    );
  },
  async seal(id: string, payload: string, expected?: string) {
    const d = await db();
    const result =
      expected === undefined
        ? await d.runAsync(
            "INSERT OR IGNORE INTO vault VALUES(?,?)",
            id,
            payload,
          )
        : await d.runAsync(
            "UPDATE vault SET payload=? WHERE id=? AND payload=?",
            payload,
            id,
            expected,
          );
    if (result.changes !== 1)
      throw new Error(
        "The vault changed in another session. Keep a copy of unsaved writing, then lock and unlock to reload it.",
      );
  },
};
