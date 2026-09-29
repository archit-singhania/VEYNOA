import { useEffect, useState, useRef } from "react";
import { AppState, Platform, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useApp } from "../stores/app";
import { useInterface } from "../stores/interface";
import { Button, Label, useTheme } from "./ui";
import { useCommands } from "./CommandPalette";
export async function authenticate() {
  if (Platform.OS === "web")
    throw new Error(
      "Biometric app lock is available on Android and iOS. The encrypted vault works on web.",
    );
  if (!(await LocalAuthentication.isEnrolledAsync()))
    throw new Error(
      "Enroll a fingerprint or face in your device settings first.",
    );
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Veynoa",
    biometricsSecurityLevel: "strong",
    disableDeviceFallback: false,
  });
  if (!result.success) throw new Error("Authentication was not completed.");
}
export function AppLock({ children }: { children: React.ReactNode }) {
  const enabled = useApp((s) => s.settings.appLock);
  const [locked, setLocked] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const authenticating = useRef(false);
  const t = useTheme();
  useEffect(() => {
    setLocked(true);
  }, [enabled]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && !authenticating.current) {
        setLocked(true);
        useInterface.getState().closeCapture();
        useCommands.getState().close();
      }
    });
    return () => sub.remove();
  }, []);
  if (!enabled || Platform.OS === "web") return <>{children}</>;
  return (
    <>
      <View
        style={{ flex: 1, display: locked ? "none" : "flex" }}
        pointerEvents={locked ? "none" : "auto"}
        accessibilityElementsHidden={locked}
        importantForAccessibility={locked ? "no-hide-descendants" : "auto"}
      >
        {children}
      </View>
      {locked && (
        <View
          style={{
            flex: 1,
            backgroundColor: t.bg,
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
            padding: 32,
          }}
        >
          <Label size={30}>Your thoughts are private.</Label>
          <Label muted>Use your device authentication to continue.</Label>
          <Button
            disabled={busy}
            primary
            onPress={() => {
              setBusy(true);
              authenticating.current = true;
              setError("");
              void authenticate()
                .then(() => setLocked(false))
                .catch((e) => setError(e.message))
                .finally(() => {
                  authenticating.current = false;
                  setBusy(false);
                });
            }}
          >
            Unlock Veynoa
          </Button>
          {!!error && <Label>{error}</Label>}
        </View>
      )}
    </>
  );
}
