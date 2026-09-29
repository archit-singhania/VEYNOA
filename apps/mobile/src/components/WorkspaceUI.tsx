import { useCallback, useState, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { workspace } from "../database/workspace";
export function useWorkspace() {
  const running = useRef(false);
  const [data, setData] = useState({
    meta: [] as Awaited<ReturnType<typeof workspace.meta>>,
    projects: [] as Awaited<ReturnType<typeof workspace.projects>>,
    actions: [] as Awaited<ReturnType<typeof workspace.actions>>,
    templates: [] as Awaited<ReturnType<typeof workspace.templates>>,
    links: [] as Awaited<ReturnType<typeof workspace.links>>,
    recordings: [] as Awaited<ReturnType<typeof workspace.recordingInbox>>,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const [meta, projects, actions, templates, links, recordings] =
      await Promise.all([
        workspace.meta(),
        workspace.projects(),
        workspace.actions(),
        workspace.templates(),
        workspace.links(),
        workspace.recordingInbox(),
      ]);
    setData({ meta, projects, actions, templates, links, recordings });
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refresh().catch((e) => setError(String(e)));
    }, [refresh]),
  );
  const run = async (work: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return { ...data, error, busy, run, refresh };
}
