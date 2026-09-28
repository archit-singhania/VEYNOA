import { useMemo, useState } from "react";
import { router } from "expo-router";
import { dayKey } from "@veynoa/domain";
import { cloud, useApp } from "../../src/stores/app";
import { Button, Card, Field, Label, Page, Row } from "../../src/components/ui";
export default function Timeline() {
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
      subtitle="A quiet record of where your mind has been."
    >
      <Card>
        <Label size={22}>Your DayStory</Label>
        <Field
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
        <Card key={day}>
          <Label muted size={12}>
            {day}
          </Label>
          {items.map((n) => (
            <Row key={n.id}>
              <Label muted size={12}>
                {new Date(n.createdAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Label>
              <Button onPress={() => router.push(`/notes/${n.id}`)}>
                {n.title || "Untitled thought"}
              </Button>
              <Label muted size={12}>
                {n.kind}
              </Label>
            </Row>
          ))}
        </Card>
      ))}
      {!notes.length && (
        <Label muted>Your timeline begins with your first thought.</Label>
      )}
    </Page>
  );
}
