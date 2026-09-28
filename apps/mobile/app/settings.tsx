import { useState } from "react";
import { Platform, Switch, Pressable, View } from "react-native";
import { router } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { markdown } from "@veynoa/domain";
import { repository } from "../src/database/repository";
import { useApp } from "../src/stores/app";
import {
  Button,
  Card,
  Field,
  Label,
  Page,
  Row,
  Eyebrow,
  useTheme,
  serif,
} from "../src/components/ui";
import { palettes, type Palette } from "../src/theme/tokens";
import { Icon } from "../src/components/Icon";
export default function Settings() {
  const settings = useApp((s) => s.settings);
  const t = useTheme();
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
        <Eyebrow>THE ATMOSPHERE</Eyebrow>
        <Label size={27} style={{ fontFamily: serif }}>
          A space that feels like you.
        </Label>
        <Label muted size={13}>
          Three considered palettes. A different mood, the same clarity.
        </Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          {(Object.entries(palettes) as [Palette, typeof palettes.grove][]).map(
            ([key, p]) => {
              const selected = (settings.palette || "grove") === key;
              const colors = p[t.dark ? "dark" : "light"];
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name} palette`}
                  accessibilityState={{ selected }}
                  aria-pressed={selected}
                  onPress={() => run(() => save({ palette: key }))}
                  style={{
                    flexGrow: 1,
                    flexBasis: 180,
                    borderRadius: 17,
                    borderWidth: 2,
                    borderColor: selected ? t.accent : t.line,
                    padding: 10,
                    gap: 11,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.bg,
                      height: 100,
                      borderRadius: 10,
                      padding: 12,
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        backgroundColor: colors.soft,
                        borderRadius: 5,
                      }}
                    />
                    <View style={{ flex: 1, gap: 7 }}>
                      <View
                        style={{
                          height: 37,
                          backgroundColor: colors.hero,
                          borderRadius: 6,
                        }}
                      />
                      <View style={{ flexDirection: "row", gap: 5, flex: 1 }}>
                        <View
                          style={{
                            flex: 1,
                            backgroundColor: colors.card,
                            borderRadius: 5,
                            borderWidth: 1,
                            borderColor: colors.line,
                          }}
                        />
                        <View
                          style={{
                            flex: 1,
                            backgroundColor: colors.tint,
                            borderRadius: 5,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 4,
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <View>
                      <Label size={14} style={{ fontWeight: "600" }}>
                        {p.name}
                      </Label>
                      <Label muted size={11}>
                        {p.description}
                      </Label>
                    </View>
                    {selected && (
                      <Icon name="check" color={t.accent} size={18} />
                    )}
                  </View>
                </Pressable>
              );
            },
          )}
        </View>
        <Row>
          {(["system", "light", "dark"] as const).map((theme) => (
            <Button
              key={theme}
              primary={settings.theme === theme}
              icon={
                theme === "dark"
                  ? "moon"
                  : theme === "light"
                    ? "sun"
                    : "settings"
              }
              onPress={() => run(() => save({ theme }))}
            >
              {theme === "system"
                ? "Match device"
                : theme === "light"
                  ? "Light"
                  : "Dark"}
            </Button>
          ))}
        </Row>
      </Card>
      <Card>
        <Label size={22}>Privacy first</Label>
        <Row>
          <Switch
            trackColor={{ false: t.line, true: t.accent }}
            thumbColor={t.card}
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
