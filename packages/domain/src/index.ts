export const kinds = [
  "note",
  "idea",
  "task",
  "question",
  "memory",
  "journal",
  "project",
  "person",
  "place",
  "reference",
  "decision",
] as const;
export type Kind = (typeof kinds)[number];
export interface Note {
  id: string;
  title: string;
  body: string;
  kind: Kind;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  archived: boolean;
  completed: boolean;
  revision: number;
}
export interface Recording {
  id: string;
  noteId: string;
  uri: string;
  createdAt: number;
  duration: number;
  transcribed: boolean;
}
export interface CanvasNode {
  id: string;
  noteId: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
}
export interface Settings {
  localOnly: boolean;
  gatewayUrl: string;
  greeting: "always" | "daily" | "never";
  lastGreeting: string;
  theme: "system" | "light" | "dark";
  palette?: "grove" | "dusk" | "tide";
  motionEffects?: boolean;
  installationId: string;
}
export const defaults: Omit<Settings, "installationId"> = {
  localOnly: true,
  gatewayUrl: "",
  greeting: "daily",
  lastGreeting: "",
  theme: "system",
  palette: "grove",
  motionEffects: true,
};
export function dayKey(time = Date.now()) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function greeting(hour: number) {
  return hour < 6 || hour >= 22
    ? "Still thinking?"
    : hour < 12
      ? "Good morning."
      : hour < 17
        ? "Good afternoon."
        : "Good evening.";
}
export function shouldGreet(
  settings: Pick<Settings, "greeting" | "lastGreeting">,
  today: string,
) {
  return (
    settings.greeting === "always" ||
    (settings.greeting === "daily" && settings.lastGreeting !== today)
  );
}
export function cosine(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  const dot = a.reduce((v, x, i) => v + x * b[i], 0);
  const norm = Math.sqrt(
    a.reduce((v, x) => v + x * x, 0) * b.reduce((v, x) => v + x * x, 0),
  );
  return norm ? dot / norm : 0;
}
export function localSuggestions(
  text: string,
): { kind: Kind; label: string }[] {
  const out: { kind: Kind; label: string }[] = [];
  if (/\b(should|need to|tomorrow|remember to|must)\b/i.test(text))
    out.push({ kind: "task", label: "Turn this thought into a task" });
  if (/\b(realized|felt|grateful|reflect|feeling)\b/i.test(text))
    out.push({ kind: "journal", label: "Keep this in your journal" });
  if (/\b(what if|idea|maybe|imagine)\b/i.test(text))
    out.push({ kind: "idea", label: "Collect this as an idea" });
  return out;
}
export function keywords(text: string) {
  const stop = new Set(
    "about after again also been could from have into just more that their there these they this want what when where which with would your".split(
      " ",
    ),
  );
  return [
    ...new Set(text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []),
  ].filter((w) => !stop.has(w));
}
export function related(notes: Note[], text: string, exclude?: string) {
  const words = new Set(keywords(text));
  return notes
    .filter((n) => !n.archived && n.id !== exclude)
    .map((note) => ({
      note,
      score: keywords(note.title + " " + note.body).filter((w) => words.has(w))
        .length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
export function markdown(notes: Note[]) {
  return notes
    .map(
      (n) =>
        `# ${n.title || "Untitled"}\n\n${n.body}\n\n*${n.kind} · ${new Date(n.createdAt).toISOString()}*`,
    )
    .join("\n\n---\n\n");
}
export function retryDelay(attempt: number) {
  return Math.min(300_000, 2000 * 2 ** Math.min(attempt, 8));
}
