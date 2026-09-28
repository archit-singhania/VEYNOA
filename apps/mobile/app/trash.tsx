import { Alert, Platform, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../src/stores/app";
import { repository } from "../src/database/repository";
import {
  Button,
  Card,
  Eyebrow,
  Label,
  Page,
  Row,
  serif,
} from "../src/components/ui";
export default function Trash() {
  const notes = useApp((s) => s.trash);
  const purge = (id: string) => {
    const run = () =>
      void repository
        .purge(id)
        .then(() => useApp.getState().refresh())
        .catch(useApp.getState().fail);
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Permanently delete this thought and its recordings? This cannot be undone.",
        )
      )
        run();
    } else
      Alert.alert(
        "Permanently delete?",
        "The thought and its recordings cannot be recovered.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete permanently", style: "destructive", onPress: run },
        ],
      );
  };
  return (
    <Page
      title="Room to change your mind."
      eyebrow="RECENTLY DELETED"
      subtitle="Thoughts stay here until you restore them or delete them permanently."
      action={
        <Button
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        >
          Done
        </Button>
      }
    >
      {!notes.length ? (
        <Card>
          <Label size={27} style={{ fontFamily: serif }}>
            Nothing to recover.
          </Label>
          <Label muted>
            Deleted thoughts will appear here. Their recordings stay with them.
          </Label>
        </Card>
      ) : (
        notes.map((n) => (
          <Card key={n.id}>
            <Eyebrow>{n.kind}</Eyebrow>
            <Label size={25} style={{ fontFamily: serif }}>
              {n.title || "Untitled thought"}
            </Label>
            <Label muted numberOfLines={2}>
              {n.body}
            </Label>
            <Row>
              <Button
                primary
                onPress={() =>
                  void useApp
                    .getState()
                    .restore(n.id)
                    .catch(useApp.getState().fail)
                }
              >
                Restore
              </Button>
              <Button quiet onPress={() => purge(n.id)}>
                Delete permanently
              </Button>
            </Row>
          </Card>
        ))
      )}
    </Page>
  );
}
