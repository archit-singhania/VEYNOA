import { Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Brand, Button, Eyebrow, Label, useTheme } from "./ui";
import { Icon, type IconName } from "./Icon";
import { useApp } from "../stores/app";
const entries: Record<
  string,
  { label: string; icon: IconName; description: string }
> = {
  index: {
    label: "My thoughts",
    icon: "notes",
    description: "Your everyday notebook",
  },
  timeline: {
    label: "Timeline",
    icon: "timeline",
    description: "A record of your days",
  },
  garden: {
    label: "Memory garden",
    icon: "garden",
    description: "See your ideas connect",
  },
  search: {
    label: "Find & ask",
    icon: "search",
    description: "Follow a thread",
  },
};
export function Navigation({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const wide = useWindowDimensions().width >= 1050;
  const insets = useSafeAreaInsets();
  const localOnly = useApp((s) => s.settings.localOnly);
  const count = useApp((s) => s.notes.filter((n) => !n.archived).length);
  const add = async () => {
    try {
      const n = await useApp.getState().create();
      router.push(`/notes/${n.id}`);
    } catch (e) {
      useApp.getState().fail(e);
    }
  };
  return (
    <View
      style={
        wide
          ? {
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 232,
              paddingHorizontal: 22,
              paddingTop: 42 + insets.top,
              paddingBottom: 24,
              backgroundColor: t.card,
              borderRightWidth: 1,
              borderColor: t.line,
            }
          : {
              flexDirection: "row",
              backgroundColor: t.card,
              borderTopWidth: 1,
              borderColor: t.line,
              paddingTop: 9,
              paddingBottom: Math.max(10, insets.bottom),
              paddingHorizontal: 6,
            }
      }
    >
      {wide && (
        <>
          <Brand />
          <View style={{ height: 46 }} />
          <Eyebrow>Workspace</Eyebrow>
          <View style={{ height: 14 }} />
        </>
      )}
      {state.routes.map((route, index) => {
        const entry = entries[route.name];
        if (!entry) return null;
        const selected = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            aria-selected={selected}
            accessibilityLabel={entry.label}
            accessibilityState={{ selected }}
            onPress={() => {
              const e = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={({ pressed, hovered }: any) =>
              wide
                ? {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: selected
                      ? t.soft
                      : hovered
                        ? t.bg
                        : "transparent",
                    minHeight: 52,
                    borderRadius: 12,
                    marginBottom: 7,
                    paddingHorizontal: 13,
                    opacity: pressed ? 0.6 : 1,
                  }
                : {
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 52,
                    gap: 5,
                    opacity: pressed ? 0.6 : 1,
                  }
            }
          >
            <View
              style={{
                padding: wide ? 0 : 5,
                paddingHorizontal: wide ? 0 : 14,
                borderRadius: 13,
                backgroundColor: !wide && selected ? t.soft : "transparent",
              }}
            >
              <Icon
                name={entry.icon}
                color={selected ? t.accent : t.muted}
                size={20}
              />
            </View>
            <Label
              size={wide ? 13 : 10}
              style={{
                color: selected ? t.accent : t.muted,
                fontWeight: selected ? "600" : "400",
              }}
            >
              {wide
                ? entry.label
                : route.name === "index"
                  ? "Thoughts"
                  : route.name === "garden"
                    ? "Garden"
                    : route.name === "search"
                      ? "Search"
                      : "Timeline"}
            </Label>
            {wide && route.name === "index" && (
              <View style={{ marginLeft: "auto" }}>
                <Label muted size={11}>
                  {count}
                </Label>
              </View>
            )}
          </Pressable>
        );
      })}
      {wide && (
        <>
          <View style={{ height: 22 }} />
          <Button primary icon="plus" onPress={() => void add()}>
            New thought
          </Button>
          <View style={{ flex: 1 }} />
          <View
            style={{
              padding: 15,
              borderRadius: 16,
              backgroundColor: t.bg,
              gap: 9,
              marginBottom: 18,
            }}
          >
            <Icon name="leaf" color={t.gold} />
            <Label size={13} style={{ fontFamily: "Georgia" }}>
              A little more clarity.
            </Label>
            <Label muted size={11}>
              One thought at a time.
            </Label>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/settings")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 11,
              minHeight: 48,
            }}
          >
            <Icon name="settings" color={t.muted} />
            <Label muted size={13}>
              Settings & appearance
            </Label>
          </Pressable>
          <View
            style={{
              flexDirection: "row",
              gap: 7,
              alignItems: "center",
              paddingTop: 13,
              borderTopWidth: 1,
              borderColor: t.line,
            }}
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: t.accent,
              }}
            />
            <Label muted size={10}>
              {localOnly ? "Local-only mode" : "Cloud AI enabled"}
            </Label>
          </View>
        </>
      )}
    </View>
  );
}
