import { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../src/stores/app";
import { Button, Card, Label, Page, useTheme } from "../../src/components/ui";
export default function Garden() {
  const notes = useApp((s) => s.notes);
  const analyses = useApp((s) => s.analyses);
  const [selected, setSelected] = useState<string | null>(null);
  const t = useTheme();
  const clusters = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const n of notes.filter((n) => !n.archived)) {
      const topics = analyses[n.id]?.topics.length
        ? analyses[n.id].topics
        : [n.kind];
      for (const topic of new Set(topics.map((t) => t.toLowerCase())))
        (groups[topic] ??= []).push(n.id);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [notes, analyses]);
  const members = notes.filter((n) =>
    clusters.find(([k]) => k === selected)?.[1].includes(n.id),
  );
  return (
    <Page
      title="Your memory garden."
      subtitle="The ideas you return to, slowly taking shape."
    >
      <View
        style={{
          minHeight: 260,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 18,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 20,
        }}
      >
        {clusters.map(([topic, ids], i) => (
          <Pressable
            key={topic}
            accessibilityRole="button"
            accessibilityLabel={`${topic}, ${ids.length} thoughts`}
            onPress={() => setSelected(topic)}
            style={{
              height: 100 + Math.min(70, ids.length * 8),
              width: 100 + Math.min(70, ids.length * 8),
              borderRadius: 100,
              backgroundColor: selected === topic ? t.accent : t.soft,
              alignItems: "center",
              justifyContent: "center",
              padding: 14,
              borderWidth: 1,
              borderColor: t.line,
              marginTop: i % 2 ? 20 : 0,
            }}
          >
            <Label
              size={16}
              style={{
                textAlign: "center",
                color:
                  selected === topic ? (t.dark ? "#111" : "white") : t.accent,
                fontWeight: "600",
              }}
            >
              {topic}
            </Label>
            <Label
              size={12}
              style={{
                color:
                  selected === topic ? (t.dark ? "#111" : "white") : t.muted,
              }}
            >
              {ids.length} thoughts
            </Label>
          </Pressable>
        ))}
      </View>
      {!clusters.length && (
        <Card>
          <Label size={22}>Give an idea a place to grow.</Label>
          <Label muted>
            Your notes will appear here by kind. After cloud analysis, their
            topics become clusters.
          </Label>
        </Card>
      )}
      {selected && (
        <Card>
          <Label size={24}>{selected}</Label>
          <Label muted>
            {members.length} thoughts ·{" "}
            {members.filter((n) => n.kind === "idea").length} ideas ·{" "}
            {members.filter((n) => n.kind === "task").length} tasks
          </Label>
          {members.length > 0 && (
            <Label muted size={12}>
              First captured{" "}
              {new Date(
                Math.min(...members.map((n) => n.createdAt)),
              ).toLocaleDateString()}
            </Label>
          )}
          {members.map((n) => (
            <Button key={n.id} onPress={() => router.push(`/notes/${n.id}`)}>
              {n.title || "Untitled thought"}
            </Button>
          ))}
        </Card>
      )}
    </Page>
  );
}
