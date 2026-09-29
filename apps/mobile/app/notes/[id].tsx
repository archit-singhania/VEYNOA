import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  localSuggestions,
  related,
  type Recording,
  type Kind,
} from "@veynoa/domain";
import { useApp } from "../../src/stores/app";
import { repository } from "../../src/database/repository";
import { NoteTools } from "../../src/components/NoteTools";
import { Transcript } from "../../src/components/Transcript";
import { FormattedText } from "../../src/components/FormattedText";
import { replaceSelection } from "@veynoa/domain/src/workspace";
import {
  Button,
  Card,
  Field,
  Label,
  Page,
  Row,
  useTheme,
  Eyebrow,
  serif,
} from "../../src/components/ui";
export default function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = useApp((s) => s.notes.find((n) => n.id === id));
  const analysis = useApp((s) => s.analyses[id]);
  const settings = useApp((s) => s.settings);
  const notes = useApp((s) => s.notes);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [status, setStatus] = useState("Saved on this device");
  const [focus, setFocus] = useState(false);
  const [more, setMore] = useState(false);
  const [tools, setTools] = useState(false);
  const [preview, setPreview] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
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
    void useApp
      .getState()
      .remove(id)
      .then(() => router.replace("/"))
      .catch(useApp.getState().fail);
  };
  return (
    <Page
      title="Make room for a thought."
      eyebrow="THE NOTEBOOK"
      compact
      subtitle={status}
      action={
        <Row>
          <Button quiet icon="pen" onPress={() => setFocus(!focus)}>
            {focus ? "Exit focus" : "Focus"}
          </Button>
          <Button
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          >
            Done
          </Button>
        </Row>
      }
    >
      {!focus && (
        <Row>
          {more && (
            <>
              <Button
                icon="pin"
                onPress={() => void update({ pinned: !note.pinned })}
              >
                {note.pinned ? "Unpin" : "Pin"}
              </Button>
              <Button
                icon="archive"
                onPress={() => void update({ archived: !note.archived })}
              >
                {note.archived ? "Restore" : "Archive"}
              </Button>
            </>
          )}
          <Button
            primary
            icon="mic"
            onPress={() => router.push(`/capture/${id}`)}
          >
            Speak
          </Button>
          <Button icon="spark" onPress={() => router.push(`/canvas/${id}`)}>
            Explore idea
          </Button>
          <Button quiet onPress={() => setMore(!more)}>
            {more ? "Fewer options" : "More options"}
          </Button>
          <Button onPress={() => setTools(!tools)}>
            {tools ? "Hide note tools" : "Note tools"}
          </Button>
        </Row>
      )}
      <Card
        style={{
          padding: focus ? 20 : 26,
          gap: 12,
          borderRadius: 22,
          ...(focus
            ? { borderColor: "transparent", backgroundColor: t.bg }
            : {}),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Eyebrow>
            {note.kind} ·{" "}
            {new Date(note.createdAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })}
          </Eyebrow>
          <Label muted size={10}>
            {note.body.trim() ? note.body.trim().split(/\s+/).length : 0} words
          </Label>
        </View>
        <Field
          accessibilityLabel="Note title"
          multiline
          placeholder="Untitled thought"
          value={note.title}
          maxLength={300}
          onChangeText={(title) => void update({ title })}
          style={{
            fontSize: 32,
            fontFamily: serif,
            lineHeight: 42,
            borderWidth: 0,
            backgroundColor: "transparent",
            paddingHorizontal: 0,
          }}
        />
        {!focus && (
          <Row>
            <Button onPress={() => setPreview(!preview)}>
              {preview ? "Edit text" : "Reading view"}
            </Button>
            {!preview &&
              [
                { name: "Heading", before: "## " },
                { name: "Bold", before: "**", after: "**" },
                { name: "Checklist", before: "- [ ] " },
                { name: "Quote", before: "> " },
                { name: "Highlight", before: "==", after: "==" },
                { name: "Code", before: "\n```\n", after: "\n```\n" },
              ].map((f) => (
                <Button
                  key={f.name}
                  quiet
                  onPress={() =>
                    void update({
                      body: replaceSelection(
                        note.body,
                        selection.start,
                        selection.end,
                        f.before,
                        f.after,
                      ),
                    })
                  }
                >
                  {f.name}
                </Button>
              ))}
          </Row>
        )}
        {preview ? (
          <FormattedText
            body={note.body}
            onChange={(body) => void update({ body })}
          />
        ) : (
          <Field
            accessibilityLabel="Note content"
            placeholder="Start typing, or speak. There’s no wrong place to begin."
            multiline
            textAlignVertical="top"
            value={note.body}
            onChangeText={(body) => void update({ body })}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            style={{
              minHeight: focus ? 480 : 310,
              fontSize: 16,
              lineHeight: 30,
              borderWidth: 0,
              backgroundColor: "transparent",
              paddingHorizontal: 0,
            }}
          />
        )}
        <View style={{ height: 1, backgroundColor: t.line }} />
        <Label muted size={11}>
          {status}
        </Label>
      </Card>
      {!focus && (
        <>
          {tools && <NoteTools note={note} />}
          {more && (
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
          )}
          {note.kind === "task" && (
            <Button onPress={() => void update({ completed: !note.completed })}>
              {note.completed ? "Reopen task" : "Mark complete"}
            </Button>
          )}
          {suggestions.filter((s) => s.kind !== note.kind).length > 0 && (
            <Card
              style={{ backgroundColor: t.soft, borderColor: "transparent" }}
            >
              <Label style={{ color: t.accent }}>
                ✦{" "}
                {analysis ? "Veynoa noticed something" : "A little perspective"}
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
                <Button
                  key={n.id}
                  onPress={() => router.push(`/notes/${n.id}`)}
                >
                  {n.title || "Untitled"}
                </Button>
              ))}
            </Card>
          )}
          {recordings.map((r) => (
            <Transcript key={r.id} recording={r} />
          ))}
          {more && (
            <Row>
              <Button
                disabled={settings.localOnly || !note.body.trim()}
                onPress={() =>
                  void useApp
                    .getState()
                    .analyze(id)
                    .catch(useApp.getState().fail)
                }
              >
                Analyze thought
              </Button>
              <Button onPress={remove}>Move to Trash</Button>
            </Row>
          )}
        </>
      )}
    </Page>
  );
}
