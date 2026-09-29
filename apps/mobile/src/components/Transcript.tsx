import { useEffect, useState } from "react";
import { useAudioPlayer } from "expo-audio";
import { randomUUID } from "expo-crypto";
import type { Recording } from "@veynoa/domain";
import { formatTime } from "@veynoa/domain/src/workspace";
import { workspace, type Segment } from "../database/workspace";
import { Button, Card, Field, Label, Row } from "./ui";
export function Transcript({ recording }: { recording: Recording }) {
  const player = useAudioPlayer(recording.uri);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState(
    String(Math.max(1, Math.floor(recording.duration))),
  );
  const [text, setText] = useState("");
  const [id, setId] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void workspace
      .segments(recording.id)
      .then(setSegments)
      .catch((e) => setError(String(e)));
  }, [recording.id]);
  return (
    <Card>
      <Label>Recording · {formatTime(recording.duration)}</Label>
      <Row>
        <Button
          onPress={() => {
            void player.seekTo(0).then(() => player.play());
          }}
        >
          Play recording
        </Button>
        <Button onPress={() => player.pause()}>Pause</Button>
      </Row>
      <Label muted>
        Tap a segment to jump to its start. If your provider supplied no
        timestamps, add or correct them manually in seconds.
      </Label>
      {segments.map((s) => (
        <Row key={s.id}>
          <Button
            onPress={() => {
              void player.seekTo(s.start).then(() => player.play());
            }}
          >
            {formatTime(s.start)} · {s.text}
          </Button>
          <Button
            onPress={() => {
              setId(s.id);
              setStart(String(s.start));
              setEnd(String(s.end));
              setText(s.text);
            }}
          >
            Correct segment
          </Button>
        </Row>
      ))}
      <Field
        accessibilityLabel="Segment start seconds"
        value={start}
        onChangeText={setStart}
        placeholder="Start seconds"
        keyboardType="decimal-pad"
      />
      <Field
        accessibilityLabel="Segment end seconds"
        value={end}
        onChangeText={setEnd}
        placeholder="End seconds"
        keyboardType="decimal-pad"
      />
      <Field
        accessibilityLabel="Transcript segment text"
        value={text}
        onChangeText={setText}
        placeholder="Transcript text"
        multiline
      />
      <Button
        disabled={busy || !text.trim()}
        onPress={() => {
          setBusy(true);
          setError("");
          void (async () => {
            if (Number(end) > recording.duration + 1)
              throw new Error("End time exceeds the recording length.");
            await workspace.segment({
              id: id || randomUUID(),
              recordingId: recording.id,
              start: Number(start),
              end: Number(end),
              text,
            });
            setSegments(await workspace.segments(recording.id));
            setId(undefined);
            setText("");
          })()
            .catch((e) => setError(String(e)))
            .finally(() => setBusy(false));
        }}
      >
        Save timestamped segment
      </Button>
      {!!error && <Label>{error}</Label>}
      <Label muted>
        Corrections update this transcript; they do not silently replace text
        already appended to your note.
      </Label>
    </Card>
  );
}
