import { Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useTheme } from "../../src/components/ui";
import { Navigation } from "../../src/components/Navigation";
export default function TabsLayout() {
  const t = useTheme();
  const wide = useWindowDimensions().width >= 1050;
  return (
    <Tabs
      tabBar={(props) => <Navigation {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: t.bg, marginLeft: wide ? 232 : 0 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "My thoughts" }} />
      <Tabs.Screen name="timeline" options={{ title: "Timeline" }} />
      <Tabs.Screen name="garden" options={{ title: "Memory garden" }} />
      <Tabs.Screen name="search" options={{ title: "Find & ask" }} />
    </Tabs>
  );
}
