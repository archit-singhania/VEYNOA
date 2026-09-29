import type { Note } from "./index";
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}
export function wikiTargets(body: string, notes: Note[]) {
  const labels = [...body.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((x) => x[1]);
  return [
    ...new Set(
      labels.flatMap((label) => {
        const exact = notes.find((n) => n.id === label);
        if (exact) return [exact.id];
        const byTitle = notes.filter(
          (n) => n.title.toLowerCase() === label.toLowerCase(),
        );
        return byTitle.length === 1 ? [byTitle[0].id] : [];
      }),
    ),
  ];
}
export function dueTime(input: string) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(input))
    throw new Error("Use YYYY-MM-DD HH:mm in your local time.");
  const [date, time] = input.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const result = new Date(y, m - 1, d, h, min);
  if (
    result.getFullYear() !== y ||
    result.getMonth() !== m - 1 ||
    result.getDate() !== d ||
    result.getHours() !== h ||
    result.getMinutes() !== min ||
    result.getTime() <= Date.now()
  )
    throw new Error("Choose a valid future date and time.");
  return result.getTime();
}
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
export function replaceSelection(
  body: string,
  start: number,
  end: number,
  before: string,
  after = "",
) {
  return (
    body.slice(0, start) +
    before +
    body.slice(start, end) +
    after +
    body.slice(end)
  );
}
