import type { SQLiteDatabase } from "expo-sqlite";

import {
  scheduleReview,
  validatePlan,
  canComplete,
  type MemorySnapshot,
  type RankFeedback,
} from "@veynoa/domain/src/intelligence";
export type Decision = {
  id: string;
  noteId: string;
  question: string;
  choice: string;
  alternatives: string;
  assumptions: string;
  evidenceIds: string;
  outcome: string;
  createdAt: number;
  reviewedAt: number | null;
};
export type StudyCard = {
  id: string;
  noteId: string;
  question: string;
  answer: string;
  sourceRevision: number;
  dueAt: number;
  intervalDays: number;
  ease: number;
  reviews: number;
  lapses: number;
};
export type Goal = {
  id: string;
  title: string;
  sourceIds: string;
  createdAt: number;
};
export type Step = {
  id: string;
  goalId: string;
  text: string;
  noteId: string | null;
  dependencies: string[];
  state: string;
  actionId: string | null;
};
export type Evidence = {
  id: string;
  noteId: string;
  attachmentId: string | null;
  recordingId: string | null;
  kind: string;
  locator: string;
  text: string;
  vector: string | null;
  model: string | null;
  sourceRevision: number | null;
  createdAt: number;
};
const active = "SELECT id FROM notes WHERE deletedAt IS NULL AND archived=0";
export function createIntelligence(
  db: () => Promise<SQLiteDatabase>,
  randomUUID: () => string,
) {
  let queue: Promise<unknown> = Promise.resolve();
  // Serialize our multi-statement mutations on the shared SQLite connection.
  function write<T>(f: () => Promise<T>): Promise<T> {
    const next = queue.then(f, f);
    queue = next.catch(() => {});
    return next;
  }
  return {
    async load() {
      const d = await db();
      const [
        snapshots,
        decisions,
        feedback,
        cards,
        goals,
        raw,
        events,
        evidence,
      ] = await Promise.all([
        d.getAllAsync<MemorySnapshot>(
          `SELECT * FROM memory_snapshots WHERE noteId IN (${active}) ORDER BY at,id`,
        ),
        d.getAllAsync<Decision>(
          `SELECT * FROM decisions WHERE noteId IN (${active}) ORDER BY createdAt DESC`,
        ),
        d.getAllAsync<RankFeedback>(
          `SELECT * FROM recommendation_feedback WHERE noteId IN (${active})`,
        ),
        d.getAllAsync<StudyCard>(
          `SELECT * FROM study_cards WHERE noteId IN (${active}) ORDER BY dueAt`,
        ),
        d.getAllAsync<Goal>("SELECT * FROM goals ORDER BY createdAt DESC"),
        d.getAllAsync<Omit<Step, "dependencies"> & { dependencies: string }>(
          "SELECT * FROM goal_steps ORDER BY rowid",
        ),
        d.getAllAsync<{
          id: string;
          goalId: string;
          stepId: string;
          action: string;
          at: number;
        }>("SELECT * FROM goal_events ORDER BY at DESC"),
        d.getAllAsync<Evidence>(
          `SELECT e.* FROM evidence_chunks e JOIN notes n ON n.id=e.noteId WHERE n.deletedAt IS NULL AND n.archived=0 AND (e.sourceRevision IS NULL OR e.sourceRevision=n.revision)`,
        ),
      ]);
      return {
        snapshots,
        decisions,
        feedback,
        cards,
        goals,
        steps: raw.map((s) => ({
          ...s,
          dependencies: JSON.parse(s.dependencies) as string[],
        })),
        events,
        evidence,
      };
    },
    async feedback(noteId: string, rating: number, snoozeUntil = 0) {
      await (
        await db()
      ).runAsync(
        "INSERT INTO recommendation_feedback VALUES(?,?,?,?) ON CONFLICT(noteId) DO UPDATE SET rating=excluded.rating,snoozeUntil=excluded.snoozeUntil,updatedAt=excluded.updatedAt",
        noteId,
        rating,
        snoozeUntil,
        Date.now(),
      );
    },
    async decision(
      value: Pick<
        Decision,
        "noteId" | "question" | "choice" | "alternatives" | "assumptions"
      >,
      evidenceIds: string[],
    ) {
      if (!value.question.trim() || !value.choice.trim())
        throw new Error("Write the decision and choice.");
      const d = await db();
      for (const id of [value.noteId, ...evidenceIds])
        if (
          !(await d.getFirstAsync(
            `SELECT id FROM notes WHERE id=? AND id IN (${active})`,
            id,
          ))
        )
          throw new Error("A selected source is unavailable.");
      await d.runAsync(
        "INSERT INTO decisions VALUES(?,?,?,?,?,?,?,?,?,NULL)",
        randomUUID(),
        value.noteId,
        value.question,
        value.choice,
        value.alternatives,
        value.assumptions,
        JSON.stringify(evidenceIds),
        "",
        Date.now(),
      );
    },
    async outcome(id: string, text: string) {
      await (
        await db()
      ).runAsync(
        "UPDATE decisions SET outcome=?,reviewedAt=? WHERE id=?",
        text,
        Date.now(),
        id,
      );
    },
    async card(noteId: string, question: string, answer: string) {
      if (!question.trim() || !answer.trim())
        throw new Error("Provide a question and answer.");
      await (
        await db()
      ).runAsync(
        `INSERT INTO study_cards(id,noteId,question,answer,sourceRevision,dueAt) SELECT ?,id,?,?,revision,? FROM notes WHERE id=? AND id IN (${active})`,
        randomUUID(),
        question.trim(),
        answer.trim(),
        Date.now(),
        noteId,
      );
    },
    review(id: string, grade: number) {
      return write(async () => {
        const d = await db();
        await d.withTransactionAsync(async () => {
          const c = await d.getFirstAsync<StudyCard>(
            "SELECT * FROM study_cards WHERE id=?",
            id,
          );
          if (!c) throw new Error("Card no longer exists.");
          const next = scheduleReview(c, grade);
          await d.runAsync(
            "UPDATE study_cards SET intervalDays=?,ease=?,reviews=?,lapses=?,dueAt=? WHERE id=?",
            next.intervalDays,
            next.ease,
            next.reviews,
            next.lapses,
            next.dueAt,
            id,
          );
          await d.runAsync(
            "INSERT INTO study_reviews VALUES(?,?,?,?)",
            randomUUID(),
            id,
            grade,
            Date.now(),
          );
        });
      });
    },
    async deleteCard(id: string) {
      await (await db()).runAsync("DELETE FROM study_cards WHERE id=?", id);
    },
    propose(
      title: string,
      noteIds: string[],
      texts: string[],
      sequential = true,
    ) {
      return write(async () => {
        if (
          !title.trim() ||
          !noteIds.length ||
          !texts.filter((t) => t.trim()).length
        )
          throw new Error("Choose sources, a goal, and at least one step.");
        const d = await db();
        const goalId = randomUUID();
        const steps = texts
          .filter((t) => t.trim())
          .slice(0, 30)
          .map((text) => ({
            id: randomUUID(),
            text,
            dependencies: [] as string[],
            state: "proposed",
          }));
        if (sequential)
          steps.forEach((s, i) => {
            if (i) s.dependencies = [steps[i - 1].id];
          });
        validatePlan(steps);
        await d.withTransactionAsync(async () => {
          for (const id of noteIds)
            if (
              !(await d.getFirstAsync(
                `SELECT id FROM notes WHERE id=? AND id IN (${active})`,
                id,
              ))
            )
              throw new Error("A source is unavailable.");
          await d.runAsync(
            "INSERT INTO goals VALUES(?,?,?,?)",
            goalId,
            title.trim(),
            JSON.stringify(noteIds),
            Date.now(),
          );
          for (const s of steps)
            await d.runAsync(
              "INSERT INTO goal_steps VALUES(?,?,?,?,?,?,NULL)",
              s.id,
              goalId,
              s.text,
              noteIds[0],
              JSON.stringify(s.dependencies),
              "proposed",
            );
          await d.runAsync(
            "INSERT INTO goal_events VALUES(?,?,?,?,?)",
            randomUUID(),
            goalId,
            "",
            "Plan proposed; no actions created",
            Date.now(),
          );
        });
        return goalId;
      });
    },
    transition(id: string, operation: "approve" | "complete" | "revert") {
      return write(async () => {
        const d = await db();
        await d.withTransactionAsync(async () => {
          const raw = await d.getAllAsync<
            Omit<Step, "dependencies"> & { dependencies: string }
          >("SELECT * FROM goal_steps");
          const steps = raw.map((s) => ({
            ...s,
            dependencies: JSON.parse(s.dependencies) as string[],
          }));
          const s = steps.find((s) => s.id === id);
          if (!s) throw new Error("Step no longer exists.");
          const live = await d.getFirstAsync(
            `SELECT id FROM notes WHERE id=? AND id IN (${active})`,
            s.noteId,
          );
          if (!live)
            throw new Error(
              "Restore the source note before changing this step.",
            );
          if (operation === "approve") {
            if (s.state !== "proposed") throw new Error("Already approved.");
            const actionId = randomUUID();
            await d.runAsync(
              "INSERT INTO actions(id,noteId,text) VALUES(?,?,?)",
              actionId,
              s.noteId,
              s.text,
            );
            await d.runAsync(
              "UPDATE goal_steps SET state='approved',actionId=? WHERE id=?",
              actionId,
              id,
            );
          } else if (operation === "complete") {
            if (!canComplete(s, steps))
              throw new Error("Complete approved dependencies first.");
            await d.runAsync(
              "UPDATE goal_steps SET state='done' WHERE id=?",
              id,
            );
            await d.runAsync(
              "UPDATE actions SET done=1,completedAt=? WHERE id=?",
              Date.now(),
              s.actionId,
            );
          } else {
            if (s.state !== "approved")
              throw new Error("Only unfinished approvals can be reverted.");
            if (
              steps.some(
                (x) => x.dependencies.includes(id) && x.state === "done",
              )
            )
              throw new Error("A dependent step is complete.");
            const a = await d.getFirstAsync<{
              text: string;
              done: number;
              due: string;
              priority: string;
            }>("SELECT * FROM actions WHERE id=?", s.actionId);
            if (
              !a ||
              a.done ||
              a.text !== s.text ||
              a.due ||
              a.priority !== "normal"
            )
              throw new Error(
                "The action was edited or completed. Preserve it and manage it in Today.",
              );
            await d.runAsync("DELETE FROM actions WHERE id=?", s.actionId);
            await d.runAsync(
              "UPDATE goal_steps SET state='proposed',actionId=NULL WHERE id=?",
              id,
            );
          }
          await d.runAsync(
            "INSERT INTO goal_events VALUES(?,?,?,?,?)",
            randomUUID(),
            s.goalId,
            id,
            operation,
            Date.now(),
          );
        });
      });
    },
    async evidence(rows: Omit<Evidence, "id" | "createdAt">[]) {
      return write(async () => {
        const d = await db();
        await d.withTransactionAsync(async () => {
          for (const r of rows) {
            await d.runAsync(
              "DELETE FROM evidence_chunks WHERE noteId=? AND kind=? AND locator=? AND COALESCE(attachmentId,'')=? AND COALESCE(recordingId,'')=?",
              r.noteId,
              r.kind,
              r.locator,
              r.attachmentId || "",
              r.recordingId || "",
            );
            await d.runAsync(
              "INSERT INTO evidence_chunks VALUES(?,?,?,?,?,?,?,?,?,?,?)",
              randomUUID(),
              r.noteId,
              r.attachmentId,
              r.recordingId,
              r.kind,
              r.locator,
              r.text,
              r.vector,
              r.model,
              r.sourceRevision,
              Date.now(),
            );
          }
        });
      });
    },
    async audioEvidence() {
      return (await db()).getAllAsync<{
        noteId: string;
        recordingId: string;
        uri: string;
        start: number;
        end: number;
        text: string;
      }>(
        `SELECT r.noteId,r.id recordingId,r.uri,s.start,s.end,s.text FROM segments s JOIN recordings r ON r.id=s.recordingId WHERE r.noteId IN (${active}) ORDER BY r.createdAt DESC,s.start`,
      );
    },
  };
}
