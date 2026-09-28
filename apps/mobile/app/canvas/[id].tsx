import { useEffect, useRef, useState } from "react";
import { PanResponder, ScrollView, View } from "react-native";
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
}: {
  node: CanvasNode;
  move: (n: CanvasNode) => void;
  expand: (n: CanvasNode) => void;
}) {
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
        move({ ...node, ...position.current });
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
        borderColor: t.line,
        backgroundColor: t.card,
        gap: 8,
      }}
    >
      <Label size={13}>{node.text}</Label>
      <Button onPress={() => expand(node)}>Bloom</Button>
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
      const next = result.branches.map((b, i) => ({
        id: randomUUID(),
        noteId: id,
        text: b.title + "\n" + b.detail,
        x: 20 + (i % 3) * 210,
        y: Math.min(750, (parent?.y ?? -130) + 180 + Math.floor(i / 3) * 220),
        parentId: parent?.id ?? null,
      }));
      for (const n of next) await repository.saveNode(n);
      setNodes((s) => [...s, ...next]);
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
      title="Room to branch."
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
          Add thought
        </Button>
        <Button
          primary
          disabled={localOnly || busy || !(text.trim() || note?.body)}
          onPress={() => void bloom()}
        >
          {busy ? "Blooming…" : "Bloom this thought"}
        </Button>
      </Row>
      <Label muted size={12}>
        Use a wide screen for the full board. Positions are saved on this
        device.
      </Label>
      <ScrollView
        horizontal
        style={{
          height: 1000,
          backgroundColor: t.soft,
          borderRadius: 20,
        }}
      >
        <View style={{ width: 840, height: 1000 }}>
          <Svg width={840} height={1000} style={{ position: "absolute" }}>
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
            />
          ))}
        </View>
      </ScrollView>
    </Page>
  );
}
