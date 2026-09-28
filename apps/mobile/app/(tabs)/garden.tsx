import { useMemo, useState } from "react";
import { View, Pressable, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import Svg, { Circle, Ellipse, Path, G } from "react-native-svg";
import { useApp } from "../../src/stores/app";
import {
  Button,
  Card,
  Label,
  Page,
  Eyebrow,
  Row,
  serif,
  useTheme,
} from "../../src/components/ui";
import { Icon } from "../../src/components/Icon";
export default function Garden() {
  const notes = useApp((s) => s.notes);
  const analyses = useApp((s) => s.analyses);
  const [selected, setSelected] = useState<string | null>(null);
  const t = useTheme();
  const small = useWindowDimensions().width < 650;
  const clusters = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const n of notes.filter((n) => !n.archived)) {
      const topics = analyses[n.id]?.topics.length
        ? analyses[n.id].topics
        : [n.kind];
      for (const topic of new Set(topics.map((t) => t.toLowerCase())))
        (groups[topic] ??= []).push(n.id);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [notes, analyses]);
  const members = notes.filter((n) =>
    clusters.find(([k]) => k === selected)?.[1].includes(n.id),
  );
  return (
    <Page
      title="Some thoughts take root."
      eyebrow="THE MEMORY GARDEN"
      subtitle="A living portrait of the ideas you keep coming back to."
    >
      <View
        style={{
          borderRadius: 24,
          backgroundColor: t.hero,
          overflow: "hidden",
          minHeight: small ? 370 : 400,
          padding: small ? 22 : 32,
        }}
      >
        <View style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid slice"
          >
            <G fill="none" stroke="#94B598" strokeWidth={0.6}>
              {[70, 115, 165, 225, 290, 360].map((r) => (
                <Ellipse key={r} cx={400} cy={205} rx={r * 1.4} ry={r} />
              ))}
            </G>
            {Array.from({ length: 30 }, (_, i) => (
              <Circle
                key={i}
                cx={(i * 137 + 38) % 800}
                cy={(i * 73 + 29) % 400}
                r={i % 3 === 0 ? 2 : 1}
                fill="#D3CEA8"
              />
            ))}
          </Svg>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Eyebrow color="#C2D0B4">Your inner landscape</Eyebrow>
          <Label size={11} style={{ color: "#C2D0B4" }}>
            {clusters.length} {clusters.length === 1 ? "cluster" : "clusters"}
          </Label>
        </View>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: small ? 17 : 30,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 32,
          }}
        >
          {clusters.length ? (
            clusters.map(([topic, ids], i) => (
              <Pressable
                key={topic}
                accessibilityRole="button"
                accessibilityLabel={`${topic}, ${ids.length} thoughts`}
                accessibilityState={{ selected: selected === topic }}
                onPress={() => setSelected(topic)}
                style={({ pressed }) => ({
                  width: 105 + Math.min(45, ids.length * 6),
                  height: 105 + Math.min(45, ids.length * 6),
                  borderRadius: 100,
                  backgroundColor:
                    selected === topic
                      ? t.heroAccent
                      : i % 2
                        ? t.heroSoft
                        : t.heroSoft,
                  borderWidth: 1,
                  borderColor: selected === topic ? "#E2D9B7" : "#71866A",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 15,
                  marginTop: i % 2 ? 25 : 0,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon
                  name={topic === "idea" ? "spark" : "leaf"}
                  color={selected === topic ? "#36513C" : "#CFD7B4"}
                  size={18}
                />
                <Label
                  size={19}
                  numberOfLines={2}
                  style={{
                    fontFamily: serif,
                    textAlign: "center",
                    color: selected === topic ? "#294433" : "#EEF0DE",
                  }}
                >
                  {topic}
                </Label>
                <Label
                  size={10}
                  style={{
                    color: selected === topic ? "#49604B" : "#C8D5BB",
                    marginTop: 4,
                  }}
                >
                  {ids.length} {ids.length === 1 ? "thought" : "thoughts"}
                </Label>
              </Pressable>
            ))
          ) : (
            <View style={{ alignItems: "center", gap: 16, maxWidth: 300 }}>
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  borderWidth: 1,
                  borderColor: "#7D9777",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#36553F",
                }}
              >
                <Icon name="garden" color="#D9DCB5" size={39} />
              </View>
              <Label
                size={28}
                style={{
                  fontFamily: serif,
                  color: "#EFF0DC",
                  textAlign: "center",
                }}
              >
                Small beginnings.{"\n"}Beautiful connections.
              </Label>
              <Label
                size={12}
                style={{ color: "#C2D0BB", textAlign: "center" }}
              >
                Your first thought is the first seed. Give it somewhere to grow.
              </Label>
            </View>
          )}
        </View>
        <Label size={10} style={{ color: "#C2D0B4", textAlign: "center" }}>
          Tap a cluster to follow its roots.
        </Label>
      </View>
      {selected && members.length > 0 ? (
        <Card>
          <Eyebrow>A CLOSER LOOK</Eyebrow>
          <Label
            size={30}
            style={{ fontFamily: serif, textTransform: "capitalize" }}
          >
            {selected}
          </Label>
          <Row>
            <Label muted size={12}>
              {members.length} thoughts
            </Label>
            <Label muted size={12}>
              · {members.filter((n) => n.kind === "idea").length} ideas
            </Label>
            <Label muted size={12}>
              · {members.filter((n) => n.kind === "task").length} tasks
            </Label>
          </Row>
          <Label muted size={11}>
            First planted{" "}
            {new Date(
              Math.min(...members.map((n) => n.createdAt)),
            ).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Label>
          {members.map((n) => (
            <Button
              key={n.id}
              icon="notes"
              onPress={() => router.push(`/notes/${n.id}`)}
            >
              {n.title || "Untitled thought"}
            </Button>
          ))}
        </Card>
      ) : (
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            alignItems: "center",
            paddingHorizontal: 8,
          }}
        >
          <Icon name="spark" color={t.gold} size={24} />
          <View style={{ flex: 1, gap: 5 }}>
            <Label size={17} style={{ fontFamily: serif }}>
              The more you capture, the more you discover.
            </Label>
            <Label muted size={12}>
              Clusters grow with your collection. Cloud analysis adds topics;
              your note types keep things organized offline.
            </Label>
          </View>
        </View>
      )}
    </Page>
  );
}
