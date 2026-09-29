import { useState } from "react";
import { Image } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useAudioPlayer } from "expo-audio";
import { cosine, kinds } from "@veynoa/domain";
import {
  localCall,
  localSupported,
  loadedModels,
  stopModels,
  decodeAudio,
  type ModelName,
} from "../services/localModels";
import { intelligence, type Evidence } from "../database/intelligence";
import { workspace, type Attachment } from "../database/workspace";
import { documentPages, openAttachment } from "../services/documents";
import { useApp } from "../stores/app";
import { Button, Card, Field, Label, Row, Eyebrow } from "./ui";
import {
  SourcePicker,
  Sources,
  type IntelligenceState,
} from "./IntelligenceContext";
const names: Record<ModelName, string> = {
  embed: "Semantic search & classification",
  summary: "Summarization",
  speech: "English speech",
  vision: "Image/text embeddings",
  ocr: "English image OCR",
};
export function ModelsPanel({ s }: { s: IntelligenceState }) {
  const [ids, setIds] = useState<string[]>([]),
    [status, setStatus] = useState(""),
    [preview, setPreview] = useState(""),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<{ id: string; score: number }[]>([]),
    [base, setBase] = useState<{ id: string; revision: number } | null>(null);
  return (
    <>
      <Card>
        <Eyebrow>Private on-device AI · experimental web runtime</Eyebrow>
        <Label muted>
          Inference runs in a browser worker. Loading downloads model files from
          Hugging Face (OCR language data from its configured CDN); these can be
          large and require memory. Your selected content is not uploaded.
          Cached files may work offline, but browser storage can be evicted.
          Native model execution is not available yet.
        </Label>
        {!localSupported && (
          <Label>
            This device build does not support the local model runtime. Open the
            web app.
          </Label>
        )}
        <Row>
          {(Object.keys(names) as ModelName[]).map((name) => (
            <Button
              key={name}
              disabled={s.busy || !localSupported || loadedModels.has(name)}
              onPress={() =>
                void s.run(async () => {
                  setStatus("Loading " + names[name]);
                  await localCall("load", { name }, setStatus);
                  setStatus(names[name] + " ready");
                })
              }
            >
              {loadedModels.has(name) ? "✓ " : "Load / download "}
              {names[name]}
            </Button>
          ))}
        </Row>
        <Button
          onPress={() => {
            stopModels();
            setStatus("Workers stopped; cached downloads retained.");
          }}
        >
          Stop / unload models
        </Button>
        <Label>{status}</Label>
      </Card>
      <Card>
        <Eyebrow>Work with a source</Eyebrow>
        <SourcePicker s={s} selected={ids} onChange={setIds} />
        <Row>
          <Button
            disabled={s.busy || !loadedModels.has("summary") || !ids.length}
            onPress={() =>
              void s.run(async () => {
                const n = s.notes.find((n) => n.id === ids[0])!;
                setBase({ id: n.id, revision: n.revision });
                setPreview(
                  await localCall<string>(
                    "summary",
                    { text: n.body },
                    setStatus,
                  ),
                );
              })
            }
          >
            Summarize locally
          </Button>
          <Button
            disabled={s.busy || !loadedModels.has("embed") || !ids.length}
            onPress={() =>
              void s.run(async () => {
                const n = s.notes.find((n) => n.id === ids[0])!;
                const v = await localCall<number[]>("embed", {
                  text: n.title + " " + n.body,
                });
                const ranked = [];
                for (const kind of kinds) {
                  const vector = await localCall<number[]>("embed", {
                    text: "This is a " + kind + " note.",
                  });
                  ranked.push({ kind, score: cosine(v, vector) });
                }
                ranked.sort((a, b) => b.score - a.score);
                setStatus(
                  "Suggested categories (similarity, not probability): " +
                    ranked
                      .slice(0, 3)
                      .map((x) => `${x.kind} ${x.score.toFixed(2)}`)
                      .join(" · "),
                );
              })
            }
          >
            Suggest category locally
          </Button>
          <Button
            disabled={s.busy || !loadedModels.has("speech")}
            onPress={() =>
              void s.run(async () => {
                const picked = await DocumentPicker.getDocumentAsync({
                  type: "audio/*",
                });
                if (picked.canceled) return;
                const audio = await decodeAudio(picked.assets[0].uri);
                const result = await localCall<{ text: string }>(
                  "speech",
                  { audio },
                  setStatus,
                );
                setBase(null);
                setPreview(result.text);
              })
            }
          >
            Transcribe audio file locally
          </Button>
        </Row>
        {!!preview && (
          <>
            <Field
              accessibilityLabel="Local output preview"
              multiline
              value={preview}
              onChangeText={setPreview}
            />
            <Label muted>
              Review model output for mistakes before saving. Summary input is
              limited to 3,000 characters; audio files to 3 minutes.
            </Label>
            <Button
              disabled={s.busy}
              onPress={() =>
                void s.run(async () => {
                  if (
                    base &&
                    useApp.getState().notes.find((n) => n.id === base.id)
                      ?.revision !== base.revision
                  )
                    throw new Error(
                      "The source changed. Generate a fresh summary.",
                    );
                  const n = await useApp.getState().create("note");
                  await useApp
                    .getState()
                    .update(n.id, {
                      title: base ? "Local summary" : "Local transcript",
                      body: preview,
                    });
                  if (base) await workspace.link(base.id, n.id);
                  setPreview("");
                })
              }
            >
              Save reviewed output as a new note
            </Button>
          </>
        )}
      </Card>
      <Card>
        <Eyebrow>Semantic search</Eyebrow>
        <Field
          accessibilityLabel="Local semantic query"
          value={query}
          onChangeText={setQuery}
          placeholder="Find a thought by meaning"
        />
        <Button
          disabled={s.busy || !loadedModels.has("embed") || !query.trim()}
          onPress={() =>
            void s.run(async () => {
              const q = await localCall<number[]>("embed", { text: query });
              const matches = [];
              for (const n of s.notes.slice(0, 50)) {
                setStatus("Embedding " + (n.title || "Untitled"));
                const vector = await localCall<number[]>("embed", {
                  text: (n.title + " " + n.body).slice(0, 3000),
                });
                matches.push({ id: n.id, score: cosine(q, vector) });
              }
              setResults(matches.sort((a, b) => b.score - a.score).slice(0, 8));
              setStatus(
                "Searched first 50 active notes; similarity scores are not confidence estimates.",
              );
            })
          }
        >
          Search locally
        </Button>
        {results.map((r) => (
          <Row key={r.id}>
            <Sources ids={[r.id]} s={s} />
            <Label>{r.score.toFixed(3)}</Label>
          </Row>
        ))}
      </Card>
    </>
  );
}
function AudioHit({
  hit,
}: {
  hit: { uri: string; start: number; end: number; text: string };
}) {
  const player = useAudioPlayer(hit.uri);
  const [error, setError] = useState("");
  return (
    <Card>
      <Label>
        {hit.start.toFixed(1)}–{hit.end.toFixed(1)}s · {hit.text}
      </Label>
      <Row>
        <Button
          onPress={() => {
            void player
              .seekTo(hit.start)
              .then(() => player.play())
              .catch((e) => setError(String(e)));
          }}
        >
          Play from timestamp
        </Button>
        <Button onPress={() => player.pause()}>Pause</Button>
      </Row>
      {!!error && <Label>{error}</Label>}
    </Card>
  );
}
export function EvidencePanel({ s }: { s: IntelligenceState }) {
  const [ids, setIds] = useState<string[]>([]),
    [files, setFiles] = useState<Attachment[]>([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [hits, setHits] = useState<{ item: Evidence; score: number }[]>([]),
    [audio, setAudio] = useState<
      Awaited<ReturnType<typeof intelligence.audioEvidence>>
    >([]),
    [selected, setSelected] = useState<Attachment | null>(null);
  const index = async (a: Attachment) => {
    setStatus("Indexing " + a.name);
    const base = {
      noteId: a.noteId,
      attachmentId: a.id,
      recordingId: null,
      vector: null,
      model: null,
      sourceRevision: null,
    };
    const rows: Omit<Evidence, "id" | "createdAt">[] = [];
    if (a.mime.startsWith("image/")) {
      const url = `data:${a.mime};base64,${a.data}`;
      if (loadedModels.has("ocr")) {
        const r = await localCall<{
          text: string;
          regions: {
            text: string;
            box: { x0: number; y0: number; x1: number; y1: number };
          }[];
        }>("ocr", { url }, setStatus);
        rows.push({
          ...base,
          kind: "image OCR",
          locator: "whole image",
          text: r.text,
        });
        for (const [i, region] of r.regions.entries())
          rows.push({
            ...base,
            kind: "image region",
            locator: JSON.stringify({ region: i, ...region.box }),
            text: region.text,
          });
      }
      if (loadedModels.has("vision"))
        rows.push({
          ...base,
          kind: "image vector",
          locator: "whole image",
          text: a.name,
          vector: JSON.stringify(
            await localCall<number[]>("imageVector", { url }),
          ),
          model: "Xenova/clip-vit-base-patch32",
        });
      if (!rows.length)
        throw new Error("Load OCR and/or image embeddings in Local AI first.");
    } else {
      for (const p of await documentPages(a))
        rows.push({
          ...base,
          kind: "document page",
          locator: "page " + p.page,
          text: p.text,
        });
      if (!rows.some((r) => r.text.trim()))
        throw new Error(
          "No selectable text. Scanned PDFs need image OCR outside this workflow.",
        );
    }
    await intelligence.evidence(rows);
    setStatus("Indexed " + a.name);
  };
  return (
    <>
      <Card>
        <Eyebrow>Multimodal evidence search</Eyebrow>
        <Label muted>
          Search PDF page text, OCR image regions, image/text embeddings, and
          saved transcript timestamps. First load OCR or vision models in Local
          AI when indexing images. Text PDF extraction works on web (up to 100
          pages); scanned PDFs are not OCRed automatically.
        </Label>
        <SourcePicker
          s={s}
          selected={ids}
          onChange={(next) => {
            setIds(next);
            setFiles([]);
            setSelected(null);
          }}
        />
        <Button
          disabled={s.busy || !ids.length}
          onPress={() =>
            void s.run(async () =>
              setFiles(await workspace.attachments(ids[0])),
            )
          }
        >
          Load source attachments
        </Button>
        {files.map((a) => (
          <Row key={a.id}>
            <Label>{a.name}</Label>
            <Button
              disabled={s.busy}
              onPress={() => void s.run(() => index(a))}
            >
              Index file
            </Button>
            <Button onPress={() => setSelected(a)}>Preview</Button>
          </Row>
        ))}
        <Label>{status}</Label>
        <Field
          accessibilityLabel="Multimodal search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search words, or describe an image"
        />
        <Button
          disabled={s.busy || !query.trim()}
          onPress={() =>
            void s.run(async () => {
              const vector = loadedModels.has("vision")
                ? await localCall<number[]>("textVector", { text: query })
                : null;
              const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
              setHits(
                s.evidence
                  .map((item) => ({
                    item,
                    score:
                      item.vector && vector
                        ? cosine(vector, JSON.parse(item.vector))
                        : terms.filter((t) =>
                            item.text.toLowerCase().includes(t),
                          ).length / terms.length,
                  }))
                  .filter((h) => h.score > 0)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 20),
              );
              setAudio(
                (await intelligence.audioEvidence())
                  .filter((a) =>
                    terms.some((t) => a.text.toLowerCase().includes(t)),
                  )
                  .slice(0, 20),
              );
            })
          }
        >
          Search indexed evidence
        </Button>
        <Label muted>
          {s.evidence.length} indexed chunks. Images use similarity; text/audio
          use keyword matches. These scores are not comparable probabilities.
        </Label>
      </Card>
      {selected && (
        <Card>
          <Label>{selected.name}</Label>
          {selected.mime.startsWith("image/") && (
            <Image
              source={{ uri: `data:${selected.mime};base64,${selected.data}` }}
              style={{ height: 360, width: "100%" }}
              resizeMode="contain"
            />
          )}
          <Button onPress={() => void s.run(() => openAttachment(selected))}>
            Open / download original
          </Button>
        </Card>
      )}
      {hits.map(({ item, score }) => (
        <Card key={item.id}>
          <Eyebrow>
            {item.kind} · {score.toFixed(2)}
          </Eyebrow>
          <Label>{item.locator}</Label>
          <Label>{item.text.slice(0, 1400)}</Label>
          <Sources ids={[item.noteId]} s={s} />
          <Button
            disabled={s.busy}
            onPress={() =>
              void s.run(async () => {
                const a = (await workspace.attachments(item.noteId)).find(
                  (a) => a.id === item.attachmentId,
                );
                if (a) setSelected(a);
              })
            }
          >
            Inspect source attachment
          </Button>
        </Card>
      ))}
      {audio.map((a, i) => (
        <Card key={a.recordingId + ":" + i}>
          <Sources ids={[a.noteId]} s={s} />
          <AudioHit hit={a} />
        </Card>
      ))}
    </>
  );
}
