import { useState } from "react";
import { router } from "expo-router";
import { Page, Button, Row, Label, Card } from "../src/components/ui";
import { useIntelligence } from "../src/components/IntelligenceContext";
import {
  GraphPanel,
  MemoryPanel,
  DashboardPanel,
  ResurfacePanel,
} from "../src/components/KnowledgePanels";
import {
  DecisionsPanel,
  LearningPanel,
  GoalsPanel,
} from "../src/components/PracticePanels";
import { ModelsPanel, EvidencePanel } from "../src/components/ModelPanels";
const panels = {
  Graph: GraphPanel,
  Memory: MemoryPanel,
  Dashboard: DashboardPanel,
  "Local AI": ModelsPanel,
  Evidence: EvidencePanel,
  Decisions: DecisionsPanel,
  Resurface: ResurfacePanel,
  Learning: LearningPanel,
  Goals: GoalsPanel,
};
export default function Intelligence() {
  const [view, setView] = useState<keyof typeof panels>("Dashboard");
  const s = useIntelligence();
  const Panel = panels[view];
  return (
    <Page
      title="A deeper understanding."
      eyebrow="INTELLIGENCE STUDIO"
      subtitle="Follow the evidence. Connect your thinking. Choose what happens next."
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
      <Row>
        {(Object.keys(panels) as (keyof typeof panels)[]).map((name) => (
          <Button
            key={name}
            primary={view === name}
            disabled={s.busy}
            onPress={() => setView(name)}
          >
            {name}
          </Button>
        ))}
      </Row>
      {s.busy && <Label>Working…</Label>}
      {!!(s.error || s.workspace.error) && (
        <Card>
          <Label>{s.error || s.workspace.error}</Label>
        </Card>
      )}
      <Panel key={view} s={s} />
      <Card>
        <Label>Thinking canvas</Label>
        <Label muted>
          Open a note's canvas to edit branches, dictate locally on web,
          challenge assumptions, and propose a plan from selected thoughts.
        </Label>
      </Card>
    </Page>
  );
}
