import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { greeting, type Note } from "@veynoa/domain";
import { useApp } from "../../src/stores/app";
import {
  Button,
  Card,
  Field,
  Label,
  Page,
  Row,
  useTheme,
} from "../../src/components/ui";
const collections = [
  "All notes",
  "Ideas",
  "Journal",
  "Tasks",
  "Projects",
  "Archived",
];
export default function Notes() {
  const notes = useApp((s) => s.notes);
  const [filter, setFilter] = useState("All notes");
  const [query, setQuery] = useState("");
  const t = useTheme();
  const items = useMemo(
    () =>
      notes
        .filter(
          (n) =>
            (filter === "Archived" ? n.archived : !n.archived) &&
            (filter === "Ideas"
              ? n.kind === "idea"
              : filter === "Journal"
                ? n.kind === "journal"
                : filter === "Tasks"
                  ? n.kind === "task"
                  : filter === "Projects"
                    ? n.kind === "project"
                    : true) &&
            `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) => +b.pinned - +a.pinned || b.updatedAt - a.updatedAt),
    [notes, filter, query],
  );
  const add = async (voice = false) => {
    try {
      const n = await useApp.getState().create();
      router.push(voice ? `/capture/${n.id}` : `/notes/${n.id}`);
    } catch (e) {
      useApp.getState().fail(e);
    }
  };
  return (
    <Page
      title="Your thoughts."
      subtitle={`${greeting(new Date().getHours())} Make a little room for your mind.`}
      scroll={false}
      action={
        <Button onPress={() => router.push("/settings")}>Settings</Button>
      }
    >
      <Row>
        <Button
          primary
          onPress={() => void add()}
          onLongPress={() => void add(true)}
        >
          ＋ New thought
        </Button>
        <Button onPress={() => void add(true)}>Speak</Button>
      </Row>
      <Field
        accessibilityLabel="Filter notes"
        value={query}
        onChangeText={setQuery}
        placeholder="Find a thought…"
      />
      <Row>
        {collections.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityState={{ selected: c === filter }}
            onPress={() => setFilter(c)}
            style={{
              minHeight: 44,
              paddingHorizontal: 13,
              justifyContent: "center",
              borderRadius: 12,
              backgroundColor: c === filter ? t.soft : "transparent",
            }}
          >
            <Label
              size={13}
              style={{ color: c === filter ? t.accent : t.muted }}
            >
              {c}
            </Label>
          </Pressable>
        ))}
      </Row>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          <Card>
            <Label size={23}>A quieter place to think.</Label>
            <Label muted>
              {query
                ? "No thoughts match this search."
                : "Type a first thought, or tap Speak and let it unfold."}
            </Label>
          </Card>
        }
        renderItem={({ item: n }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${n.title || "Untitled"}`}
            onPress={() => router.push(`/notes/${n.id}`)}
          >
            <Card>
              <Row>
                <Label
                  size={11}
                  style={{
                    color: t.accent,
                    textTransform: "uppercase",
                    letterSpacing: 1.4,
                  }}
                >
                  {n.pinned ? "PINNED · " : ""}
                  {n.kind}
                  {n.completed ? " · DONE" : ""}
                </Label>
              </Row>
              <Label size={21} style={{ fontWeight: "600" }}>
                {n.title || "Untitled thought"}
              </Label>
              <Label muted>
                {n.body.slice(0, 145) || "Waiting for your first words…"}
              </Label>
              <Label muted size={11}>
                {new Date(n.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Label>
            </Card>
          </Pressable>
        )}
      />
    </Page>
  );
}
