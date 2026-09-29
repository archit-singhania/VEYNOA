import { useEffect, useState } from "react";
import { Modal, View, ScrollView } from "react-native";
import { router } from "expo-router";
import { create } from "zustand";
import { useApp } from "../stores/app";
import { useInterface } from "../stores/interface";
import { registerShortcuts } from "../services/shortcuts";
import { Button, Field, Label, useTheme } from "./ui";
export const useCommands = create<{
  open: boolean;
  show: () => void;
  close: () => void;
}>((set) => ({
  open: false,
  show: () => set({ open: true }),
  close: () => set({ open: false }),
}));
export function CommandPalette() {
  const open = useCommands((s) => s.open);
  const [query, setQuery] = useState("");
  const notes = useApp((s) => s.notes);
  const t = useTheme();
  useEffect(
    () =>
      registerShortcuts(
        () => {
          useInterface.getState().closeCapture();
          useCommands.getState().show();
        },
        () => {
          useCommands.getState().close();
          useInterface.getState().openCapture();
        },
      ),
    [],
  );
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);
  const go = (f: () => void) => {
    useCommands.getState().close();
    f();
  };
  const commands = [
    {
      name: "New task",
      action: () => {
        void useApp
          .getState()
          .create("task")
          .then((n) => router.push(`/notes/${n.id}`))
          .catch(useApp.getState().fail);
      },
    },
    {
      name: "New thought",
      action: () => useInterface.getState().openCapture(),
    },
    ...["Inbox", "Projects", "Today", "Weekly", "Templates", "Ask"].map(
      (v) => ({
        name: v,
        action: () =>
          router.push({ pathname: "/workspace", params: { view: v } }),
      }),
    ),
    { name: "Private vault", action: () => router.push("/vault") },
    { name: "Settings", action: () => router.push("/settings") },
  ];
  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={useCommands.getState().close}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#081610B8",
          padding: 22,
          justifyContent: "center",
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: t.card,
            padding: 24,
            borderRadius: 24,
            width: "100%",
            maxWidth: 650,
            maxHeight: "85%",
            alignSelf: "center",
            gap: 16,
          }}
        >
          <Label size={24}>Go anywhere.</Label>
          <Field
            accessibilityLabel="Command search"
            placeholder="Find a thought or command…"
            value={query}
            onChangeText={setQuery}
            autoFocus
            onKeyPress={(e) => {
              if (e.nativeEvent.key === "Escape")
                useCommands.getState().close();
            }}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8 }}
          >
            {commands
              .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
              .map((c) => (
                <Button key={c.name} onPress={() => go(c.action)}>
                  {c.name}
                </Button>
              ))}
            {!!query &&
              notes
                .filter(
                  (n) =>
                    !n.archived &&
                    (n.title + " " + n.body)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .slice(0, 12)
                .map((n) => (
                  <Button
                    key={n.id}
                    onPress={() => go(() => router.push(`/notes/${n.id}`))}
                  >
                    Open · {n.title || "Untitled"}
                  </Button>
                ))}
          </ScrollView>
          <Label muted size={12}>
            Web shortcuts: Ctrl/⌘ K · palette; Ctrl/⌘ Shift N · capture. Tab and
            Enter navigate results.
          </Label>
          <Button onPress={useCommands.getState().close}>Close commands</Button>
        </View>
      </View>
    </Modal>
  );
}
