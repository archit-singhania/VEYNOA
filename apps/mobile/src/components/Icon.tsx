import Svg, { Path, Circle, Rect } from "react-native-svg";
export type IconName =
  | "notes"
  | "garden"
  | "timeline"
  | "search"
  | "settings"
  | "plus"
  | "mic"
  | "arrow"
  | "spark"
  | "shield"
  | "pin"
  | "check"
  | "archive"
  | "sun"
  | "moon"
  | "chevron"
  | "close"
  | "pen"
  | "grid"
  | "list"
  | "leaf";
const paths: Record<IconName, string> = {
  notes: "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h5",
  garden:
    "M12 21V11 M12 15C3 15 3 7 3 7c9 0 9 8 9 8 M12 11c0-8 8-8 8-8s1 8-8 8",
  timeline: "M12 7v5l4 2",
  search: "m16 16 5 5",
  settings: "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
  plus: "M12 5v14 M5 12h14",
  mic: "M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8",
  arrow: "M4 12h15 M13 6l6 6-6 6",
  spark: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z M8 12l3 3 5-6",
  pin: "M8 3h8l-1 6 4 4H5l4-4z M12 13v8",
  check: "m5 12 4 4L19 6",
  archive: "M4 7h16v14H4z M3 3h18v4H3z M9 11h6",
  sun: "M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  moon: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11",
  chevron: "m9 5 7 7-7 7",
  close: "m6 6 12 12 M18 6 6 18",
  pen: "m4 16-1 5 5-1L20 8l-4-4z M13 7l4 4",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  list: "M8 5h13 M8 12h13 M8 19h13 M3 5h1 M3 12h1 M3 19h1",
  leaf: "M4 20C0 6 10 2 21 3c1 12-6 20-17 17 M4 20 16 8",
};
export function Icon({
  name,
  size = 20,
  color = "#365F4E",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.55}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={paths[name]} />
      {name === "search" && <Circle cx={10.5} cy={10.5} r={6.5} />}
      {name === "timeline" && <Circle cx={12} cy={12} r={9} />}
      {(name === "settings" || name === "sun") && (
        <Circle cx={12} cy={12} r={3.5} />
      )}
      {name === "mic" && <Rect x={9} y={2} width={6} height={13} rx={3} />}
    </Svg>
  );
}
