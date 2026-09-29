import { useEffect, useRef, useState } from "react";
import { AppState, PanResponder, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { intelligence } from "../../src/database/intelligence";
import {
  startLocalDictation,
  localSupported,
  loadedModels,
} from "../../src/services/localModels";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Line } from "react-native-svg";
import { randomUUID } from "expo-crypto";
import type { CanvasNode } from "@veynoa/domain";
import { repository } from "../../src/database/repository";
import { cloud, useApp } from "../../src/stores/app";
import {
  Button,
  Card,
  Field,
  Label,
  Page,
  Row,
  useTheme,
} from "../../src/components/ui";
function Node({
  node,
  move,
  expand,
  select,
  selected,
}: {
  node: CanvasNode;
  move: (n: CanvasNode) => void;
  expand: (n: CanvasNode) => void;
  select: (n: CanvasNode) => void;
  selected: boolean;
}) {
  const latest = useRef(node);
  latest.current = node;
  const position = useRef({ x: node.x, y: node.y });
  const [p, setP] = useState(position.current);
  const t = useTheme();
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) + Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) =>
        setP({
          x: Math.max(0, Math.min(650, position.current.x + g.dx)),
          y: Math.max(0, Math.min(800, position.current.y + g.dy)),
        }),
      onPanResponderRelease: (_, g) => {
        position.current = {
          x: Math.max(0, Math.min(650, position.current.x + g.dx)),
          y: Math.max(0, Math.min(800, position.current.y + g.dy)),
        };
        move({ ...latest.current, ...position.current });
      },
    }),
  ).current;
  return (
    <View
      {...responder.panHandlers}
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: 165,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected ? t.accent : t.line,
        backgroundColor: t.card,
        gap: 8,
      }}
    >
      <Label size={13}>{node.text}</Label>
      <Button onPress={() => expand(node)}>Bloom</Button>
      <Button onPress={() => select(node)}>
        {selected ? "Selected" : "Select / edit"}
      </Button>
    </View>
  );
}
export default function Canvas() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = useApp((s) => s.notes.find((n) => n.id === id));
  const localOnly = useApp((s) => s.settings.localOnly);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const voiceGeneration = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const end = () => {
        voiceGeneration.current++;
        stop.current?.();
        stop.current = null;
        setListening(false);
      };
      const subscription = AppState.addEventListener("change", (state) => {
        if (state !== "active") end();
      });
      return () => {
        end();
        subscription.remove();
      };
    }, []),
  );
  const t = useTheme();
  useEffect(() => {
    void repository.canvas(id).then(setNodes).catch(useApp.getState().fail);
  }, [id]);
  const add = async () => {
    if (!text.trim()) return;
    const n: CanvasNode = {
      id: randomUUID(),
      noteId: id,
      text: text.trim(),
      x: 20 + (nodes.length % 3) * 210,
      y: 30 + Math.floor(nodes.length / 3) * 150,
      parentId: null,
    };
    try {
      if (editing) {
        const old = nodes.find((n) => n.id === editing);
        if (old) {
          const next = { ...old, text: text.trim() };
          await repository.saveNode(next);
          setNodes((a) => a.map((n) => (n.id === editing ? next : n)));
        }
        setEditing(null);
        setText("");
        return;
      }
      await repository.saveNode(n);
      setNodes((s) => [...s, n]);
      setText("");
    } catch (e) {
      useApp.getState().fail(e);
    }
  };
  const bloom = async (parent?: CanvasNode) => {
    if (localOnly) {
      useApp
        .getState()
        .fail(
          new Error(
            "Enable cloud AI to generate branches. You can add and move your own ideas offline.",
          ),
        );
      return;
    }
    const seed = parent?.text || text.trim() || note?.body;
    if (!seed) return;
    setBusy(true);
    try {
      const result = await cloud("bloom", { text: seed });
      setPreview(result.branches.map((b) => b.title + "\n" + b.detail));
      if (parent) setSelected([parent.id]);
    } catch (e) {
      useApp.getState().fail(e);
    } finally {
      setBusy(false);
    }
  };
  const move = (n: CanvasNode) => {
    setNodes((s) => s.map((x) => (x.id === n.id ? n : x)));
    void repository.saveNode(n).catch(useApp.getState().fail);
  };
  return (
    <Page
      title="Give your ideas room."
      eyebrow="THE THINKING CANVAS"
      subtitle="Drag a thought. Follow a possibility."
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
      <Field
        accessibilityLabel="Canvas thought"
        value={text}
        onChangeText={setText}
        placeholder="An idea to explore…"
      />
      <Row>
        <Button onPress={() => void add()} disabled={!text.trim()}>
          {editing ? "Save edited thought" : "Add thought"}
        </Button>
        <Button
          primary
          disabled={localOnly || busy || !(text.trim() || note?.body)}
          onPress={() => void bloom()}
        >
          {busy ? "Blooming…" : "Bloom this thought"}
        </Button>
      </Row>
      <Card>
        <Label>Conversational thinking</Label>
        <Label muted>
          Local dictation processes 8-second windows with a pause while each
          window is transcribed. Review the draft before adding it. Load the
          English speech model in Intelligence first. This is segmented
          dictation, not uninterrupted real-time streaming.
        </Label>
        <Row>
          <Button
            disabled={!localSupported || !loadedModels.has("speech") || busy}
            onPress={() => {
              if (listening) {
                stop.current?.();
                stop.current = null;
                setListening(false);
                return;
              }
              setBusy(true);
              const generation = ++voiceGeneration.current;
              void startLocalDictation(
                (chunk) => setText((old) => old + (old ? "\n" : "") + chunk),
                (e) => {
                  setListening(false);
                  useApp.getState().fail(e);
                },
              )
                .then((end) => {
                  if (generation !== voiceGeneration.current) {
                    end();
                    return;
                  }
                  stop.current = end;
                  setListening(true);
                })
                .catch(useApp.getState().fail)
                .finally(() => setBusy(false));
            }}
          >
            {listening ? "Stop dictation" : "Dictate locally"}
          </Button>
          <Button onPress={() => router.push("/intelligence")}>
            Open Intelligence
          </Button>
          <Button
            onPress={() => {
              setSelected([]);
              setEditing(null);
              setText("");
            }}
          >
            Clear selection
          </Button>
        </Row>
        <Label>{selected.length} selected branches</Label>
        <Row>
          {["Challenge assumptions", "Explore alternatives"].map((intent) => (
            <Button
              key={intent}
              disabled={busy || localOnly || !selected.length}
              onPress={() => {
                setBusy(true);
                void cloud("bloom", {
                  text: (
                    intent +
                    ". Clearly label these as suggestions, not facts.\n" +
                    nodes
                      .filter((n) => selected.includes(n.id))
                      .map((n) => n.text)
                      .join("\n")
                  ).slice(0, 16000),
                })
                  .then((r) =>
                    setPreview(
                      r.branches.map((b) => b.title + "\n" + b.detail),
                    ),
                  )
                  .catch(useApp.getState().fail)
                  .finally(() => setBusy(false));
              }}
            >
              {intent}
            </Button>
          ))}
          <Button
            disabled={busy || !selected.length}
            onPress={() => {
              setBusy(true);
              void intelligence
                .propose(
                  note?.title || "Canvas plan",
                  [id],
                  nodes
                    .filter((n) => selected.includes(n.id))
                    .map((n) => n.text),
                  true,
                )
                .then(() => router.push("/intelligence"))
                .catch(useApp.getState().fail)
                .finally(() => setBusy(false));
            }}
          >
            Propose plan from selected
          </Button>
        </Row>
      </Card>
      {!!preview.length && (
        <Card>
          <Label>Review suggested branches</Label>
          {preview.map((line, i) => (
            <Field
              key={i}
              accessibilityLabel={"Suggested branch " + (i + 1)}
              multiline
              value={line}
              onChangeText={(value) =>
                setPreview((a) => a.map((x, j) => (i === j ? value : x)))
              }
            />
          ))}
          <Row>
            <Button
              disabled={busy}
              onPress={() => {
                setBusy(true);
                void (async () => {
                  const next = preview
                    .filter((x) => x.trim())
                    .map((text, i) => ({
                      id: randomUUID(),
                      noteId: id,
                      text,
                      x: 20 + ((nodes.length + i) % 3) * 210,
                      y: 30 + Math.floor((nodes.length + i) / 3) * 220,
                      parentId: selected[0] || null,
                    }));
                  await repository.saveNodes(next);
                  setNodes((a) => [...a, ...next]);
                  setPreview([]);
                })()
                  .catch(useApp.getState().fail)
                  .finally(() => setBusy(false));
              }}
            >
              Accept branches
            </Button>
            <Button onPress={() => setPreview([])}>Discard suggestions</Button>
          </Row>
        </Card>
      )}
      <Label muted size={12}>
        Use a wide screen for the full board. Positions are saved on this
        device.
      </Label>
      <ScrollView
        horizontal
        style={{
          height: Math.max(1000, Math.ceil(nodes.length / 3) * 220 + 250),
          backgroundColor: t.soft,
          borderRadius: 20,
        }}
      >
        <View
          style={{
            width: 840,
            height: Math.max(1000, Math.ceil(nodes.length / 3) * 220 + 250),
          }}
        >
          <Svg
            width={840}
            height={Math.max(1000, Math.ceil(nodes.length / 3) * 220 + 250)}
            style={{ position: "absolute" }}
          >
            {nodes
              .filter((n) => n.parentId)
              .map((n) => {
                const p = nodes.find((x) => x.id === n.parentId);
                return p ? (
                  <Line
                    key={n.id}
                    x1={p.x + 80}
                    y1={p.y + 60}
                    x2={n.x + 80}
                    y2={n.y + 60}
                    stroke={t.accent}
                    strokeWidth={1.5}
                  />
                ) : null;
              })}
          </Svg>
          {nodes.map((n) => (
            <Node
              key={n.id}
              node={n}
              move={move}
              expand={(n) => void bloom(n)}
              selected={selected.includes(n.id)}
              select={(n) => {
                setSelected((a) =>
                  a.includes(n.id)
                    ? a.filter((id) => id !== n.id)
                    : [...a, n.id],
                );
                setEditing(n.id);
                setText(n.text);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </Page>
  );
}
