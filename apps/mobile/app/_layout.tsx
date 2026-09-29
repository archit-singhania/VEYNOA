import React, { useEffect } from "react";
import { AppState, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { dayKey, greeting, shouldGreet } from "@veynoa/domain";
import { useApp } from "../src/stores/app";
import { Button, Label, Orb, useTheme } from "../src/components/ui";
import { MotionProvider, useMotion } from "../src/components/motion";
import { QuickCapture, ToastHost } from "../src/components/QuickCapture";
import { AppLock } from "../src/components/AppLock";
import { CommandPalette } from "../src/components/CommandPalette";
import { NativeEvents } from "../src/components/NativeEvents";
export { ErrorBoundary } from "expo-router";
export default function Layout() {
  return (
    <MotionProvider>
      <AppLayout />
    </MotionProvider>
  );
}
function AppLayout() {
  const ready = useApp((s) => s.ready);
  const error = useApp((s) => s.error);
  const busy = useApp((s) => s.busy);
  const t = useTheme();
  const motion = useMotion();
  useEffect(() => {
    void useApp.getState().init();
    const interval = setInterval(() => void useApp.getState().drain(), 15000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void useApp.getState().drain();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const s = useApp.getState();
    if (shouldGreet(s.settings, dayKey())) {
      Speech.speak(greeting(new Date().getHours()) + " What’s on your mind?", {
        rate: 0.9,
      });
      void s.setSettings({ lastGreeting: dayKey() });
    }
  }, [ready]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={t.dark ? "light" : "dark"} />
        <AppLock>
          {ready ? (
            <Stack
              screenOptions={{
                headerShown: false,
                animation: motion ? "slide_from_right" : "none",
                contentStyle: { backgroundColor: t.bg },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="notes/[id]" />
              <Stack.Screen
                name="capture/[id]"
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name="canvas/[id]" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="trash" />
              <Stack.Screen name="workspace" />
              <Stack.Screen name="vault" />
              <Stack.Screen name="incoming" />
            </Stack>
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                backgroundColor: t.bg,
              }}
            >
              <Orb />
              <Label style={{ textAlign: "center" }}>
                Opening your thoughts…
              </Label>
            </View>
          )}
          {busy > 0 && (
            <View style={{ backgroundColor: t.soft, padding: 8 }}>
              <Label size={12} style={{ textAlign: "center" }}>
                ☁ AI processing · selected content only
              </Label>
            </View>
          )}
          {!!error && (
            <View style={{ padding: 12, backgroundColor: t.soft, gap: 8 }}>
              <Label>{error}</Label>
              <Button
                onPress={() =>
                  ready
                    ? useApp.setState({ error: "" })
                    : void useApp.getState().init()
                }
              >
                {ready ? "Dismiss" : "Retry opening"}
              </Button>
            </View>
          )}
          {ready && (
            <>
              <QuickCapture />
              <ToastHost />
              <CommandPalette />
              <NativeEvents />
            </>
          )}
        </AppLock>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
