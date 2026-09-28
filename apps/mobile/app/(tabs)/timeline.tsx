import { useMemo, useState } from "react";
import { router } from "expo-router";
import { View, Pressable } from "react-native";
import { dayKey } from "@veynoa/domain";
import { cloud, useApp } from "../../src/stores/app";
import {
  Button,
  Card,
  Field,
  Label,
  Page,
  Row,
  Eyebrow,
  serif,
  useTheme,
} from "../../src/components/ui";
import { Icon } from "../../src/components/Icon";
export default function Timeline() {
  const t = useTheme();
  const notes = useApp((s) => s.notes);
  const localOnly = useApp((s) => s.settings.localOnly);
  const [date, setDate] = useState(dayKey());
  const [story, setStory] = useState<{
    summary: string;
    openItems: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const groups = useMemo(() => {
    const result: Record<string, typeof notes> = {};
    for (const n of [...notes]
      .filter((n) => !n.archived)
      .sort((a, b) => b.createdAt - a.createdAt)) {
      const key = dayKey(n.createdAt);
      (result[key] ??= []).push(n);
    }
    return result;
  }, [notes]);
  const daily = (groups[date] ?? []).filter((n) => n.body.trim());
  const generate = async () => {
    setBusy(true);
    try {
      setStory(
        await cloud("story", {
          date,
          sources: daily.slice(0, 8).map((n) => ({
            id: n.id,
            title: n.title,
            text: n.body.slice(0, 2000),
          })),
        }),
      );
      setSaved(false);
    } catch (e) {
      useApp.getState().fail(e);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!story) return;
    try {
      await useApp
        .getState()
        .create(
          "journal",
          story.summary +
            (story.openItems.length
              ? "\n\nOpen threads\n" +
                story.openItems.map((x) => "• " + x).join("\n")
              : ""),
          `Your day · ${date}`,
        );
      setSaved(true);
    } catch (e) {
      useApp.getState().fail(e);
    }
  };
  return (
    <Page
      title="Days into stories."
      eyebrow="THE TIMELINE"
      subtitle="A quiet record of where your mind has been."
    >
      <Card style={{ backgroundColor: t.tint, borderColor: "transparent" }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Eyebrow>THE DAILY REFLECTION</Eyebrow>
          <Icon name="sun" color={t.gold} size={24} />
        </View>
        <Label size={29} style={{ fontFamily: serif }}>
          Find the shape of your day.
        </Label>
        <Label muted size={13}>
          Gather the moments, ideas, and open threads into one thoughtful
          reflection.
        </Label>
        <Field
          editable={!busy}
          accessibilityLabel="DayStory date YYYY-MM-DD"
          value={date}
          onChangeText={(v) => {
            setDate(v);
            setStory(null);
          }}
          placeholder="YYYY-MM-DD"
        />
        <Label muted size={13}>
          {daily.length} thoughts on this day. The eight most recent are used
          for the summary.
        </Label>
        <Button
          primary
          icon="spark"
          disabled={
            localOnly ||
            daily.length < 2 ||
            busy ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date)
          }
          onPress={() => void generate()}
        >
          {busy ? "Gathering your day…" : "Reflect on this day"}
        </Button>
        {daily.length < 2 && (
          <Label muted size={12}>
            Capture at least two thoughts to create a DayStory.
          </Label>
        )}
        {story && (
          <>
            <Label>{story.summary}</Label>
            {story.openItems.map((x, i) => (
              <Label key={i} muted>
                ○ {x}
              </Label>
            ))}
            <Button disabled={saved} onPress={() => void save()}>
              {saved ? "Saved to journal" : "Save as journal"}
            </Button>
          </>
        )}
      </Card>
      {Object.entries(groups).map(([day, items]) => (
        <View key={day} style={{ gap: 20 }}>
          <Row>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: t.gold,
              }}
            />
            <Eyebrow>
              {new Date(day + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Eyebrow>
          </Row>
          <View
            style={{
              marginLeft: 3,
              borderLeftWidth: 1,
              borderColor: t.line,
              paddingLeft: 24,
              gap: 12,
            }}
          >
            {items.map((n) => (
              <Pressable
                key={n.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${n.title || "Untitled thought"}`}
                onPress={() => router.push(`/notes/${n.id}`)}
                style={({ pressed }) => ({
                  padding: 22,
                  borderRadius: 17,
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.line,
                  gap: 8,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Eyebrow>{n.kind}</Eyebrow>
                  <Label muted size={10}>
                    {new Date(n.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Label>
                </View>
                <Label size={23} style={{ fontFamily: serif }}>
                  {n.title || "Untitled thought"}
                </Label>
                <Label muted size={13} numberOfLines={2}>
                  {n.body || "A moment to return to."}
                </Label>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      {!notes.length && (
        <Label muted>Your timeline begins with your first thought.</Label>
      )}
    </Page>
  );
}
