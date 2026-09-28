import { useEffect, useRef, useState } from "react";
import { AppState, BackHandler, Platform, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useApp } from "../../src/stores/app";
import { audioDirectory, repository } from "../../src/database/repository";
import {
  Button,
  Card,
  Label,
  Orb,
  Page,
  Row,
  useTheme,
} from "../../src/components/ui";
export default function Capture() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const state = useAudioRecorderState(recorder, 100);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progressive, setProgressive] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const busyRef = useRef(false);
  const stoppedUri = useRef<string | null>(null);
  const segmentAction = useRef<() => void>(() => {});
  const [message, setMessage] = useState(
    "Your microphone stays off until you tap Record.",
  );
  const seconds = useRef(0);
  const note = useApp((s) => s.notes.find((n) => n.id === id));
  const settings = useApp((s) => s.settings);
  const t = useTheme();
  useEffect(() => {
    seconds.current = state.durationMillis / 1000;
  }, [state.durationMillis]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active" && recorder.isRecording) {
        recorder.pause();
        setMessage("Paused when the app left the foreground.");
      }
    });
    return () => sub.remove();
  }, [recorder]);
  useEffect(() => {
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      () => started,
    );
    return () => sub.remove();
  }, [started]);
  useEffect(() => {
    if (!progressive || !started) return;
    const timer = setInterval(() => {
      if (recorder.isRecording && seconds.current >= 12 && !busyRef.current)
        segmentAction.current();
    }, 500);
    return () => clearInterval(timer);
  }, [progressive, started, recorder]);
  const record = async () => {
    setBusy(true);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setMessage(
          "Microphone permission is off. You can enable it in device settings, or keep typing.",
        );
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      if (!started) await recorder.prepareToRecordAsync();
      recorder.record();
      setStarted(true);
      setMessage("Listening. Take your time.");
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => {},
      );
    } catch (e) {
      useApp.getState().fail(e);
    } finally {
      setBusy(false);
    }
  };
  const finish = async (continueRecording = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const duration = seconds.current;
      if (!stoppedUri.current) {
        await recorder.stop();
        stoppedUri.current = recorder.uri;
      }
      const uri = stoppedUri.current;
      if (!uri) throw new Error("The recorder did not produce an audio file.");
      const directory = audioDirectory();
      directory.create({ intermediates: true, idempotent: true });
      const recordingId = randomUUID();
      const extension = uri.split(".").pop()?.split("?")[0] || "m4a";
      const file = new File(directory, `${recordingId}.${extension}`);
      new File(uri).copy(file);
      await repository.saveCapture(
        {
          id: recordingId,
          noteId: id,
          uri: file.uri,
          createdAt: Date.now(),
          duration,
          transcribed: false,
        },
        !useApp.getState().settings.localOnly,
      );
      stoppedUri.current = null;
      setTotalSeconds((s) => s + duration);
      if (continueRecording && AppState.currentState === "active") {
        seconds.current = 0;
        await recorder.prepareToRecordAsync();
        recorder.record();
        setMessage("Listening. Earlier segments are being transcribed.");
      } else {
        setStarted(false);
        await setAudioModeAsync({ allowsRecording: false });
      }
      await useApp.getState().refresh();
      void useApp.getState().drain();
      if (!continueRecording) router.replace(`/notes/${id}`);
    } catch (e) {
      useApp.getState().fail(e);
      setMessage(
        "Recording could not be saved. Keep this screen open and retry.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  segmentAction.current = () => void finish(true);
  if (Platform.OS === "web")
    return (
      <Page
        title="Capture on your phone."
        subtitle="Durable voice recording is available in the Android and iOS app."
      >
        <Label muted>
          This web preview supports notes, search and visual thinking. Open
          Veynoa in Expo Go for microphone capture and playback.
        </Label>
        <Button onPress={() => router.replace(`/notes/${id}`)}>
          Back to note
        </Button>
      </Page>
    );
  return (
    <Page
      title="Let it unfold."
      subtitle="A thought doesn’t have to arrive fully formed."
    >
      <Orb
        listening={state.isRecording}
        level={Math.max(0, ((state.metering ?? -60) + 60) / 60)}
      />
      <Label
        size={30}
        style={{ textAlign: "center", fontVariant: ["tabular-nums"] }}
      >
        {Math.floor((totalSeconds * 1000 + state.durationMillis) / 60000)
          .toString()
          .padStart(2, "0")}
        :
        {Math.floor((totalSeconds + state.durationMillis / 1000) % 60)
          .toString()
          .padStart(2, "0")}
      </Label>
      <Label muted style={{ textAlign: "center" }}>
        {message}
      </Label>
      <View
        style={{
          flexDirection: "row",
          height: 55,
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        {Array.from({ length: 25 }, (_, i) => (
          <View
            key={i}
            style={{
              width: 4,
              borderRadius: 3,
              backgroundColor: t.accent,
              height: state.isRecording
                ? 8 +
                  Math.max(0, (state.metering ?? -60) + 60) *
                    Math.abs(Math.sin(i * 1.8))
                : 5,
            }}
          />
        ))}
      </View>
      <Row>
        {state.isRecording ? (
          <Button
            disabled={busy}
            onPress={() => {
              recorder.pause();
              setMessage("Paused. Your thought is still here.");
            }}
          >
            Pause
          </Button>
        ) : (
          <Button
            primary
            disabled={busy || !!stoppedUri.current}
            onPress={() => void record()}
          >
            {started ? "Resume" : "Record"}
          </Button>
        )}
        <Button disabled={!started || busy} onPress={() => void finish()}>
          Save recording
        </Button>
        {!started && (
          <Button onPress={() => router.replace(`/notes/${id}`)}>
            Back to note
          </Button>
        )}
      </Row>
      {!started && (
        <Button
          disabled={settings.localOnly}
          onPress={() => setProgressive(!progressive)}
        >
          {progressive
            ? "Segmented dictation on · experimental"
            : "Enable segmented dictation · experimental"}
        </Button>
      )}
      <Card>
        <Label>
          {settings.localOnly
            ? "Audio stays on this device."
            : "Cloud transcription is enabled."}
        </Label>
        <Label muted size={13}>
          {settings.localOnly
            ? "You can play the recording from your note. Enable cloud AI in Settings to transcribe it later."
            : "After saving, this recording is queued for transcription. Text is appended to your note when processing succeeds."}
        </Label>
      </Card>
      {note?.body && <Label>{note.body}</Label>}
      <Label muted size={12}>
        {progressive
          ? "Audio is saved in approximately 12-second segments. Text arrives as each segment is processed. Brief gaps may occur between segments; keep the app open."
          : "Save a recording to transcribe it, or enable experimental segmented dictation before recording."}
      </Label>
    </Page>
  );
}
