import { create } from "zustand";
import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import { defaults, cosine, type Note, type Settings } from "@veynoa/domain";
import type { Analysis } from "@veynoa/ai-contracts";
import { repository, type Job } from "../database/repository";
import { cancelInference, infer } from "../services/ai";
import { AIRequestError, retryPlan } from "@veynoa/domain/src/retry";
import { useInterface } from "./interface";
import { hybridRank, relevantExcerpt } from "@veynoa/domain/src/retrieval";
import { workspace } from "../database/workspace";
import { cancelReminder } from "../services/reminders";

let writes = Promise.resolve();
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const next = writes.then(work);
  writes = next.then(
    () => {},
    () => {},
  );
  return next;
}
let draining = false;
interface State {
  ready: boolean;
  error: string;
  busy: number;
  notes: Note[];
  trash: Note[];
  analyses: Record<string, Analysis>;
  jobs: Job[];
  settings: Settings;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  create: (kind?: Note["kind"], body?: string, title?: string) => Promise<Note>;
  capture: (kind: Note["kind"], body: string, title: string) => Promise<Note>;
  update: (id: string, patch: Partial<Note>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  setSettings: (patch: Partial<Settings>) => Promise<void>;
  analyze: (id: string) => Promise<void>;
  drain: () => Promise<void>;
  reset: () => Promise<void>;
  fail: (error: unknown) => void;
}
export const useApp = create<State>((set, get) => ({
  ready: false,
  error: "",
  busy: 0,
  notes: [],
  trash: [],
  analyses: {},
  jobs: [],
  settings: { ...defaults, installationId: "" },
  fail: (error) =>
    set({ error: error instanceof Error ? error.message : String(error) }),
  init: async () => {
    try {
      await repository.init();
      const settings = await repository.settings();
      set({ settings });
      await get().refresh();
      set({ ready: true, error: "" });
      void get().drain();
    } catch (e) {
      get().fail(e);
    }
  },
  refresh: async () => {
    const [notes, analyses, jobs, trash] = await Promise.all([
      repository.list(),
      repository.analyses(),
      repository.jobs(),
      repository.trash(),
    ]);
    set((s) => ({
      notes: notes.map((n) => {
        const current = s.notes.find((x) => x.id === n.id);
        return current && current.updatedAt > n.updatedAt ? current : n;
      }),
      analyses,
      jobs,
      trash,
    }));
  },
  create: async (kind = "note", body = "", title = "") =>
    serialize(async () => {
      const n = await repository.create(kind, body, title);
      set((s) => ({ notes: [n, ...s.notes] }));
      return n;
    }),
  capture: async (kind, body, title) =>
    serialize(async () => {
      const n = await repository.capture(kind, body, title);
      set((s) => ({ notes: [n, ...s.notes] }));
      return n;
    }),
  update: async (id, patch) => {
    const old = get().notes.find((n) => n.id === id);
    if (!old) return;
    const contentChanged =
      (patch.body !== undefined && patch.body !== old.body) ||
      (patch.title !== undefined && patch.title !== old.title);
    const n = {
      ...old,
      ...patch,
      id,
      updatedAt: Date.now(),
      revision: old.revision + (contentChanged ? 1 : 0),
    };
    set((s) => ({
      notes: s.notes.map((x) => (x.id === id ? n : x)),
      analyses: contentChanged
        ? Object.fromEntries(
            Object.entries(s.analyses).filter(([key]) => key !== id),
          )
        : s.analyses,
    }));
    try {
      await serialize(() => repository.save(n));
    } catch (e) {
      get().fail(
        new Error(
          "Your last edit could not be saved. Keep this screen open and try again.",
        ),
      );
      throw e;
    }
  },
  remove: async (id) =>
    serialize(async () => {
      const meta = (await workspace.meta()).find((m) => m.noteId === id);
      await cancelReminder(meta?.notificationId || null);
      await workspace.reminder(id, null, null);
      await repository.remove(id);
      await get().refresh();
      useInterface.getState().notify({
        message: "Moved to Recently deleted",
        actionLabel: "Undo",
        action: () => void get().restore(id).catch(get().fail),
      });
    }),
  restore: async (id) =>
    serialize(async () => {
      await repository.restore(id);
      await get().refresh();
      useInterface.getState().notify({ message: "Thought restored" });
    }),
  setSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    if (settings.localOnly) cancelInference();
    set({ settings });
    await serialize(() => repository.setSettings(settings));
    if (!settings.localOnly) void get().drain();
  },
  analyze: async (id) => {
    await writes;
    const note = get().notes.find((n) => n.id === id);
    if (!note?.body.trim()) return;
    if (await repository.analysis(id)) return;
    await repository.enqueue({
      id: `analyze:${id}:${note.revision}`,
      noteId: id,
      type: "analyze",
      payload: JSON.stringify({ revision: note.revision }),
    });
    set({ jobs: await repository.jobs() });
    void get().drain();
  },
  drain: async () => {
    if (draining || get().settings.localOnly || !get().settings.gatewayUrl)
      return;
    draining = true;
    try {
      const jobs = await repository.jobs();
      const blockedTranscripts = new Set<string>();
      for (const job of jobs) {
        if (get().settings.localOnly) break;
        if (job.type === "transcribe" && blockedTranscripts.has(job.noteId))
          continue;
        if (job.state !== "pending" || job.nextAt > Date.now()) {
          if (job.type === "transcribe") blockedTranscripts.add(job.noteId);
          continue;
        }
        await repository.jobState(job.id, "running", job.attempts);
        set((s) => ({ busy: s.busy + 1 }));
        try {
          await writes;
          const note = get().notes.find((n) => n.id === job.noteId);
          if (!note) {
            await repository.deleteJob(job.id);
            continue;
          }
          const data = JSON.parse(job.payload);
          if (job.type === "analyze") {
            if (data.revision !== note.revision) {
              await repository.deleteJob(job.id);
              continue;
            }
            const result =
              (await repository.analysis(note.id)) ??
              (await infer(
                "analyze",
                { text: note.title + "\n" + note.body },
                get().settings,
              ));
            if (get().settings.localOnly)
              throw new AIRequestError("Cloud AI disabled.", true, 0, true);
            await repository.saveAnalysis(note.id, note.revision, result);
            if (
              !get().notes.some(
                (n) => n.id === note.id && n.revision === note.revision,
              )
            ) {
              await repository.deleteJob(job.id);
              continue;
            }
            const vectors = await infer(
              "embed",
              { texts: [note.title + "\n" + note.body] },
              get().settings,
            );
            await repository.saveEmbedding(
              note.id,
              note.revision,
              vectors.model,
              vectors.vectors[0],
            );
          } else {
            const recordings = await repository.recordings(note.id);
            const recording = recordings.find((r) => r.id === data.recordingId);
            if (recording && !recording.transcribed) {
              const audio = await new File(recording.uri).base64();
              const result = await infer(
                "transcribe",
                { audio },
                get().settings,
              );
              if (get().settings.localOnly)
                throw new AIRequestError("Cloud AI disabled.", true, 0, true);
              await serialize(async () => {
                const current = get().notes.find((n) => n.id === note.id);
                if (!current) return;
                const n = {
                  ...current,
                  body: [current.body, result.text]
                    .filter(Boolean)
                    .join("\n\n"),
                  revision: current.revision + 1,
                  updatedAt: Date.now(),
                };
                await repository.applyTranscript(
                  n,
                  recording.id,
                  (result.segments || []).filter(
                    (segment) =>
                      segment.start < recording.duration &&
                      segment.end <= recording.duration + 1,
                  ),
                );
                set((s) => ({
                  notes: s.notes.map((x) => (x.id === n.id ? n : x)),
                }));
              });
            }
          }
          await repository.deleteJob(job.id);
        } catch (e) {
          if (job.type === "transcribe") blockedTranscripts.add(job.noteId);
          const plan = retryPlan(e, job.attempts, Date.now(), Math.random());
          await repository.jobState(
            job.id,
            plan.state,
            plan.attempts,
            plan.nextAt,
            e instanceof Error ? e.message : "Inference failed",
          );
        } finally {
          set((s) => ({ busy: Math.max(0, s.busy - 1) }));
        }
      }
      await serialize(() => get().refresh());
    } catch (error) {
      get().fail(error);
    } finally {
      draining = false;
    }
  },
  reset: async () => {
    cancelInference();
    set({ settings: { ...get().settings, localOnly: true } });
    await serialize(async () => {
      for (const m of await workspace.meta())
        await cancelReminder(m.notificationId);
      await repository.clear();
      const settings = { ...defaults, installationId: randomUUID() };
      await repository.setSettings(settings);
      set({
        settings,
        notes: [],
        trash: [],
        analyses: {},
        jobs: [],
        error: "",
      });
    });
  },
}));
export async function retrieve(question: string, semantic = false) {
  const s = useApp.getState();
  let matches = hybridRank(s.notes, question);
  if (semantic) {
    const result = await cloud("embed", { texts: [question] });
    const vectors = await repository.embeddings(result.model);
    const ranked = vectors
      .map((v) => ({
        id: v.noteId,
        score: cosine(result.vectors[0], v.vector),
      }))
      .filter((v) => v.score > 0.25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    matches = hybridRank(useApp.getState().notes, question, ranked);
  }
  return matches.slice(0, 8).map((n) => ({
    id: n.id,
    title: n.title || "Untitled",
    text: relevantExcerpt(n.body, question),
  }));
}
export async function cloud<R extends Parameters<typeof infer>[0]>(
  route: R,
  payload: Parameters<typeof infer<R>>[1],
) {
  useApp.setState((s) => ({ busy: s.busy + 1 }));
  try {
    return await infer(route, payload, useApp.getState().settings);
  } finally {
    useApp.setState((s) => ({ busy: Math.max(0, s.busy - 1) }));
  }
}
