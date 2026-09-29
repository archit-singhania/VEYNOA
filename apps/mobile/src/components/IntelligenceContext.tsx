import { useCallback, useRef, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { intelligence } from "../database/intelligence";
import { useWorkspace } from "./WorkspaceUI";
import { useApp } from "../stores/app";
import { Button, Row, Label } from "./ui";
export function useIntelligence() {
  const workspace = useWorkspace();
  const notes = useApp((s) => s.notes).filter((n) => !n.archived);
  const [data, setData] = useState<
    Awaited<ReturnType<typeof intelligence.load>>
  >({
    snapshots: [],
    decisions: [],
    feedback: [],
    cards: [],
    goals: [],
    steps: [],
    events: [],
    evidence: [],
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const refresh = useCallback(
    async () => setData(await intelligence.load()),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      void refresh().catch((e) => setError(String(e)));
    }, [refresh]),
  );
  const run = async (f: () => Promise<unknown>) => {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      await f();
      await Promise.all([refresh(), workspace.refresh()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  return { ...data, workspace, notes, error, busy, run, refresh };
}
export type IntelligenceState = ReturnType<typeof useIntelligence>;
export function Sources({ ids, s }: { ids: string[]; s: IntelligenceState }) {
  return (
    <Row>
      {ids.map((id) => {
        const n = s.notes.find((n) => n.id === id);
        return n ? (
          <Button key={id} onPress={() => router.push(`/notes/${id}`)}>
            {n.title || "Untitled"}
          </Button>
        ) : (
          <Label key={id} muted>
            Source unavailable
          </Label>
        );
      })}
    </Row>
  );
}
export function SourcePicker({
  s,
  selected,
  onChange,
  multiple = false,
}: {
  s: IntelligenceState;
  selected: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
}) {
  return (
    <Row>
      {s.notes.map((n) => (
        <Button
          key={n.id}
          primary={selected.includes(n.id)}
          onPress={() =>
            onChange(
              multiple
                ? selected.includes(n.id)
                  ? selected.filter((id) => id !== n.id)
                  : [...selected, n.id].slice(0, 8)
                : [n.id],
            )
          }
        >
          {n.title || "Untitled"}
        </Button>
      ))}
      {!s.notes.length && <Label muted>Create a note first.</Label>}
    </Row>
  );
}
