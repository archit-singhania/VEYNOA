import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { dayKey, type Kind } from "@veynoa/domain";
import { validDate } from "@veynoa/domain/src/workspace";
import { relevantExcerpt } from "@veynoa/domain/src/retrieval";
import { useApp, cloud } from "../src/stores/app";
import { useInterface } from "../src/stores/interface";
import { repository } from "../src/database/repository";
import { workspace } from "../src/database/workspace";
import { useWorkspace } from "../src/components/WorkspaceUI";
import {
  Page,
  Card,
  Button,
  Field,
  Label,
  Row,
  Eyebrow,
} from "../src/components/ui";
const views = [
  "Inbox",
  "Collections",
  "Projects",
  "Today",
  "Weekly",
  "Templates",
  "Ask",
] as const;
export default function Workspace() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState(params.view || "Inbox");
  const s = useWorkspace();
  const notes = useApp((x) => x.notes);
  const jobs = useApp((x) => x.jobs);
  const local = useApp((x) => x.settings.localOnly);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("");
  const [editingProject, setEditingProject] = useState<string | undefined>();
  const [tag, setTag] = useState("");
  const [priorities, setPriorities] = useState("");
  const [reflection, setReflection] = useState("");
  const [day, setDay] = useState(dayKey());
  const [dateInput, setDateInput] = useState(dayKey());
  const [dateError, setDateError] = useState("");
  const [clock, setClock] = useState(Date.now());
  const captureOpen = useInterface((s) => s.captureOpen);
  const [planReady, setPlanReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [templateKind, setTemplateKind] = useState<Kind>("note");
  const [body, setBody] = useState("");
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<string[]>([]);
  useEffect(() => {
    if (params.view && views.includes(params.view as (typeof views)[number]))
      setView(params.view);
  }, [params.view]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setPlanReady(false);
    void workspace
      .plan(day)
      .then((p) => {
        if (active) {
          setPriorities(p.priorities);
          setReflection(p.reflection);
          setPlanReady(true);
        }
      })
      .catch(useApp.getState().fail);
    return () => {
      active = false;
    };
  }, [day]);
  useEffect(() => {
    void repository.draft().then(setDraft).catch(useApp.getState().fail);
  }, [view, captureOpen]);
  const active = notes.filter((n) => !n.archived);
  const meta = (id: string) => s.meta.find((m) => m.noteId === id);
  const projectNotes = active.filter((n) => meta(n.id)?.projectId === project);
  const tags = [
    ...new Set(s.meta.flatMap((m) => JSON.parse(m.tags) as string[])),
  ];
  const list = (ids: typeof notes) =>
    ids.length ? (
      ids.map((n) => (
        <Row key={n.id}>
          <Button onPress={() => router.push(`/notes/${n.id}`)}>
            {n.title || "Untitled thought"}
          </Button>
          <Label muted size={12}>
            {n.kind}
          </Label>
        </Row>
      ))
    ) : (
      <Label muted>No thoughts here yet.</Label>
    );
  const weekStart = Date.now() - 7 * 86400000;
  const captured = active.filter((n) => n.createdAt >= weekStart);
  const completed = s.actions.filter(
    (a) => a.done && Number(a.completedAt) >= weekStart,
  );
  const due = s.actions.filter((a) => !a.done && a.due && a.due <= day);
  const reminders = active.filter(
    (n) =>
      Number(meta(n.id)?.reminderAt) > 0 &&
      Number(meta(n.id)?.reminderAt) <= clock,
  );
  return (
    <Page
      title="Your workspace"
      eyebrow="MAKE SPACE FOR WHAT MATTERS"
      subtitle="A place to organize, plan and follow through."
      action={<Button onPress={() => router.replace("/")}>My thoughts</Button>}
    >
      <Row>
        {views.map((v) => (
          <Button key={v} primary={v === view} onPress={() => setView(v)}>
            {v}
          </Button>
        ))}
        <Button onPress={() => router.push("/vault")}>Private vault</Button>
        <Button onPress={() => router.push("/incoming")}>
          Import shared content
        </Button>
      </Row>
      {!!s.error && (
        <Card>
          <Label>{s.error}</Label>
        </Card>
      )}
      {view === "Inbox" && (
        <>
          <Card>
            <Eyebrow>READY TO ORGANIZE</Eyebrow>
            <Label muted>
              New thoughts stay here until you mark them organized in Note
              tools.
            </Label>
            {list(active.filter((n) => meta(n.id)?.inbox !== 0))}
          </Card>
          <Card>
            <Label>Unfinished capture</Label>
            <Label muted>{draft || "No unfinished draft."}</Label>
            <Button onPress={() => useInterface.getState().openCapture()}>
              Resume capture
            </Button>
          </Card>
          <Card>
            <Label>Processing queue · {jobs.length}</Label>
            {jobs.map((j) => (
              <Label key={j.id} muted>
                {notes.find((n) => n.id === j.noteId)?.title || "Recording"} ·{" "}
                {j.type} · {j.state}
                {j.error ? ` · ${j.error}` : ""}
              </Label>
            ))}
          </Card>
          <Card>
            <Label>Recordings awaiting transcription</Label>
            {s.recordings.length ? (
              s.recordings.map((r) => (
                <Button
                  key={r.id}
                  onPress={() => router.push(`/notes/${r.noteId}`)}
                >
                  {r.title || "Untitled"} · {Math.round(r.duration)} seconds
                </Button>
              ))
            ) : (
              <Label muted>No recordings waiting.</Label>
            )}
          </Card>
        </>
      )}
      {view === "Collections" && (
        <Card>
          <Label>Tags can belong to several collections.</Label>
          <Row>
            {tags.map((t) => (
              <Button key={t} primary={tag === t} onPress={() => setTag(t)}>
                #{t}
              </Button>
            ))}
          </Row>
          {!tags.length && (
            <Label muted>
              Add comma-separated tags in a note’s Note tools.
            </Label>
          )}
          {tag &&
            list(
              active.filter((n) =>
                (JSON.parse(meta(n.id)?.tags || "[]") as string[]).includes(
                  tag,
                ),
              ),
            )}
        </Card>
      )}
      {view === "Projects" && (
        <>
          <Card>
            <Label>
              {editingProject ? "Edit project" : "Create a project"}
            </Label>
            <Field
              accessibilityLabel="Project name"
              placeholder="Project name"
              value={name}
              onChangeText={setName}
            />
            <Field
              accessibilityLabel="Project description"
              placeholder="What are you working toward?"
              value={description}
              onChangeText={setDescription}
            />
            <Button
              disabled={s.busy || !name.trim()}
              onPress={() =>
                void s.run(async () => {
                  setProject(
                    await workspace.saveProject(
                      name,
                      description,
                      editingProject,
                    ),
                  );
                  setEditingProject(undefined);
                  setName("");
                  setDescription("");
                })
              }
            >
              {editingProject ? "Save project" : "Create project"}
            </Button>
          </Card>
          <Row>
            {s.projects.map((p) => (
              <Button
                primary={project === p.id}
                key={p.id}
                onPress={() => setProject(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </Row>
          {project && (
            <Card>
              <Label size={24}>
                {s.projects.find((p) => p.id === project)?.name}
              </Label>
              <Label muted>
                {s.projects.find((p) => p.id === project)?.description}
              </Label>
              <Label>
                {projectNotes.length} thoughts ·{" "}
                {
                  s.actions.filter(
                    (a) =>
                      !a.done && projectNotes.some((n) => n.id === a.noteId),
                  ).length
                }{" "}
                open actions
              </Label>
              {list(projectNotes)}
              <Button
                onPress={() => {
                  const p = s.projects.find((x) => x.id === project);
                  if (p) {
                    setEditingProject(p.id);
                    setName(p.name);
                    setDescription(p.description);
                  }
                }}
              >
                Edit project details
              </Button>
              <Button
                onPress={() =>
                  void s.run(async () => {
                    const n = await useApp
                      .getState()
                      .create("note", "", "New project thought");
                    await workspace.organize(n.id, [], project, false);
                    router.push(`/notes/${n.id}`);
                  })
                }
              >
                Add project thought
              </Button>
              <Button
                onPress={() => {
                  setSelected(projectNotes.slice(0, 8).map((n) => n.id));
                  setView("Ask");
                }}
              >
                Ask this project
              </Button>
            </Card>
          )}
        </>
      )}
      {view === "Today" && (
        <>
          <Card>
            <Eyebrow>DAILY PLAN</Eyebrow>
            <Field
              accessibilityLabel="Planning date"
              value={dateInput}
              onChangeText={setDateInput}
            />
            <Button
              onPress={() => {
                if (!validDate(dateInput)) {
                  setDateError("Enter a valid YYYY-MM-DD date.");
                  return;
                }
                setDateError("");
                setDay(dateInput);
              }}
            >
              Load date
            </Button>
            {!!dateError && <Label>{dateError}</Label>}
            <Label muted>
              Editing {day}. Save before loading another date.
            </Label>
            <Field
              accessibilityLabel="Daily priorities"
              placeholder="Your three priorities"
              multiline
              value={priorities}
              onChangeText={setPriorities}
            />
            <Field
              accessibilityLabel="Daily reflection"
              placeholder="What went well? What needs space?"
              multiline
              value={reflection}
              onChangeText={setReflection}
            />
            <Button
              disabled={s.busy || !planReady}
              onPress={() =>
                void s.run(async () => {
                  await workspace.savePlan(day, priorities, reflection);
                  useInterface
                    .getState()
                    .notify({ message: "Daily plan saved" });
                })
              }
            >
              Save daily plan
            </Button>
          </Card>
          <Card>
            <Label>Due and overdue actions</Label>
            {due.length ? (
              due.map((a) => (
                <Button
                  key={a.id}
                  onPress={() =>
                    void s.run(() => workspace.complete(a.id, true))
                  }
                >
                  Complete · {a.text} · {a.due}
                </Button>
              ))
            ) : (
              <Label muted>No actions due.</Label>
            )}
          </Card>
          <Card>
            <Label>Reminders ready to revisit</Label>
            {list(reminders)}
          </Card>
          <Card>
            <Label>Rediscover a thought</Label>
            {list(
              [...active].sort((a, b) => a.updatedAt - b.updatedAt).slice(0, 3),
            )}
          </Card>
        </>
      )}
      {view === "Weekly" && (
        <>
          <Card>
            <Eyebrow>PAST SEVEN DAYS</Eyebrow>
            <Label size={30}>
              {captured.length} captured · {completed.length} actions completed
            </Label>
            <Label muted>
              {s.actions.filter((a) => !a.done).length} actions remain open.
              Choose what to carry forward.
            </Label>
            {list(captured)}
            {completed.map((a) => (
              <Label key={a.id}>✓ {a.text}</Label>
            ))}
          </Card>
          <Card>
            <Label>Carry forward</Label>
            {s.actions
              .filter((a) => !a.done)
              .map((a) => (
                <Button
                  key={a.id}
                  onPress={() => router.push(`/notes/${a.noteId}`)}
                >
                  {a.text} · {a.due || "No due date"}
                </Button>
              ))}
            <Button
              onPress={() => {
                setPriorities(
                  s.actions
                    .filter((a) => !a.done)
                    .slice(0, 3)
                    .map((a) => `• ${a.text}`)
                    .join("\n"),
                );
                setView("Today");
              }}
            >
              Use top three as today’s draft
            </Button>
          </Card>
        </>
      )}
      {view === "Templates" && (
        <>
          <Card>
            <Label>
              {templateId ? "Edit template" : "Create a reusable template"}
            </Label>
            <Field
              accessibilityLabel="Template name"
              placeholder="Template name"
              value={name}
              onChangeText={setName}
            />
            <Field
              accessibilityLabel="Template body"
              placeholder="Your reusable structure…"
              multiline
              value={body}
              onChangeText={setBody}
              style={{ minHeight: 180 }}
            />
            <Button
              disabled={s.busy || !name.trim()}
              onPress={() =>
                void s.run(async () => {
                  await workspace.template(
                    name,
                    body,
                    templateKind,
                    templateId,
                  );
                  setName("");
                  setBody("");
                  setTemplateId(undefined);
                  setTemplateKind("note");
                })
              }
            >
              Save template
            </Button>
          </Card>
          {s.templates.map((t) => (
            <Card key={t.id}>
              <Label>{t.name}</Label>
              <Row>
                <Button
                  onPress={() =>
                    void s.run(async () => {
                      const n = await useApp
                        .getState()
                        .create(t.kind, t.body.replaceAll("\\n", "\n"), t.name);
                      router.push(`/notes/${n.id}`);
                    })
                  }
                >
                  Use template
                </Button>
                <Button
                  onPress={() => {
                    setTemplateId(t.id);
                    setTemplateKind(t.kind);
                    setName(t.name);
                    setBody(t.body.replaceAll("\\n", "\n"));
                  }}
                >
                  Edit template
                </Button>
              </Row>
            </Card>
          ))}
        </>
      )}
      {view === "Ask" && (
        <Card>
          <Label>Choose up to eight sources</Label>
          <Label muted>
            Only excerpts from the selected thoughts will be sent. Private vault
            entries never appear here.
          </Label>
          {active.map((n) => (
            <Button
              primary={selected.includes(n.id)}
              disabled={s.busy}
              key={n.id}
              onPress={() => {
                setAnswer("");
                setCitations([]);
                setSelected(
                  selected.includes(n.id)
                    ? selected.filter((id) => id !== n.id)
                    : selected.length < 8
                      ? [...selected, n.id]
                      : selected,
                );
              }}
            >
              {selected.includes(n.id) ? "✓ " : ""}
              {n.title || "Untitled"}
            </Button>
          ))}
          <Field
            accessibilityLabel="Scoped question"
            editable={!s.busy}
            placeholder="What would you like to know?"
            value={question}
            onChangeText={setQuestion}
          />
          <Button
            disabled={s.busy || local || !selected.length || !question.trim()}
            onPress={() =>
              void s.run(async () => {
                setAnswer("");
                const sources = useApp
                  .getState()
                  .notes.filter((n) => selected.includes(n.id) && !n.archived)
                  .map((n) => ({
                    id: n.id,
                    title: n.title,
                    text: relevantExcerpt(n.body, question),
                  }));
                const r = await cloud("ask", { question, sources });
                setAnswer(r.answer);
                setCitations(r.sourceIds);
              })
            }
          >
            Ask selected thoughts
          </Button>
          {local && (
            <Label muted>
              Enable cloud AI and configure your gateway in Settings to ask.
            </Label>
          )}
          {!!answer && <Label>{answer}</Label>}
          {citations.map((id) => (
            <Button key={id} onPress={() => router.push(`/notes/${id}`)}>
              Source · {notes.find((n) => n.id === id)?.title || id}
            </Button>
          ))}
        </Card>
      )}
    </Page>
  );
}
