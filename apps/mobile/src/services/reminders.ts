import { Platform } from "react-native";
export async function scheduleReminder(noteId: string, at: number) {
  if (Platform.OS === "web") return null;
  const N = await import("expo-notifications");
  if (Platform.OS === "android")
    await N.setNotificationChannelAsync("thoughts", {
      name: "Thought reminders",
      importance: N.AndroidImportance.DEFAULT,
    });
  const p = await N.requestPermissionsAsync();
  if (!p.granted)
    throw new Error(
      "Notification permission was not granted. Your existing reminder is unchanged.",
    );
  return N.scheduleNotificationAsync({
    content: {
      title: "A thought to revisit",
      body: "Open Veynoa to return to your thought.",
      data: { noteId },
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DATE,
      date: new Date(at),
      channelId: "thoughts",
    },
  });
}
export async function cancelReminder(id: string | null) {
  if (id && Platform.OS !== "web")
    await (
      await import("expo-notifications")
    ).cancelScheduledNotificationAsync(id);
}
