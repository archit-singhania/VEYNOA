import { useState } from "react";
import { ScrollView, View } from "react-native";
import Svg, { Circle, Line, Text as SvgText, G } from "react-native-svg";
import {
  asOf,
  textChanges,
  knowledgeGraph,
  graphClusters,
  dailyActivity,
  resurface,
} from "@veynoa/domain/src/intelligence";
import { dayKey } from "@veynoa/domain";
import { validDate } from "@veynoa/domain/src/workspace";
import { useApp, cloud } from "../stores/app";
import { intelligence } from "../database/intelligence";
import { Button, Card, Field, Label, Row, Eyebrow, useTheme } from "./ui";
import {
  Sources,
  SourcePicker,
  type IntelligenceState,
} from "./IntelligenceContext";
export function GraphPanel({ s }: { s: IntelligenceState }) {
  const t = useTheme();
  const analyses = useApp((x) => x.analyses);
  const [project, setProject] = useState(""),
    [date, setDate] = useState(""),
    [focus, setFocus] = useState(""),
    [zoom, setZoom] = useState(1);
  const filtered = s.notes
    .filter(
      (n) =>
        (!project ||
          s.workspace.meta.find((m) => m.noteId === n.id)?.projectId ===
            project) &&
        (!date || (validDate(date) && dayKey(n.createdAt) >= date)),
    )
    .slice(0, 50);
  const entities = Object.fromEntries(
    filtered.map((n) => [n.id, analyses[n.id]?.entities || []]),
  );
  const graph = knowledgeGraph(
    filtered,
    s.workspace.meta,
    s.workspace.projects,
    s.workspace.links,
    entities,
  );
  const clusters = graphClusters(graph.nodes, graph.edges);
  const positions = new Map(
    graph.nodes.map((n, i) => [
      n.id,
      {
        x:
          400 +
          300 * Math.cos((i / Math.max(1, graph.nodes.length)) * Math.PI * 2),
        y:
          350 +
          270 * Math.sin((i / Math.max(1, graph.nodes.length)) * Math.PI * 2),
      },
    ]),
  );
  const chosen = graph.nodes.find((n) => n.id === focus);
  return (
    <>
      <Card>
        <Eyebrow>Living knowledge graph</Eyebrow>
        <Label muted>
          Up to 50 notes. Solid edges are recorded relationships; dashed edges
          are AI-extracted entities. Clusters show connected components, not
          inferred facts.
        </Label>
        <Field
          accessibilityLabel="Graph created since"
          placeholder="Created since YYYY-MM-DD (optional)"
          value={date}
          onChangeText={setDate}
        />
        {!!date && !validDate(date) && (
          <Label>Enter a valid YYYY-MM-DD date.</Label>
        )}
        <Row>
          <Button primary={!project} onPress={() => setProject("")}>
            All projects
          </Button>
          {s.workspace.projects.map((p) => (
            <Button
              key={p.id}
              primary={project === p.id}
              onPress={() => setProject(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </Row>
        <Row>
          <Button onPress={() => setZoom(Math.max(0.6, zoom - 0.2))}>
            Zoom −
          </Button>
          <Button onPress={() => setZoom(Math.min(2, zoom + 0.2))}>
            Zoom +
          </Button>
          <Label>
            {graph.nodes.length} nodes · {clusters.length} clusters
          </Label>
        </Row>
        <ScrollView horizontal>
          <Svg width={800 * zoom} height={700 * zoom} viewBox="0 0 800 700">
            {graph.edges.map((e, i) => {
              const a = positions.get(e.source),
                b = positions.get(e.target);
              return a && b ? (
                <Line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={t.line}
                  strokeWidth={2}
                  strokeDasharray={e.inferred ? "5 5" : undefined}
                />
              ) : null;
            })}
            {graph.nodes.map((n) => {
              const p = positions.get(n.id)!;
              return (
                <G key={n.id} onPress={() => setFocus(n.id)}>
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={focus === n.id ? 13 : 9}
                    fill={n.kind === "entity" ? t.muted : t.accent}
                  />
                  <SvgText
                    x={p.x}
                    y={p.y + 24}
                    textAnchor="middle"
                    fill={t.text}
                    fontSize={10}
                  >
                    {n.label.slice(0, 20)}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </ScrollView>
        <Row>
          {graph.nodes.map((n) => (
            <Button
              key={n.id}
              primary={focus === n.id}
              onPress={() => setFocus(n.id)}
            >
              {n.label}
            </Button>
          ))}
        </Row>
      </Card>
      {chosen && (
        <Card>
          <Label size={22}>{chosen.label}</Label>
          <Sources ids={chosen.noteIds} s={s} />
          {graph.edges
            .filter((e) => e.source === focus || e.target === focus)
            .map((e, i) => (
              <Label key={i}>
                {e.label}
                {e.inferred ? " · verify in source" : ""}
              </Label>
            ))}
        </Card>
      )}
    </>
  );
}
export function MemoryPanel({ s }: { s: IntelligenceState }) {
  const [date, setDate] = useState(dayKey()),
    [query, setQuery] = useState(""),
    [answer, setAnswer] = useState(""),
    [citations, setCitations] = useState<string[]>([]);
  const local = useApp((x) => x.settings.localOnly);
  const historical = validDate(date)
    ? asOf(s.snapshots, new Date(date + "T23:59:59.999").getTime())
    : [];
  const matches = historical.filter(
    (n) =>
      !query ||
      `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Card>
        <Eyebrow>Time-aware memory</Eyebrow>
        <Label muted>
          These are observed note snapshots, beginning when this upgrade was
          installed. An absent snapshot means unknown history. Current
          tags/projects are not reconstructed.
        </Label>
        <Field
          accessibilityLabel="Memory cutoff"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />
        {!validDate(date) && <Label>Enter a valid date.</Label>}
        <Field
          accessibilityLabel="Historical query"
          value={query}
          onChangeText={setQuery}
          placeholder="Filter historical text, or ask a historical question"
        />
        <Button
          disabled={local || s.busy || !historical.length || !query.trim()}
          onPress={() =>
            void s.run(async () => {
              const sources = historical
                .slice(0, 8)
                .map((n) => ({
                  id: n.noteId,
                  title: n.title,
                  text: n.body.slice(0, 2000),
                }));
              const r = await cloud("ask", {
                question: `As of ${date}, using only these observed snapshots: ${query}`,
                sources,
              });
              setAnswer(r.answer);
              setCitations(
                r.sourceIds.filter((id) => sources.some((n) => n.id === id)),
              );
            })
          }
        >
          Ask cloud AI about first 8 snapshots
        </Button>
        {!!answer && (
          <>
            <Label>{answer}</Label>
            <Sources ids={citations} s={s} />
          </>
        )}
      </Card>
      {matches.map((n) => {
        const current = s.notes.find((x) => x.id === n.noteId);
        const diff = textChanges(n.body, current?.body || "");
        return (
          <Card key={n.noteId}>
            <Label size={20}>{n.title || "Untitled"}</Label>
            <Label muted>
              Observed {new Date(n.at).toLocaleString()} · revision {n.revision}
            </Label>
            <Label>{n.body}</Label>
            <Label muted>
              Since then: {diff.added.length} added lines ·{" "}
              {diff.removed.length} removed lines
            </Label>
            {diff.added.slice(0, 5).map((x, i) => (
              <Label key={"a" + i}>+ {x}</Label>
            ))}
            {diff.removed.slice(0, 5).map((x, i) => (
              <Label key={"r" + i}>− {x}</Label>
            ))}
            <Sources ids={[n.noteId]} s={s} />
          </Card>
        );
      })}
      {!matches.length && (
        <Label>No observed snapshots match this date and filter.</Label>
      )}
    </>
  );
}
export function DashboardPanel({ s }: { s: IntelligenceState }) {
  const t = useTheme();
  const [ids, setIds] = useState<string[]>([]);
  const days = dailyActivity(s.notes);
  const max = Math.max(1, ...days.map((d) => d.noteIds.length));
  const ideas = s.notes.filter((n) => n.kind === "idea");
  const converted = ideas.filter((n) =>
    s.workspace.actions.some((a) => a.noteId === n.id),
  );
  const tags = [
    ...new Set(s.workspace.meta.flatMap((m) => JSON.parse(m.tags) as string[])),
  ];
  return (
    <>
      <Card>
        <Eyebrow>Visual intelligence · last 14 days</Eyebrow>
        <Label muted>
          Creation activity and recorded commitments. Counts describe this
          notebook; they do not measure productivity or causation.
        </Label>
        <Row>
          {days.map((d) => (
            <View
              key={d.day}
              style={{ alignItems: "center", gap: 6, width: 58 }}
            >
              <View style={{ height: 100, justifyContent: "flex-end" }}>
                <View
                  style={{
                    height: Math.max(3, (d.noteIds.length / max) * 100),
                    width: 28,
                    backgroundColor: t.accent,
                    borderRadius: 6,
                  }}
                />
              </View>
              <Button onPress={() => setIds(d.noteIds)}>
                {d.day.slice(5)}
              </Button>
              <Label>{d.noteIds.length}</Label>
            </View>
          ))}
        </Row>
      </Card>
      <Card>
        <Label size={24}>
          {ideas.length
            ? Math.round((converted.length / ideas.length) * 100)
            : 0}
          % of ideas have an action
        </Label>
        <Label muted>
          {converted.length} of {ideas.length} idea notes. Includes completed
          actions.
        </Label>
        <Button onPress={() => setIds(converted.map((n) => n.id))}>
          Inspect ideas with actions
        </Button>
        <Row>
          {["high", "normal", "low"].map((p) => (
            <Button
              key={p}
              onPress={() =>
                setIds([
                  ...new Set(
                    s.workspace.actions
                      .filter((a) => !a.done && a.priority === p)
                      .map((a) => a.noteId),
                  ),
                ])
              }
            >
              {p}:{" "}
              {
                s.workspace.actions.filter((a) => !a.done && a.priority === p)
                  .length
              }{" "}
              open
            </Button>
          ))}
        </Row>
      </Card>
      <Card>
        <Eyebrow>Topic distribution</Eyebrow>
        {tags.map((tag) => {
          const notes = s.notes.filter((n) =>
            JSON.parse(
              s.workspace.meta.find((m) => m.noteId === n.id)?.tags || "[]",
            ).includes(tag),
          );
          return (
            <Button key={tag} onPress={() => setIds(notes.map((n) => n.id))}>
              {tag} · {notes.length}
            </Button>
          );
        })}
        <Label muted>
          Assign collection tags in note tools to populate this chart.
        </Label>
      </Card>
      <Card>
        <Eyebrow>Selected evidence</Eyebrow>
        <Sources ids={ids} s={s} />
        {!ids.length && (
          <Label muted>
            Select a date, metric, or topic to inspect its notes.
          </Label>
        )}
      </Card>
    </>
  );
}
export function ResurfacePanel({ s }: { s: IntelligenceState }) {
  const [context, setContext] = useState(""),
    [project, setProject] = useState("");
  const items = resurface(
    s.notes,
    s.workspace.meta,
    s.feedback,
    context,
    project,
  );
  return (
    <>
      <Card>
        <Eyebrow>A useful thought, at the right time</Eyebrow>
        <Field
          accessibilityLabel="Current context"
          value={context}
          onChangeText={setContext}
          placeholder="What are you working on?"
        />
        <Row>
          <Button onPress={() => setProject("")}>All projects</Button>
          {s.workspace.projects.map((p) => (
            <Button
              key={p.id}
              primary={project === p.id}
              onPress={() => setProject(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </Row>
        <Label muted>
          Explainable ranking adapts to your feedback, tags, project, reminders,
          and note age. This is a local scoring system, not a trained personal
          model.
        </Label>
        <Button
          disabled={s.busy}
          onPress={() =>
            void s.run(async () => {
              for (const f of s.feedback)
                await intelligence.feedback(f.noteId, 0);
            })
          }
        >
          Reset feedback and snoozes
        </Button>
      </Card>
      {items.map(({ note, reasons }) => (
        <Card key={note.id}>
          <Sources ids={[note.id]} s={s} />
          <Label>{note.body.slice(0, 240)}</Label>
          <Label muted>{reasons.join(" · ")}</Label>
          <Row>
            <Button
              disabled={s.busy}
              onPress={() =>
                void s.run(() => intelligence.feedback(note.id, 1))
              }
            >
              Useful
            </Button>
            <Button
              disabled={s.busy}
              onPress={() =>
                void s.run(() => intelligence.feedback(note.id, -1))
              }
            >
              Less useful
            </Button>
            <Button
              disabled={s.busy}
              onPress={() =>
                void s.run(() =>
                  intelligence.feedback(
                    note.id,
                    s.feedback.find((f) => f.noteId === note.id)?.rating || 0,
                    Date.now() + 7 * 86400000,
                  ),
                )
              }
            >
              Snooze 7 days
            </Button>
          </Row>
        </Card>
      ))}
    </>
  );
}
