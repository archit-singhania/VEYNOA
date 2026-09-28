import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { dayKey, greeting, type Note, type Kind } from "@veynoa/domain";
import { useApp } from "../../src/stores/app";
import { useInterface } from "../../src/stores/interface";
import {
  Button,
  Card,
  Field,
  Label,
  Page,
  Row,
  Orb,
  Eyebrow,
  IconButton,
  serif,
  useTheme,
} from "../../src/components/ui";
import { Icon, type IconName } from "../../src/components/Icon";
const collections = [
  "All thoughts",
  "Ideas",
  "Journal",
  "Tasks",
  "Projects",
  "Archived",
];
const kindIcons: Partial<Record<Kind, IconName>> = {
  idea: "spark",
  journal: "pen",
  task: "check",
  project: "grid",
  note: "notes",
};
export default function Notes() {
  const notes = useApp((s) => s.notes);
  const [filter, setFilter] = useState("All thoughts");
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const t = useTheme();
  const width = useWindowDimensions().width;
  const wide = width >= 1250;
  const columns = width >= 760 && layout === "grid" ? 2 : 1;
  const live = notes.filter((n) => !n.archived);
  const today = live.filter((n) => dayKey(n.createdAt) === dayKey());
  const tasks = live.filter((n) => n.kind === "task" && !n.completed);
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
  const add = async (voice = false, kind: Kind = "note") => {
    if (!voice && kind === "note") {
      useInterface.getState().openCapture();
      return;
    }
    try {
      const n = await useApp.getState().create(kind);
      router.push(voice ? `/capture/${n.id}` : `/notes/${n.id}`);
    } catch (e) {
      useApp.getState().fail(e);
    }
  };
  const header = (
    <View style={{ gap: 27 }}>
      <View style={{ flexDirection: "row", gap: 20 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: t.hero,
            borderRadius: 24,
            padding: width < 650 ? 25 : 32,
            overflow: "hidden",
            minHeight: 242,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              position: "absolute",
              right: width < 650 ? -52 : 8,
              top: 12,
              opacity: width < 650 ? 0.35 : 1,
            }}
          >
            <Orb decorative size={220} />
          </View>
          <View style={{ maxWidth: width < 650 ? "88%" : "66%", gap: 13 }}>
            <Eyebrow color="#D3CAA9">A quiet place for a busy mind</Eyebrow>
            <Label
              size={width < 650 ? 30 : 37}
              style={{
                fontFamily: serif,
                color: "#F5F3E5",
                lineHeight: width < 650 ? 37 : 44,
                letterSpacing: -0.7,
              }}
            >
              Less holding on.{"\n"}More letting it out.
            </Label>
            <Label size={12} style={{ color: t.heroMuted, maxWidth: 300 }}>
              An idea, a passing thought, a whole new beginning. Start with your
              voice.
            </Label>
            <View style={{ alignSelf: "flex-start", marginTop: 3 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void add(true)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 19,
                  minHeight: 44,
                  borderRadius: 12,
                  backgroundColor: t.heroAccent,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon name="mic" size={17} color="#294433" />
                <Label
                  size={12}
                  style={{ color: "#294433", fontWeight: "600" }}
                >
                  Speak your mind
                </Label>
                <Icon name="arrow" size={15} color="#294433" />
              </Pressable>
            </View>
          </View>
        </View>
        {wide && (
          <Card
            style={{
              width: 240,
              backgroundColor: t.tint,
              justifyContent: "space-between",
              borderColor: "transparent",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Eyebrow>Today, so far</Eyebrow>
              <Icon name="sun" color={t.gold} />
            </View>
            <View>
              <Label size={46} style={{ fontFamily: serif, lineHeight: 54 }}>
                {String(today.length).padStart(2, "0")}
              </Label>
              <Label muted size={12}>
                {today.length === 1 ? "thought captured" : "thoughts captured"}
              </Label>
            </View>
            <View
              style={{
                borderTopWidth: 1,
                borderColor: t.line,
                paddingTop: 13,
                gap: 8,
              }}
            >
              <Label muted size={12}>
                {tasks.length
                  ? `${tasks.length} open ${tasks.length === 1 ? "task" : "tasks"} to come back to.`
                  : "Space for whatever comes next."}
              </Label>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/timeline")}
                style={{
                  minHeight: 32,
                  flexDirection: "row",
                  gap: 9,
                  alignItems: "center",
                }}
              >
                <Label size={12} style={{ fontWeight: "600" }}>
                  Visit your timeline
                </Label>
                <Icon name="arrow" size={16} color={t.accent} />
              </Pressable>
            </View>
          </Card>
        )}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={{ gap: 4 }}>
          <Label size={24} style={{ fontFamily: serif }}>
            Your collection
          </Label>
          <Label muted size={11}>
            {live.length} {live.length === 1 ? "thought" : "thoughts"}. All
            yours.
          </Label>
        </View>
        <Row>
          <IconButton
            name="grid"
            label="Grid view"
            selected={layout === "grid"}
            onPress={() => setLayout("grid")}
          />
          <IconButton
            name="list"
            label="List view"
            selected={layout === "list"}
            onPress={() => setLayout("list")}
          />
        </Row>
      </View>
      <View
        style={{
          flexDirection: width < 700 ? "column" : "row",
          gap: 14,
          alignItems: width < 700 ? "stretch" : "center",
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          <View style={{ flexDirection: "row", gap: 4 }}>
            {collections.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityState={{ selected: c === filter }}
                onPress={() => setFilter(c)}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 14,
                  justifyContent: "center",
                  borderRadius: 11,
                  backgroundColor: c === filter ? t.soft : "transparent",
                }}
              >
                <Label
                  size={12}
                  style={{
                    color: c === filter ? t.accent : t.muted,
                    fontWeight: c === filter ? "600" : "400",
                  }}
                >
                  {c}
                </Label>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={{ width: width < 700 ? "100%" : 190 }}>
          <Field
            accessibilityLabel="Filter notes"
            value={query}
            onChangeText={setQuery}
            placeholder="Search your thoughts…"
            style={{ fontSize: 12, minHeight: 44, padding: 12 }}
          />
        </View>
      </View>
    </View>
  );
  return (
    <Page
      title={
        width < 650 ? "A little more clarity." : "A clearer mind starts here."
      }
      eyebrow={new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}
      subtitle={`${greeting(new Date().getHours())} There’s room for every thought.`}
      scroll={false}
      action={
        <Row>
          {width < 1050 && (
            <IconButton
              name="settings"
              label="Settings and appearance"
              onPress={() => router.push("/settings")}
            />
          )}
          <Button
            primary
            icon="plus"
            onPress={() => void add()}
            onLongPress={() => void add(true)}
          >
            {width < 650 ? "New" : "New thought"}
          </Button>
        </Row>
      }
    >
      <FlatList
        key={columns}
        numColumns={columns}
        data={items}
        keyExtractor={(n) => n.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        columnWrapperStyle={columns > 1 ? { gap: 16 } : undefined}
        contentContainerStyle={{ gap: 16, paddingBottom: 36 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View
            style={{
              borderWidth: 1,
              borderColor: t.line,
              borderStyle: "dashed",
              borderRadius: 20,
              padding: 30,
              alignItems: "center",
              gap: 13,
              marginTop: 2,
            }}
          >
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: t.soft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={query ? "search" : "leaf"}
                color={t.accent}
                size={24}
              />
            </View>
            <Label size={25} style={{ fontFamily: serif, textAlign: "center" }}>
              {query
                ? "Nothing here, just yet."
                : "Every good idea begins somewhere."}
            </Label>
            <Label
              muted
              size={13}
              style={{ textAlign: "center", maxWidth: 360 }}
            >
              {query
                ? "Try another word or a different collection."
                : "Let your first thought land here. No perfect words needed."}
            </Label>
            <Row>
              {query ? (
                <Button
                  onPress={() => {
                    setQuery("");
                    setFilter("All thoughts");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <>
                  <Button icon="pen" onPress={() => void add()}>
                    Write a thought
                  </Button>
                  <Button icon="spark" onPress={() => void add(false, "idea")}>
                    Start an idea
                  </Button>
                </>
              )}
            </Row>
          </View>
        }
        renderItem={({ item: n, index }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${n.title || "Untitled"}`}
            onPress={() => router.push(`/notes/${n.id}`)}
            style={({ pressed, hovered }: any) => ({
              flex: 1,
              maxWidth: columns === 2 ? "50%" : "100%",
              minHeight: layout === "list" ? 120 : 205,
              padding: 23,
              borderRadius: 18,
              backgroundColor: n.pinned ? t.soft : t.card,
              borderWidth: 1,
              borderColor: hovered ? t.accent : t.line,
              opacity: pressed ? 0.75 : 1,
              gap: 14,
            })}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
              >
                <Icon
                  name={kindIcons[n.kind] || "notes"}
                  color={n.kind === "idea" ? t.gold : t.accent}
                  size={15}
                />
                <Eyebrow color={n.kind === "idea" ? t.gold : t.muted}>
                  {n.kind}
                  {n.completed ? " · done" : ""}
                </Eyebrow>
              </View>
              {n.pinned && <Icon name="pin" color={t.accent} size={14} />}
            </View>
            <Label
              size={23}
              numberOfLines={2}
              style={{ fontFamily: serif, lineHeight: 30 }}
            >
              {n.title || "Untitled thought"}
            </Label>
            <Label muted size={13} numberOfLines={2}>
              {n.body || "A little space, waiting for your words."}
            </Label>
            <View
              style={{
                marginTop: "auto",
                paddingTop: 7,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Label muted size={10}>
                {new Date(n.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {Math.max(1, Math.ceil(n.body.split(/\s+/).length / 200))} min
                read
              </Label>
              <Icon name="arrow" size={15} color={t.muted} />
            </View>
          </Pressable>
        )}
      />
    </Page>
  );
}
