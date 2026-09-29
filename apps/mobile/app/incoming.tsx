import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import {
  getSharedPayloads,
  clearSharedPayloads,
  type SharePayload,
} from "expo-sharing";
import { randomUUID } from "expo-crypto";
import { useApp } from "../src/stores/app";
import { db, repository } from "../src/database/repository";
import { workspace, type Attachment } from "../src/database/workspace";
import { readAttachment } from "../src/services/documents";
import { Page, Card, Label, Field, Button } from "../src/components/ui";
export default function Incoming() {
  const [payloads, setPayloads] = useState<SharePayload[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (Platform.OS === "web") return;
    try {
      const data = getSharedPayloads();
      setPayloads(data);
      setText(
        data
          .filter((p) => p.shareType === "text" || p.shareType === "url")
          .map((p) => p.value)
          .join("\n\n"),
      );
    } catch (e) {
      setError(String(e));
    }
  }, []);
  return (
    <Page
      title="Bring a thought in"
      eyebrow="SHARE TO VEYNOA"
      action={
        <Button onPress={() => router.replace("/workspace")}>Workspace</Button>
      }
    >
      <Card>
        <Label muted>
          Review text or links before saving to your inbox. Native sharing also
          accepts images, PDFs and text files. Links are saved as text; Veynoa
          does not automatically fetch their contents.
        </Label>
        <Field
          accessibilityLabel="Shared text"
          multiline
          placeholder="Paste text or a link…"
          value={text}
          onChangeText={setText}
          style={{ minHeight: 180 }}
        />
        {payloads
          .filter((p) => p.shareType !== "text" && p.shareType !== "url")
          .map((p, i) => (
            <Label key={i}>{p.mimeType || p.shareType} · attachment</Label>
          ))}
        {!!error && <Label>{error}</Label>}
        <Button
          disabled={busy || (!text.trim() && !payloads.length)}
          primary
          onPress={() => {
            setBusy(true);
            setError("");
            void (async () => {
              const noteId = randomUUID();
              const files: Attachment[] = [];
              for (const p of payloads.filter(
                (p) => p.shareType !== "text" && p.shareType !== "url",
              )) {
                if (
                  !/^(image\/(png|jpeg|webp)|application\/pdf|text\/plain)$/.test(
                    p.mimeType || "",
                  )
                )
                  throw new Error(
                    "This attachment type is not supported. Share PNG, JPEG, WebP, PDF or text.",
                  );
                files.push({
                  id: randomUUID(),
                  noteId,
                  name: decodeURIComponent(
                    p.value.split("/").pop() || "Shared file",
                  ),
                  mime: p.mimeType!,
                  data: await readAttachment(p.value),
                  extracted: "",
                });
              }
              let saved = "";
              await (
                await db()
              ).withTransactionAsync(async () => {
                const n = await repository.create(
                  "note",
                  text,
                  text.split("\n")[0].slice(0, 70) || "Shared files",
                );
                saved = n.id;
                for (const f of files)
                  await workspace.attach({ ...f, noteId: n.id });
              });
              if (Platform.OS !== "web") clearSharedPayloads();
              await useApp.getState().refresh();
              router.replace(`/notes/${saved}`);
            })()
              .catch((e) =>
                setError(e instanceof Error ? e.message : String(e)),
              )
              .finally(() => setBusy(false));
          }}
        >
          Save to inbox
        </Button>
        <Label muted>
          To add files from this device, save a note and open Note tools →
          Attachments.
        </Label>
      </Card>
    </Page>
  );
}
