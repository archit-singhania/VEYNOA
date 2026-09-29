import { useEffect, useState } from "react";
import { router } from "expo-router";
import { related, type Note } from "@veynoa/domain";
import { wikiTargets, dueTime } from "@veynoa/domain/src/workspace";
import { useApp, cloud } from "../stores/app";
import { useInterface } from "../stores/interface";
import { workspace, type Version } from "../database/workspace";
import { useWorkspace } from "./WorkspaceUI";
import { Card, Label, Field, Row, Button, Eyebrow } from "./ui";
import { scheduleReminder, cancelReminder } from "../services/reminders";
import { Attachments } from "./Attachments";
const sections = [
  "Organize",
  "Actions",
  "Reminder",
  "Links",
  "History",
  "Rewrite",
  "Attachments",
  "Meeting",
] as const;
export function NoteTools({ note }: { note: Note }) {
  const s = useWorkspace();
  const [section, setSection] = useState<string>("Organize");
  const [tags, setTags] = useState("");
  const [action, setAction] = useState("");
  const [actionId, setActionId] = useState<string | undefined>();
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("normal");
  const [reminder, setReminder] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [preview, setPreview] = useState<Version | null>(null);
  const [rewrite, setRewrite] = useState("");
  const [source, setSource] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [mode, setMode] = useState<
    "summarize" | "clarify" | "professional" | "friendly"
  >("clarify");
  const [linkQuery, setLinkQuery] = useState("");
  const [agenda, setAgenda] = useState("");
  const [decision, setDecision] = useState("");
  const notes = useApp((x) => x.notes);
  const settings = useApp((x) => x.settings);
  const meta = s.meta.find((m) => m.noteId === note.id);
  useEffect(() => {
    setTags((JSON.parse(meta?.tags || "[]") as string[]).join(", "));
  }, [meta?.tags]);
  useEffect(() => {
    if (section === "History")
      void workspace
        .versions(note.id)
        .then(setVersions)
        .catch(useApp.getState().fail);
  }, [section, note.id, note.revision]);
  const update = (body: string) => useApp.getState().update(note.id, { body });
  const outgoing = new Set([
    ...wikiTargets(note.body, notes),
    ...s.links.filter((l) => l.sourceId === note.id).map((l) => l.targetId),
  ]);
  const incoming = notes.filter(
    (n) =>
      n.id !== note.id &&
      (wikiTargets(n.body, notes).includes(note.id) ||
        s.links.some((l) => l.sourceId === n.id && l.targetId === note.id)),
  );
  const suggestions = related(notes, note.title + " " + note.body, note.id)
    .filter((x) => !outgoing.has(x.note.id))
    .slice(0, 4);
  return (
    <Card>
      <Eyebrow>NOTE TOOLS</Eyebrow>
      <Row>
        {sections.map((v) => (
          <Button key={v} primary={section === v} onPress={() => setSection(v)}>
            {v}
          </Button>
        ))}
      </Row>
      {!!s.error && <Label>{s.error}</Label>}
      {section === "Organize" && (
        <>
          <Field
            accessibilityLabel="Note tags"
            placeholder="Tags, separated by commas"
            value={tags}
            onChangeText={setTags}
          />
          <Button
            disabled={s.busy}
            onPress={() =>
              void s.run(() =>
                workspace.organize(
                  note.id,
                  tags.split(","),
                  meta?.projectId || null,
                  !!meta?.inbox,
                ),
              )
            }
          >
            Save tags
          </Button>
          <Label>Project</Label>
          <Row>
            <Button
              primary={!meta?.projectId}
              onPress={() =>
                void s.run(() =>
                  workspace.organize(
                    note.id,
                    tags.split(","),
                    null,
                    !!meta?.inbox,
                  ),
                )
              }
            >
              None
            </Button>
            {s.projects.map((p) => (
              <Button
                key={p.id}
                primary={meta?.projectId === p.id}
                onPress={() =>
                  void s.run(() =>
                    workspace.organize(note.id, tags.split(","), p.id, false),
                  )
                }
              >
                {p.name}
              </Button>
            ))}
          </Row>
          <Button
            onPress={() =>
              void s.run(() =>
                workspace.organize(
                  note.id,
                  tags.split(","),
                  meta?.projectId || null,
                  !meta?.inbox,
                ),
              )
            }
          >
            {meta?.inbox ? "Mark organized" : "Return to inbox"}
          </Button>
          <Button
            onPress={() =>
              void s.run(async () => {
                await workspace.template(
                  note.title || "My template",
                  note.body,
                  note.kind,
                );
                useInterface
                  .getState()
                  .notify({ message: "Saved as a reusable template" });
              })
            }
          >
            Save as template
          </Button>
          <Button onPress={() => router.push("/workspace")}>
            Open workspace
          </Button>
        </>
      )}
      {section === "Actions" && (
        <>
          <Field
            accessibilityLabel="Action text"
            placeholder="A clear next action"
            value={action}
            onChangeText={setAction}
          />
          <Field
            accessibilityLabel="Action due date"
            placeholder="Due date: YYYY-MM-DD (optional)"
            value={due}
            onChangeText={setDue}
          />
          <Row>
            {["low", "normal", "high"].map((p) => (
              <Button
                primary={priority === p}
                key={p}
                onPress={() => setPriority(p)}
              >
                {p}
              </Button>
            ))}
          </Row>
          <Button
            disabled={s.busy || !action.trim()}
            onPress={() =>
              void s.run(async () => {
                await workspace.action(
                  note.id,
                  action,
                  due,
                  priority,
                  actionId,
                );
                setAction("");
                setActionId(undefined);
              })
            }
          >
            {actionId ? "Save action" : "Add action"}
          </Button>
          {s.actions
            .filter((a) => a.noteId === note.id)
            .map((a) => (
              <Row key={a.id}>
                <Button
                  onPress={() =>
                    void s.run(() => workspace.complete(a.id, !a.done))
                  }
                >
                  {a.done ? "✓ Reopen" : "Complete"} · {a.text}
                </Button>
                <Label muted>
                  {a.priority} · {a.due || "No due date"}
                </Label>
                <Button
                  onPress={() => {
                    setActionId(a.id);
                    setAction(a.text);
                    setDue(a.due);
                    setPriority(a.priority);
                  }}
                >
                  Edit action
                </Button>
              </Row>
            ))}
        </>
      )}
      {section === "Reminder" && (
        <>
          <Label muted>
            Use local time. Native reminders show a discreet notification; web
            reminders appear in Today while the app is open.
          </Label>
          <Label>
            {meta?.reminderAt
              ? `Scheduled: ${new Date(meta.reminderAt).toLocaleString()}`
              : "No reminder scheduled."}
          </Label>
          <Field
            accessibilityLabel="Reminder time"
            placeholder="YYYY-MM-DD HH:mm"
            value={reminder}
            onChangeText={setReminder}
          />
          <Button
            disabled={s.busy || !reminder}
            onPress={() =>
              void s.run(async () => {
                const at = dueTime(reminder);
                const notification = await scheduleReminder(note.id, at);
                try {
                  await workspace.reminder(note.id, at, notification);
                } catch (e) {
                  await cancelReminder(notification);
                  throw e;
                }
                await cancelReminder(meta?.notificationId || null);
              })
            }
          >
            Schedule reminder
          </Button>
          <Button
            onPress={() =>
              void s.run(async () => {
                await cancelReminder(meta?.notificationId || null);
                await workspace.reminder(note.id, null, null);
              })
            }
          >
            Clear reminder
          </Button>
        </>
      )}
      {section === "Links" && (
        <>
          <Label muted>
            Write [[an exact note title]] or [[note-id]] in your note, or link a
            thought below. Duplicate titles require its ID.
          </Label>
          <Label>Linked thoughts</Label>
          {notes
            .filter((n) => outgoing.has(n.id))
            .map((n) => (
              <Row key={n.id}>
                <Button onPress={() => router.push(`/notes/${n.id}`)}>
                  {n.title || "Untitled"}
                </Button>
                <Button
                  quiet
                  onPress={() =>
                    void s.run(() => workspace.unlink(note.id, n.id))
                  }
                >
                  Unlink saved connection
                </Button>
              </Row>
            ))}
          <Label>Backlinks</Label>
          {incoming.map((n) => (
            <Button key={n.id} onPress={() => router.push(`/notes/${n.id}`)}>
              {n.title || "Untitled"}
            </Button>
          ))}
          <Field
            accessibilityLabel="Find a link"
            placeholder="Find a thought to link"
            value={linkQuery}
            onChangeText={setLinkQuery}
          />
          {!!linkQuery &&
            notes
              .filter(
                (n) =>
                  n.id !== note.id &&
                  n.title.toLowerCase().includes(linkQuery.toLowerCase()),
              )
              .slice(0, 8)
              .map((n) => (
                <Button
                  key={n.id}
                  onPress={() =>
                    void s.run(() => workspace.link(note.id, n.id))
                  }
                >
                  Link · {n.title}
                </Button>
              ))}
          <Label>Suggested connections · shared words</Label>
          {suggestions.map(({ note: n }) => (
            <Button
              key={n.id}
              onPress={() => void s.run(() => workspace.link(note.id, n.id))}
            >
              Accept connection · {n.title || "Untitled"}
            </Button>
          ))}
        </>
      )}
      {section === "History" && (
        <>
          <Label muted>
            Automatic snapshots preserve the first edit in each minute. Save a
            checkpoint before a major change.
          </Label>
          <Button
            disabled={s.busy}
            onPress={() =>
              void s.run(async () => {
                await workspace.checkpoint(note.id);
                setVersions(await workspace.versions(note.id));
              })
            }
          >
            Save checkpoint
          </Button>
          {versions.map((v) => (
            <Button key={v.id} onPress={() => setPreview(v)}>
              {new Date(v.createdAt).toLocaleString()} · {v.title || "Untitled"}{" "}
              · #{v.id}
            </Button>
          ))}
          {preview && (
            <Card>
              <Label>{preview.title}</Label>
              <Label>{preview.body || "(Empty note)"}</Label>
              <Button
                disabled={s.busy}
                onPress={() =>
                  void s.run(async () => {
                    await workspace.checkpoint(note.id);
                    await useApp.getState().update(note.id, {
                      title: preview.title,
                      body: preview.body,
                    });
                    setPreview(null);
                    setVersions(await workspace.versions(note.id));
                  })
                }
              >
                Restore this version
              </Button>
            </Card>
          )}
        </>
      )}
      {section === "Rewrite" && (
        <>
          <Label muted>
            Preview an AI suggestion before replacing your writing. Your
            original becomes a history checkpoint.
          </Label>
          <Row>
            {(
              ["summarize", "clarify", "professional", "friendly"] as const
            ).map((m) => (
              <Button
                key={m}
                primary={mode === m}
                disabled={s.busy}
                onPress={() => {
                  setMode(m);
                  setRewrite("");
                }}
              >
                {m}
              </Button>
            ))}
          </Row>
          <Button
            disabled={s.busy || settings.localOnly || !note.body.trim()}
            onPress={() =>
              void s.run(async () => {
                setRewrite("");
                setSource(note.body);
                setSourceTitle(note.title);
                const r = await cloud("rewrite", { text: note.body, mode });
                setRewrite(r.text);
              })
            }
          >
            Generate rewrite preview
          </Button>
          {settings.localOnly && (
            <Label muted>
              Cloud AI is off. Enable it in Settings when you are ready.
            </Label>
          )}
          {!!rewrite && (
            <>
              <Label>Original</Label>
              <Label muted>{source}</Label>
              <Label>Suggested version</Label>
              <Field
                accessibilityLabel="Rewrite preview"
                multiline
                value={rewrite}
                onChangeText={setRewrite}
              />
              <Row>
                <Button
                  disabled={s.busy}
                  onPress={() =>
                    void s.run(async () => {
                      const current = useApp
                        .getState()
                        .notes.find((n) => n.id === note.id);
                      if (
                        current?.body !== source ||
                        current.title !== sourceTitle
                      )
                        throw new Error(
                          "This note changed. Generate a new preview before applying.",
                        );
                      await workspace.checkpoint(note.id);
                      await update(rewrite);
                      setRewrite("");
                    })
                  }
                >
                  Accept rewrite
                </Button>
                <Button onPress={() => setRewrite("")}>Discard preview</Button>
              </Row>
            </>
          )}
        </>
      )}
      {section === "Attachments" && <Attachments note={note} />}
      {section === "Meeting" && (
        <>
          <Label>Meeting workspace</Label>
          <Label muted>
            The note above holds your agenda and decisions. Record with Speak;
            track follow-up in Actions.
          </Label>
          <Field
            accessibilityLabel="Meeting agenda"
            placeholder="Agenda item"
            value={agenda}
            onChangeText={setAgenda}
          />
          <Button
            disabled={!agenda.trim() || s.busy}
            onPress={() =>
              void s.run(async () => {
                await update(note.body + "\n\n## Agenda\n- " + agenda);
                setAgenda("");
              })
            }
          >
            Add agenda item
          </Button>
          <Field
            accessibilityLabel="Meeting decision"
            placeholder="Decision made"
            value={decision}
            onChangeText={setDecision}
          />
          <Button
            disabled={!decision.trim() || s.busy}
            onPress={() =>
              void s.run(async () => {
                await update(note.body + "\n\n## Decision\n" + decision);
                setDecision("");
              })
            }
          >
            Record decision
          </Button>
          <Row>
            <Button onPress={() => router.push(`/capture/${note.id}`)}>
              Record meeting
            </Button>
            <Button onPress={() => setSection("Actions")}>
              Meeting action items
            </Button>
          </Row>
        </>
      )}
    </Card>
  );
}
