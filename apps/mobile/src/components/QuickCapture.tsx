import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
import type { Kind } from "@veynoa/domain";
import { useInterface } from "../stores/interface";
import { useApp } from "../stores/app";
import { repository } from "../database/repository";
import {
  Button,
  Eyebrow,
  Field,
  IconButton,
  Label,
  Row,
  serif,
  useTheme,
} from "./ui";
import { Reveal, useMotion } from "./motion";
const prompts: Record<string, { kind: Kind; body: string }> = {
  Blank: { kind: "note", body: "" },
  Idea: {
    kind: "idea",
    body: "The idea\n\nWhy it matters\n\nOne small next step\n",
  },
  Journal: {
    kind: "journal",
    body: "What’s on my mind\n\nSomething I’m grateful for\n\nWhat I’m taking into tomorrow\n",
  },
  Task: { kind: "task", body: "" },
};
let draftWrites = Promise.resolve();
export function QuickCapture() {
  const open = useInterface((s) => s.captureOpen);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>("note");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const savingLock = useRef(false);
  const t = useTheme();
  const motion = useMotion();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoaded(false);
    setError("");
    void draftWrites
      .then(() => repository.draft())
      .then((d) => {
        if (active) {
          setText(d);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Draft could not be loaded.",
          );
      });
    return () => {
      active = false;
    };
  }, [open]);
  const change = (value: string) => {
    setText(value);
    draftWrites = draftWrites
      .then(() => repository.saveDraft(value))
      .catch(() =>
        setError(
          "Draft could not be saved. Keep this window open and try Save thought.",
        ),
      );
  };
  const close = () => {
    if (!savingLock.current) useInterface.getState().closeCapture();
  };
  const save = async (voice = false) => {
    if (savingLock.current || !loaded) return;
    savingLock.current = true;
    setSaving(true);
    try {
      const first = text.split("\n").find((l) => l.trim()) || "";
      await draftWrites;
      const note = await useApp
        .getState()
        .capture(kind, text, first.slice(0, 70));
      setText("");
      useInterface.getState().closeCapture();
      useInterface.getState().notify({ message: "Thought saved" });
      router.push(voice ? `/capture/${note.id}` : `/notes/${note.id}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your thought could not be saved.",
      );
    } finally {
      if (mounted.current) setSaving(false);
      savingLock.current = false;
    }
  };
  return (
    <Modal
      visible={open}
      transparent
      animationType={motion ? "fade" : "none"}
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", padding: 20 }}
      >
        <Pressable
          accessibilityLabel="Close quick capture"
          onPress={close}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#081610B8",
          }}
        />
        <Reveal
          active={open}
          style={{
            width: "100%",
            maxWidth: 590,
            alignSelf: "center",
            maxHeight: "95%",
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              flexShrink: 1,
              padding: 25,
              backgroundColor: t.card,
              borderRadius: 26,
              borderWidth: 1,
              borderColor: t.line,
              gap: 18,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1 }}>
                <Eyebrow>QUICK CAPTURE</Eyebrow>
                <Label size={29} style={{ fontFamily: serif }}>
                  What’s on your mind?
                </Label>
              </View>
              <IconButton
                name="close"
                label="Close capture, keep draft"
                onPress={close}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Row>
                {Object.entries(prompts).map(([name, p]) => (
                  <Button
                    key={name}
                    disabled={saving || !loaded}
                    primary={kind === p.kind}
                    onPress={() => {
                      setKind(p.kind);
                      if (!text.trim()) change(p.body);
                    }}
                  >
                    {name}
                  </Button>
                ))}
              </Row>
              <Field
                key={loaded ? "ready" : "loading"}
                accessibilityLabel="Quick thought"
                placeholder="Catch a thought before it slips away…"
                value={text}
                editable={loaded && !saving}
                onChangeText={change}
                multiline
                autoFocus
                style={{
                  minHeight: 180,
                  marginTop: 16,
                  lineHeight: 26,
                  textAlignVertical: "top",
                }}
              />
            </ScrollView>
            {!!error && <Label size={12}>{error}</Label>}
            <Row>
              <Button
                primary
                icon="check"
                disabled={!loaded || saving || !text.trim()}
                onPress={() => void save()}
              >
                {saving ? "Saving…" : "Save thought"}
              </Button>
              <Button
                icon="mic"
                disabled={!loaded || saving}
                onPress={() => void save(true)}
              >
                Use my voice
              </Button>
            </Row>
            <Label muted size={11}>
              Your draft stays on this device if you close this window.
            </Label>
          </View>
        </Reveal>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function ToastHost() {
  const toast = useInterface((s) => s.toast);
  const t = useTheme();
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => useInterface.getState().dismiss(),
      toast.action ? 12000 : 4500,
    );
    return () => clearTimeout(timer);
  }, [toast]);
  if (!toast) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: 96,
        left: 18,
        right: 18,
        alignItems: "center",
      }}
    >
      <Reveal key={toast.message} style={{ width: "100%", maxWidth: 480 }}>
        <View
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: t.hero,
            borderRadius: 16,
            padding: 15,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Label size={13} style={{ color: "#F1F3E8", flex: 1 }}>
            {toast.message}
          </Label>
          {toast.action && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                toast.action?.();
                useInterface.getState().dismiss();
              }}
              style={{
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: 10,
              }}
            >
              <Label
                size={13}
                style={{ color: t.heroAccent, fontWeight: "700" }}
              >
                {toast.actionLabel}
              </Label>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            onPress={() => useInterface.getState().dismiss()}
            style={{ minHeight: 44, minWidth: 32, justifyContent: "center" }}
          >
            <Label style={{ color: "#F1F3E8" }}>×</Label>
          </Pressable>
        </View>
      </Reveal>
    </View>
  );
}
