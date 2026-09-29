import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { router } from "expo-router";
import { getSharedPayloads } from "expo-sharing";
import type { NotificationResponse } from "expo-notifications";
import { Button } from "./ui";
import { useApp } from "../stores/app";
export function NativeEvents() {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const check = () => {
      try {
        setPending(getSharedPayloads().length > 0);
      } catch {}
    };
    check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    let disposed = false;
    let stop: (() => void) | undefined;
    void import("expo-notifications")
      .then((N) => {
        if (disposed) return;
        N.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });
        const open = (r: NotificationResponse) => {
          const id = r.notification.request.content.data?.noteId;
          if (
            typeof id === "string" &&
            useApp.getState().notes.some((n) => n.id === id)
          )
            router.push(`/notes/${id}`);
        };
        const listener = N.addNotificationResponseReceivedListener(open);
        stop = () => listener.remove();
        void N.getLastNotificationResponseAsync().then((r) => {
          if (r && !disposed) {
            open(r);
            void N.clearLastNotificationResponseAsync();
          }
        });
      })
      .catch(useApp.getState().fail);
    return () => {
      disposed = true;
      sub.remove();
      stop?.();
    };
  }, []);
  return pending ? (
    <Button
      onPress={() => {
        setPending(false);
        router.push("/incoming");
      }}
    >
      Review shared content
    </Button>
  ) : null;
}
