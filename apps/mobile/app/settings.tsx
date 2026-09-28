import { useState } from "react";
import { Alert, Platform, Switch } from "react-native";
import { router } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { markdown } from "@veynoa/domain";
import { repository } from "../src/database/repository";
import { useApp } from "../src/stores/app";
import { Button, Card, Field, Label, Page, Row } from "../src/components/ui";
export default function Settings() {
  const settings = useApp((s) => s.settings);
  const jobs = useApp((s) => s.jobs);
  const [url, setUrl] = useState(settings.gatewayUrl);
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const save = useApp((s) => s.setSettings);
  const run = (fn: () => Promise<unknown>) =>
    void fn().catch(useApp.getState().fail);
  const exportData = async (format: "json" | "md") => {
    const data = await repository.exportData();
    const content =
      format === "json" ? JSON.stringify(data, null, 2) : markdown(data.notes);
    if (Platform.OS === "web") {
      const blob = new Blob([content], {
        type: format === "json" ? "application/json" : "text/markdown",
      });
      const link = document.createElement("a");
      const uri = URL.createObjectURL(blob);
      link.href = uri;
      link.download = `veynoa-export.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(uri), 1000);
    } else {
      const file = new File(Paths.cache, `veynoa-export.${format}`);
      file.create({ overwrite: true });
      file.write(content);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri);
      else throw new Error("Sharing is not available on this device.");
    }
  };
  const transcribe = async () => {
    for (const note of useApp.getState().notes) {
      for (const r of await repository.recordings(note.id)) {
        if (!r.transcribed)
          await repository.enqueue({
            id: `transcribe:${r.id}`,
            noteId: note.id,
            type: "transcribe",
            payload: JSON.stringify({ recordingId: r.id }),
          });
      }
    }
    await useApp.getState().refresh();
    void useApp.getState().drain();
  };
  return (
    <Page
      title="Make it yours."
      subtitle="Your thoughts. Your boundaries."
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
      <Card>
        <Label size={22}>Privacy first</Label>
        <Row>
          <Switch
            accessibilityLabel="Local-only mode"
            value={settings.localOnly}
            onValueChange={(localOnly) => run(() => save({ localOnly }))}
          />
          <Label>Local-only mode {settings.localOnly ? "on" : "off"}</Label>
        </Row>
        <Label muted>
          When local-only is on, no notes or audio are sent for AI processing.
          Turning it off allows selected note content and queued recordings to
          be sent to your configured gateway and its AI provider. Notes remain
          stored on this device.
        </Label>
        <Label muted size={12}>
          Local storage is not app-level encrypted. Device backups may include
          it.
        </Label>
        <Field
          accessibilityLabel="AI gateway URL"
          value={url}
          onChangeText={setUrl}
          placeholder="https://your-worker.workers.dev"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Button
          onPress={() =>
            run(async () => {
              if (url) {
                const parsed = new URL(url);
                if (
                  parsed.protocol !== "https:" &&
                  !["localhost", "127.0.0.1"].includes(parsed.hostname)
                )
                  throw new Error("Use an HTTPS gateway URL.");
              }
              await save({ gatewayUrl: url.trim() });
              setMessage("Gateway saved.");
            })
          }
        >
          Save gateway
        </Button>
        {!!message && <Label muted>{message}</Label>}
      </Card>
      <Card>
        <Label size={22}>A familiar welcome</Label>
        <Row>
          {(["always", "daily", "never"] as const).map((greeting) => (
            <Button
              key={greeting}
              primary={settings.greeting === greeting}
              onPress={() => run(() => save({ greeting }))}
            >
              {greeting === "daily" ? "Once per day" : greeting}
            </Button>
          ))}
        </Row>
        <Label>Appearance</Label>
        <Row>
          {(["system", "light", "dark"] as const).map((theme) => (
            <Button
              key={theme}
              primary={settings.theme === theme}
              onPress={() => run(() => save({ theme }))}
            >
              {theme}
            </Button>
          ))}
        </Row>
      </Card>
      <Card>
        <Label size={22}>Processing queue</Label>
        <Label muted>
          {jobs.length} pending or failed requests. Processing runs while the
          app is open.
        </Label>
        {jobs.map((j) => (
          <Label key={j.id} muted size={12}>
            {j.type} · {j.state} · {j.attempts} attempts
            {j.error ? ` · ${j.error}` : ""}
          </Label>
        ))}
        <Row>
          <Button
            disabled={settings.localOnly}
            onPress={() =>
              run(async () => {
                await repository.retryJobs();
                await useApp.getState().refresh();
                void useApp.getState().drain();
              })
            }
          >
            Retry failed jobs
          </Button>
          <Button disabled={settings.localOnly} onPress={() => run(transcribe)}>
            Transcribe saved audio
          </Button>
        </Row>
      </Card>
      <Card>
        <Label size={22}>Take your thoughts with you</Label>
        <Label muted>
          JSON includes note metadata, analysis and canvas positions. Audio
          files are not embedded in these exports.
        </Label>
        <Row>
          <Button onPress={() => run(() => exportData("json"))}>
            Export JSON
          </Button>
          <Button onPress={() => run(() => exportData("md"))}>
            Export Markdown
          </Button>
        </Row>
      </Card>
      <Card>
        <Label size={22}>Erase this device</Label>
        <Label muted>
          This permanently removes all notes, recordings, queued work, and
          preferences. Export your notes first if you want to keep them.
        </Label>
        <Field
          accessibilityLabel="Type DELETE to erase all data"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Type DELETE"
        />
        <Button
          disabled={confirm !== "DELETE"}
          onPress={() =>
            run(async () => {
              await useApp.getState().reset();
              router.replace("/");
            })
          }
        >
          Delete all local data
        </Button>
      </Card>
    </Page>
  );
}
