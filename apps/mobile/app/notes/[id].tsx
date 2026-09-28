import { useEffect, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAudioPlayer } from "expo-audio";
import {
  localSuggestions,
  related,
  type Recording,
  type Kind,
} from "@veynoa/domain";
import { useApp } from "../../src/stores/app";
import { repository } from "../../src/database/repository";
import {
  Button,
  Card,
  Field,
  Label,
  Page,
  Row,
  useTheme,
} from "../../src/components/ui";
function Playback({ recording }: { recording: Recording }) {
  const player = useAudioPlayer(recording.uri);
  return (
    <Row>
      <Button
        onPress={() => {
          void player.seekTo(0);
          player.play();
        }}
      >
        Play recording
      </Button>
      <Button onPress={() => player.pause()}>Pause audio</Button>
      <Label muted size={12}>
        {Math.round(recording.duration)} seconds
      </Label>
    </Row>
  );
}
export default function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = useApp((s) => s.notes.find((n) => n.id === id));
  const analysis = useApp((s) => s.analyses[id]);
  const settings = useApp((s) => s.settings);
  const notes = useApp((s) => s.notes);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [status, setStatus] = useState("Saved on this device");
  const t = useTheme();
  useEffect(() => {
    void repository
      .recordings(id)
      .then(setRecordings)
      .catch(useApp.getState().fail);
  }, [id, notes]);
  useEffect(() => {
    if (!note?.body.trim() || settings.localOnly) return;
    const timer = setTimeout(
      () => void useApp.getState().analyze(id).catch(useApp.getState().fail),
      3000,
    );
    return () => clearTimeout(timer);
  }, [id, note?.revision, settings.localOnly]);
  if (!note)
    return (
      <Page title="Thought unavailable">
        <Button onPress={() => router.replace("/")}>Back to notes</Button>
      </Page>
    );
  const update = async (patch: Partial<typeof note>) => {
    setStatus("Saving…");
    try {
      await useApp.getState().update(id, patch);
      setStatus("Saved on this device");
    } catch {
      setStatus("Save failed — retry your edit");
    }
  };
  const suggestions = analysis?.suggestions ?? localSuggestions(note.body);
  const linked = related(notes, note.title + " " + note.body, id).slice(0, 3);
  const remove = () => {
    const run = () =>
      void useApp
        .getState()
        .remove(id)
        .then(() => router.replace("/"))
        .catch(useApp.getState().fail);
    if (Platform.OS === "web") {
      if (window.confirm("Delete this thought and its recordings?")) run();
    } else
      Alert.alert(
        "Delete this thought?",
        "Its recordings and derived data will also be removed.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: run },
        ],
      );
  };
  return (
    <Page
      title="A little space."
      subtitle={status}
      action={
        <Button
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        >
          Done
        </Button>
      }
    >
      <Row>
        <Button onPress={() => void update({ pinned: !note.pinned })}>
          {note.pinned ? "Unpin" : "Pin"}
        </Button>
        <Button onPress={() => void update({ archived: !note.archived })}>
          {note.archived ? "Restore" : "Archive"}
        </Button>
        <Button onPress={() => router.push(`/capture/${id}`)}>Speak</Button>
        <Button onPress={() => router.push(`/canvas/${id}`)}>
          Bloom / Canvas
        </Button>
      </Row>
      <Field
        accessibilityLabel="Note title"
        placeholder="Untitled thought"
        value={note.title}
        maxLength={300}
        onChangeText={(title) => void update({ title })}
        style={{
          fontSize: 27,
          fontWeight: "600",
          borderWidth: 0,
          backgroundColor: "transparent",
          paddingHorizontal: 0,
        }}
      />
      <Field
        accessibilityLabel="Note content"
        placeholder="Start typing, or speak. There’s no wrong place to begin."
        multiline
        textAlignVertical="top"
        value={note.body}
        onChangeText={(body) => void update({ body })}
        style={{
          minHeight: 280,
          fontSize: 18,
          lineHeight: 29,
          borderWidth: 0,
          backgroundColor: "transparent",
          paddingHorizontal: 0,
        }}
      />
      <Row>
        {(["note", "idea", "task", "journal", "project"] as Kind[]).map(
          (kind) => (
            <Button
              key={kind}
              primary={note.kind === kind}
              onPress={() => void update({ kind })}
            >
              {kind}
            </Button>
          ),
        )}
      </Row>
      {note.kind === "task" && (
        <Button onPress={() => void update({ completed: !note.completed })}>
          {note.completed ? "Reopen task" : "Mark complete"}
        </Button>
      )}
      {suggestions.length > 0 && (
        <Card>
          <Label style={{ color: t.accent }}>
            ✦{" "}
            {analysis
              ? "Veynoa noticed something"
              : "A small suggestion · on-device rules"}
          </Label>
          {suggestions
            .filter((s) => s.kind !== note.kind)
            .map((s, i) => (
              <Button key={i} onPress={() => void update({ kind: s.kind })}>
                {s.label}
              </Button>
            ))}
        </Card>
      )}
      {analysis && (
        <Label muted size={12}>
          {analysis.topics.join(" · ")}
        </Label>
      )}
      {linked.length > 0 && (
        <Card>
          <Label>Related thoughts · shared words</Label>
          {linked.map(({ note: n }) => (
            <Button key={n.id} onPress={() => router.push(`/notes/${n.id}`)}>
              {n.title || "Untitled"}
            </Button>
          ))}
        </Card>
      )}
      {recordings.map((r) => (
        <Playback key={r.id} recording={r} />
      ))}
      <Row>
        <Button
          disabled={settings.localOnly || !note.body.trim()}
          onPress={() =>
            void useApp.getState().analyze(id).catch(useApp.getState().fail)
          }
        >
          Analyze thought
        </Button>
        <Button onPress={remove}>Delete</Button>
      </Row>
    </Page>
  );
}
