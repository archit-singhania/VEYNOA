import { useEffect, useState } from "react";
import { Image } from "react-native";
import * as Picker from "expo-document-picker";
import { randomUUID } from "expo-crypto";
import type { Note } from "@veynoa/domain";
import { workspace, type Attachment } from "../database/workspace";
import {
  readAttachment,
  openAttachment,
  extractDocument,
} from "../services/documents";
import { useApp } from "../stores/app";
import { Button, Label, Row, Card } from "./ui";
export function Attachments({ note }: { note: Note }) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => workspace.attachments(note.id).then(setFiles);
  useEffect(() => {
    void refresh().catch((e) => setError(String(e)));
  }, [note.id]);
  const run = async (f: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await f();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Label muted>
        Images, PDF, Markdown and text · up to 10 MB each. Files are stored
        locally with this note.
      </Label>
      <Button
        disabled={busy}
        onPress={() =>
          void run(async () => {
            const result = await Picker.getDocumentAsync({
              type: [
                "image/png",
                "image/jpeg",
                "image/webp",
                "application/pdf",
                "text/plain",
                "text/markdown",
              ],
              copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            const a = result.assets[0];
            if ((a.size || 0) > 10 * 1024 * 1024)
              throw new Error("Choose a file smaller than 10 MB.");
            await workspace.attach({
              id: randomUUID(),
              noteId: note.id,
              name: a.name,
              mime: a.mimeType || "application/octet-stream",
              data: await readAttachment(a.uri),
              extracted: "",
            });
          })
        }
      >
        Attach file
      </Button>
      {!!error && <Label>{error}</Label>}
      {files.map((a) => (
        <Card key={a.id}>
          <Label>{a.name}</Label>
          {["image/png", "image/jpeg", "image/webp"].includes(a.mime) && (
            <Image
              accessibilityLabel={a.name}
              source={{ uri: `data:${a.mime};base64,${a.data}` }}
              style={{ height: 200, width: "100%" }}
              resizeMode="contain"
            />
          )}
          <Row>
            <Button
              disabled={busy}
              onPress={() => void run(() => openAttachment(a))}
            >
              Open / save file
            </Button>
            <Button
              disabled={busy}
              onPress={() =>
                void run(async () =>
                  workspace.extract(a.id, await extractDocument(a)),
                )
              }
            >
              Extract text
            </Button>
          </Row>
          {!!a.extracted && (
            <>
              <Label muted>{a.extracted.slice(0, 1200)}</Label>
              <Button
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await useApp.getState().update(note.id, {
                      body: note.body + "\n\n## " + a.name + "\n" + a.extracted,
                    });
                  })
                }
              >
                Append extracted text to note
              </Button>
            </>
          )}
        </Card>
      ))}
    </>
  );
}
