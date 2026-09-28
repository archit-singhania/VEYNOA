import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { View, Pressable } from "react-native";
import type { Note } from "@veynoa/domain";
import { cloud, retrieve, useApp } from "../../src/stores/app";
import { repository } from "../../src/database/repository";
import {
  Button,
  Card,
  Field,
  Label,
  Page,
  Row,
  Orb,
  Eyebrow,
  serif,
  useTheme,
} from "../../src/components/ui";
import { Icon } from "../../src/components/Icon";
export default function Search() {
  const t = useTheme();
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
      title="It’s in there somewhere."
      eyebrow="FIND & ASK"
      subtitle="A word, a question, something you almost remember."
    >
      <Card style={{ gap: 20, padding: 28 }}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Icon name="search" color={t.accent} size={23} />
          <Label size={22} style={{ fontFamily: serif }}>
            Follow a thought.
          </Label>
        </View>
        <Field
          accessibilityLabel="Search your thoughts"
          value={query}
          onChangeText={setQuery}
          placeholder="What have I been thinking about?"
          autoFocus={false}
          returnKeyType="search"
          onSubmitEditing={() => {
            if (!localOnly && query.trim()) void ask();
          }}
        />
        <Row>
          <Button
            primary
            icon="spark"
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
      </Card>
      {!query && (
        <View style={{ gap: 16 }}>
          <Eyebrow>A FEW PLACES TO START</Eyebrow>
          {[
            "An idea I wanted to explore",
            "What have I been thinking about lately?",
            "Something I need to remember",
          ].map((prompt, i) => (
            <Pressable
              key={prompt}
              accessibilityRole="button"
              onPress={() => setQuery(prompt)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                padding: 20,
                borderBottomWidth: 1,
                borderColor: t.line,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Label muted size={11}>
                0{i + 1}
              </Label>
              <Label size={18} style={{ fontFamily: serif, flex: 1 }}>
                {prompt}
              </Label>
              <Icon name="arrow" size={18} color={t.accent} />
            </Pressable>
          ))}
        </View>
      )}
      {!!answer && (
        <Card>
          <Eyebrow>✦ A LITTLE CLARITY</Eyebrow>
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
      {!!query && !results.length && !answer && (
        <View style={{ alignItems: "center", padding: 30, gap: 10 }}>
          <Icon name="search" color={t.muted} size={26} />
          <Label style={{ fontFamily: serif }} size={22}>
            A different word might open the door.
          </Label>
          <Label muted size={12}>
            No matching thoughts. Try a shorter phrase.
          </Label>
        </View>
      )}
    </Page>
  );
}
