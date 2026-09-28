import { keywords, type Note } from "./index";
export function hybridRank(
  notes: Note[],
  query: string,
  scores: { id: string; score: number }[] = [],
) {
  const words = new Set(keywords(query));
  const semantic = new Map(scores.map((s) => [s.id, s.score]));
  return notes
    .filter((n) => !n.archived)
    .map((note) => {
      const overlaps = keywords(note.title + " " + note.body).filter((w) =>
        words.has(w),
      ).length;
      const lexical = overlaps / Math.max(1, words.size);
      const similarity = semantic.get(note.id) || 0;
      return {
        note,
        score: lexical * 0.45 + (similarity >= 0.25 ? similarity * 0.55 : 0),
      };
    })
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score || b.note.updatedAt - a.note.updatedAt)
    .slice(0, 8)
    .map((n) => n.note);
}
export function relevantExcerpt(body: string, query: string, max = 2000) {
  const words = new Set(keywords(query));
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((text, index) => ({
      text,
      index,
      score: keywords(text).filter((w) => words.has(w)).length,
    }));
  const best = paragraphs
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.index - b.index);
  return (best.length ? best.map((p) => p.text).join("\n\n") : body).slice(
    0,
    max,
  );
}
