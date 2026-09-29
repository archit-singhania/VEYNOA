import { dayKey, keywords, type Note } from "./index";
import { wikiTargets } from "./workspace";
export type MemorySnapshot = {
  id: number;
  noteId: string;
  revision: number;
  title: string;
  body: string;
  at: number;
};
export function asOf(snapshots: MemorySnapshot[], at: number) {
  const latest = new Map<string, MemorySnapshot>();
  for (const s of snapshots) {
    const old = latest.get(s.noteId);
    if (
      s.at <= at &&
      (!old || s.at > old.at || (s.at === old.at && s.id > old.id))
    )
      latest.set(s.noteId, s);
  }
  return [...latest.values()];
}
export function textChanges(before: string, after: string) {
  const a = new Set(before.split("\n").filter(Boolean));
  const b = new Set(after.split("\n").filter(Boolean));
  return {
    added: [...b].filter((x) => !a.has(x)),
    removed: [...a].filter((x) => !b.has(x)),
  };
}
export type GraphNode = {
  id: string;
  label: string;
  kind: string;
  noteIds: string[];
};
export type GraphEdge = {
  source: string;
  target: string;
  label: string;
  inferred: boolean;
  evidence: string[];
};
export function knowledgeGraph(
  notes: Note[],
  meta: { noteId: string; tags: string; projectId: string | null }[],
  projects: { id: string; name: string }[],
  links: { sourceId: string; targetId: string }[],
  entities: Record<string, string[]> = {},
) {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const live = new Set(notes.map((n) => n.id));
  const add = (id: string, label: string, kind: string, noteId: string) => {
    const old = nodes.get(id);
    nodes.set(id, {
      id,
      label,
      kind,
      noteIds: [...new Set([...(old?.noteIds || []), noteId])],
    });
  };
  for (const n of notes) {
    add(n.id, n.title || "Untitled", n.kind, n.id);
    const m = meta.find((x) => x.noteId === n.id);
    for (const tag of JSON.parse(m?.tags || "[]") as string[]) {
      const id = "tag:" + tag;
      add(id, tag, "tag", n.id);
      edges.push({
        source: n.id,
        target: id,
        label: "tagged",
        inferred: false,
        evidence: [n.id],
      });
    }
    const p = projects.find((x) => x.id === m?.projectId);
    if (p) {
      add("project:" + p.id, p.name, "project", n.id);
      edges.push({
        source: n.id,
        target: "project:" + p.id,
        label: "belongs to",
        inferred: false,
        evidence: [n.id],
      });
    }
    for (const entity of entities[n.id] || []) {
      const id = "entity:" + entity.toLowerCase();
      add(id, entity, "entity", n.id);
      edges.push({
        source: n.id,
        target: id,
        label: "AI-extracted entity",
        inferred: true,
        evidence: [n.id],
      });
    }
    for (const target of wikiTargets(n.body, notes))
      if (target !== n.id)
        edges.push({
          source: n.id,
          target,
          label: "wiki reference",
          inferred: false,
          evidence: [n.id, target],
        });
  }
  for (const l of links)
    if (live.has(l.sourceId) && live.has(l.targetId))
      edges.push({
        source: l.sourceId,
        target: l.targetId,
        label: "accepted link",
        inferred: false,
        evidence: [l.sourceId, l.targetId],
      });
  return { nodes: [...nodes.values()], edges };
}
export function graphClusters(nodes: GraphNode[], edges: GraphEdge[]) {
  const remaining = new Set(nodes.map((n) => n.id));
  const groups: string[][] = [];
  while (remaining.size) {
    const start = remaining.values().next().value!;
    const queue = [start];
    remaining.delete(start);
    const group: string[] = [];
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      group.push(id);
      for (const edge of edges) {
        const other =
          edge.source === id
            ? edge.target
            : edge.target === id
              ? edge.source
              : null;
        if (other && remaining.delete(other)) queue.push(other);
      }
    }
    groups.push(group);
  }
  return groups.sort((a, b) => b.length - a.length);
}
export type RankFeedback = {
  noteId: string;
  rating: number;
  snoozeUntil: number;
};
export function resurface(
  notes: Note[],
  meta: {
    noteId: string;
    tags: string;
    projectId: string | null;
    reminderAt: number | null;
  }[],
  feedback: RankFeedback[],
  context: string,
  projectId: string,
  now = Date.now(),
) {
  const words = new Set(keywords(context));
  const preference = new Map<string, number>();
  for (const f of feedback) {
    for (const tag of JSON.parse(
      meta.find((m) => m.noteId === f.noteId)?.tags || "[]",
    ) as string[])
      preference.set(tag, (preference.get(tag) || 0) + f.rating);
  }
  return notes
    .filter((n) => !n.archived)
    .flatMap((note) => {
      const f = feedback.find((x) => x.noteId === note.id);
      if ((f?.snoozeUntil || 0) > now) return [];
      const m = meta.find((x) => x.noteId === note.id);
      const reasons: string[] = [];
      let score = 0;
      const overlap = keywords(note.title + " " + note.body).filter((w) =>
        words.has(w),
      );
      if (overlap.length) {
        score += Math.min(overlap.length, 6) * 2;
        reasons.push(
          "Matches your current topic: " + overlap.slice(0, 3).join(", "),
        );
      }
      if (projectId && m?.projectId === projectId) {
        score += 5;
        reasons.push("In your selected project");
      }
      if (m?.reminderAt && m.reminderAt <= now) {
        score += 8;
        reasons.push("Your reminder is due");
      }
      const interest = (JSON.parse(m?.tags || "[]") as string[]).reduce(
        (sum, t) => sum + (preference.get(t) || 0),
        0,
      );
      if (interest) {
        score += Math.max(-5, Math.min(5, interest));
        reasons.push("Adjusted by your tag feedback");
      }
      const days = (now - note.updatedAt) / 86400000;
      if (days > 7) {
        score += Math.min(days / 30, 2);
        reasons.push("Not edited recently");
      }
      score += (f?.rating || 0) * 3;
      if (!reasons.length) reasons.push("Recent notebook candidate");
      return [{ note, score, reasons }];
    })
    .sort((a, b) => b.score - a.score || b.note.updatedAt - a.note.updatedAt)
    .slice(0, 8);
}
export type StudyState = {
  intervalDays: number;
  ease: number;
  reviews: number;
  lapses: number;
};
export function scheduleReview(
  card: StudyState,
  grade: number,
  now = Date.now(),
) {
  if (![0, 1, 2, 3].includes(grade)) throw new Error("Invalid review grade");
  const ease = Math.max(
    1.3,
    Math.min(
      3.2,
      card.ease +
        (grade === 3 ? 0.15 : grade === 1 ? -0.15 : grade === 0 ? -0.2 : 0),
    ),
  );
  const intervalDays =
    grade === 0
      ? 1 / 144
      : grade === 1
        ? Math.max(1, card.intervalDays * 1.2)
        : card.reviews === 0
          ? grade === 3
            ? 4
            : 1
          : Math.max(
              1,
              Math.round(card.intervalDays * ease * (grade === 3 ? 1.3 : 1)),
            );
  return {
    intervalDays,
    ease,
    reviews: card.reviews + 1,
    lapses: card.lapses + (grade === 0 ? 1 : 0),
    dueAt: now + intervalDays * 86400000,
  };
}
export type PlanStep = { id: string; dependencies: string[]; state: string };
export function validatePlan(steps: PlanStep[]) {
  const map = new Map(steps.map((s) => [s.id, s]));
  if (map.size !== steps.length) throw new Error("Duplicate step IDs");
  const visited = new Set<string>(),
    visiting = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error("Dependencies contain a cycle");
    if (visited.has(id)) return;
    const step = map.get(id);
    if (!step) throw new Error("A dependency does not exist");
    visiting.add(id);
    step.dependencies.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  steps.forEach((s) => visit(s.id));
  return true;
}
export function canComplete(step: PlanStep, steps: PlanStep[]) {
  return (
    step.state === "approved" &&
    step.dependencies.every(
      (id) => steps.find((s) => s.id === id)?.state === "done",
    )
  );
}
export function dailyActivity(notes: Note[], days = 14, now = Date.now()) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days + 1 + i);
    const day = dayKey(date.getTime());
    return {
      day,
      noteIds: notes
        .filter((n) => dayKey(n.createdAt) === day)
        .map((n) => n.id),
    };
  });
}
