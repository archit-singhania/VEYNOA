import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import type { Note } from "@veynoa/domain";
import { cloud, retrieve, useApp } from "../../src/stores/app";
import { repository } from "../../src/database/repository";
import { Button, Card, Field, Label, Page, Row } from "../../src/components/ui";
export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Note[]>([]);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [semantic, setSemantic] = useState(false);
  const generation = useRef(0);
  const notes = useApp((s) => s.notes);
  const localOnly = useApp((s) => s.settings.localOnly);
  useEffect(() => {
    let active = true;
    generation.current++;
    setAnswer("");
    setSources([]);
    const timer = setTimeout(
      () =>
        void repository
          .search(query)
          .then((n) => {
            if (active) setResults(n);
          })
          .catch(useApp.getState().fail),
      120,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, notes]);
  const ask = async () => {
    const version = generation.current;
    setLoading(true);
    try {
      const excerpts = await retrieve(query, semantic);
      if (!excerpts.length) {
        setAnswer(
          "I couldn’t find relevant thoughts. Try a phrase from your notes, or analyze more notes for semantic search.",
        );
        return;
      }
      const result = await cloud("ask", { question: query, sources: excerpts });
      if (version !== generation.current) return;
      setAnswer(result.answer);
      setSources(excerpts.filter((e) => result.sourceIds.includes(e.id)));
    } catch (e) {
      useApp.getState().fail(e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Page
      title="Find a thread."
      subtitle="A word, a question, something you almost remember."
    >
      <Field
        accessibilityLabel="Search your thoughts"
        value={query}
        onChangeText={setQuery}
        placeholder="What have I been thinking about?"
      />
      <Row>
        <Button
          primary
          disabled={!query.trim() || localOnly || loading}
          onPress={() => void ask()}
        >
          {loading ? "Thinking…" : "Ask Veynoa"}
        </Button>
        <Button disabled={localOnly} onPress={() => setSemantic(!semantic)}>
          {semantic ? "Semantic retrieval on" : "Use semantic retrieval"}
        </Button>
      </Row>
      {localOnly && (
        <Label muted size={13}>
          Local text search is available. Ask Veynoa requires cloud AI in
          Settings.
        </Label>
      )}
      {!!answer && (
        <Card>
          <Label>✦ Veynoa</Label>
          <Label>{answer}</Label>
          {sources.map((s) => (
            <Button key={s.id} onPress={() => router.push(`/notes/${s.id}`)}>
              {s.title}
            </Button>
          ))}
        </Card>
      )}
      <Label muted size={12}>
        {query
          ? `${results.length} matching thoughts`
          : "Search stays on your device unless you ask Veynoa."}
      </Label>
      {results.map((n) => (
        <Card key={n.id}>
          <Button onPress={() => router.push(`/notes/${n.id}`)}>
            {n.title || "Untitled thought"}
          </Button>
          <Label muted>{n.body.slice(0, 160)}</Label>
        </Card>
      ))}
    </Page>
  );
}
