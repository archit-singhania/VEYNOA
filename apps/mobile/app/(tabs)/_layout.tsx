import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useTheme } from "../../src/components/ui";
export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.line },
        tabBarLabelStyle: { fontSize: 12 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      {[
        ["index", "Notes", "▤"],
        ["timeline", "Timeline", "◷"],
        ["garden", "Garden", "✣"],
        ["search", "Search", "⌕"],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 24 }}>{icon}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
