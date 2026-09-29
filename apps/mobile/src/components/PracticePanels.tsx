import { useState } from "react";
import { intelligence, type Decision } from "../database/intelligence";
import { cloud, useApp } from "../stores/app";
import { canComplete } from "@veynoa/domain/src/intelligence";
import { Button, Card, Field, Label, Row, Eyebrow } from "./ui";
import {
  SourcePicker,
  Sources,
  type IntelligenceState,
} from "./IntelligenceContext";
function DecisionReview({ d, s }: { d: Decision; s: IntelligenceState }) {
  const [outcome, setOutcome] = useState(d.outcome),
    [review, setReview] = useState("");
  const local = useApp((x) => x.settings.localOnly);
  return (
    <Card>
      <Eyebrow>Decision · {new Date(d.createdAt).toLocaleDateString()}</Eyebrow>
      <Label size={22}>{d.question}</Label>
      <Label>Choice: {d.choice}</Label>
      <Label>Alternatives: {d.alternatives || "None recorded"}</Label>
      <Label>Assumptions: {d.assumptions || "None recorded"}</Label>
      <Sources
        ids={[d.noteId, ...JSON.parse(d.evidenceIds)].filter(
          (id, i, a) => a.indexOf(id) === i,
        )}
        s={s}
      />
      <Field
        accessibilityLabel="Decision outcome"
        multiline
        value={outcome}
        onChangeText={setOutcome}
        placeholder="What happened? Which assumptions held up?"
      />
      <Row>
        <Button
          disabled={s.busy}
          onPress={() => void s.run(() => intelligence.outcome(d.id, outcome))}
        >
          Save outcome
        </Button>
        <Button
          disabled={s.busy || local}
          onPress={() =>
            void s.run(async () => {
              const sources = [d.noteId, ...JSON.parse(d.evidenceIds)]
                .filter((id, i, a) => a.indexOf(id) === i)
                .map((id) => s.notes.find((n) => n.id === id))
                .filter((n) => !!n)
                .slice(0, 8)
                .map((n) => ({
                  id: n.id,
                  title: n.title,
                  text: n.body.slice(0, 2000),
                }));
              const result = await cloud("ask", {
                question:
                  `Review this decision for possible unsupported assumptions and conflicting evidence. Do not treat differences as proven contradictions. Decision: ${d.question}. Choice: ${d.choice}. Assumptions: ${d.assumptions}. Outcome: ${outcome}`.slice(
                    0,
                    1000,
                  ),
                sources,
              });
              setReview(result.answer);
            })
          }
        >
          Review evidence with cloud AI
        </Button>
      </Row>
      {!!review && <Label>{review}</Label>}
    </Card>
  );
}
export function DecisionsPanel({ s }: { s: IntelligenceState }) {
  const [ids, setIds] = useState<string[]>([]),
    [question, setQuestion] = useState(""),
    [choice, setChoice] = useState(""),
    [alternatives, setAlternatives] = useState(""),
    [assumptions, setAssumptions] = useState("");
  return (
    <>
      <Card>
        <Eyebrow>Decision intelligence</Eyebrow>
        <Label muted>
          Select the decision's source first, then optional supporting notes (up
          to 8). Keep predictions separate from observed outcomes.
        </Label>
        <SourcePicker s={s} selected={ids} onChange={setIds} multiple />
        <Field
          accessibilityLabel="Decision question"
          placeholder="What are you deciding?"
          value={question}
          onChangeText={setQuestion}
        />
        <Field
          accessibilityLabel="Decision choice"
          placeholder="Chosen direction"
          value={choice}
          onChangeText={setChoice}
        />
        <Field
          accessibilityLabel="Alternatives"
          placeholder="Alternatives considered"
          value={alternatives}
          onChangeText={setAlternatives}
          multiline
        />
        <Field
          accessibilityLabel="Assumptions"
          placeholder="Assumptions to revisit"
          value={assumptions}
          onChangeText={setAssumptions}
          multiline
        />
        <Button
          disabled={s.busy || !ids.length || !question.trim() || !choice.trim()}
          onPress={() =>
            void s.run(async () => {
              await intelligence.decision(
                { noteId: ids[0], question, choice, alternatives, assumptions },
                ids.slice(1),
              );
              setQuestion("");
              setChoice("");
            })
          }
        >
          Record decision
        </Button>
      </Card>
      {s.decisions.map((d) => (
        <DecisionReview key={d.id} d={d} s={s} />
      ))}
    </>
  );
}
export function LearningPanel({ s }: { s: IntelligenceState }) {
  const [ids, setIds] = useState<string[]>([]),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [revealed, setRevealed] = useState<string[]>([]);
  const due = s.cards.filter((c) => c.dueAt <= Date.now());
  return (
    <>
      <Card>
        <Eyebrow>Learning & recall</Eyebrow>
        <Label muted>
          Build source-linked cards, recall before revealing, then grade
          honestly. Scheduling uses your self-rating; intervals are not a
          measurement of knowledge.
        </Label>
        <SourcePicker s={s} selected={ids} onChange={setIds} />
        <Field
          accessibilityLabel="Flashcard question"
          value={question}
          onChangeText={setQuestion}
          placeholder="Question to recall"
        />
        <Field
          accessibilityLabel="Flashcard answer"
          value={answer}
          onChangeText={setAnswer}
          placeholder="Answer, with evidence from the note"
          multiline
        />
        <Row>
          <Button
            disabled={!ids.length}
            onPress={() => {
              const n = s.notes.find((n) => n.id === ids[0]);
              setQuestion(
                "What are the key points of " + (n?.title || "this note") + "?",
              );
              setAnswer(n?.body.slice(0, 1500) || "");
            }}
          >
            Draft from source
          </Button>
          <Button
            disabled={
              s.busy || !ids.length || !question.trim() || !answer.trim()
            }
            onPress={() =>
              void s.run(async () => {
                await intelligence.card(ids[0], question, answer);
                setQuestion("");
                setAnswer("");
              })
            }
          >
            Save card
          </Button>
        </Row>
        <Label>
          {due.length} due · {s.cards.length} total ·{" "}
          {s.cards.filter((c) => c.intervalDays >= 21).length} with intervals
          ≥21 days
        </Label>
      </Card>
      {due.map((c) => (
        <Card key={c.id}>
          <Label size={22}>{c.question}</Label>
          <Sources ids={[c.noteId]} s={s} />
          {s.notes.find((n) => n.id === c.noteId)?.revision !==
            c.sourceRevision && (
            <Label>
              Source changed since this card was created. Check the answer
              before grading.
            </Label>
          )}
          {revealed.includes(c.id) ? (
            <>
              <Label>{c.answer}</Label>
              <Row>
                {["Again · 10 min", "Hard", "Good", "Easy"].map(
                  (label, grade) => (
                    <Button
                      key={grade}
                      disabled={s.busy}
                      onPress={() =>
                        void s.run(async () => {
                          await intelligence.review(c.id, grade);
                          setRevealed((a) => a.filter((id) => id !== c.id));
                        })
                      }
                    >
                      {label}
                    </Button>
                  ),
                )}
              </Row>
            </>
          ) : (
            <Button onPress={() => setRevealed([...revealed, c.id])}>
              Reveal answer
            </Button>
          )}
          <Button
            quiet
            disabled={s.busy}
            onPress={() => void s.run(() => intelligence.deleteCard(c.id))}
          >
            Delete card
          </Button>
        </Card>
      ))}
      <Card>
        <Eyebrow>Scheduled cards</Eyebrow>
        {s.cards
          .filter((c) => c.dueAt > Date.now())
          .map((c) => (
            <Label key={c.id}>
              {c.question} · next {new Date(c.dueAt).toLocaleString()} ·{" "}
              {c.reviews} reviews / {c.lapses} lapses
            </Label>
          ))}
      </Card>
    </>
  );
}
export function GoalsPanel({ s }: { s: IntelligenceState }) {
  const [ids, setIds] = useState<string[]>([]),
    [title, setTitle] = useState(""),
    [steps, setSteps] = useState(""),
    [sequential, setSequential] = useState(true);
  const local = useApp((x) => x.settings.localOnly);
  return (
    <>
      <Card>
        <Eyebrow>Goal execution · you approve every action</Eyebrow>
        <SourcePicker s={s} selected={ids} onChange={setIds} multiple />
        <Field
          accessibilityLabel="Goal title"
          value={title}
          onChangeText={setTitle}
          placeholder="Outcome to work toward"
        />
        <Field
          accessibilityLabel="Proposed goal steps"
          value={steps}
          onChangeText={setSteps}
          multiline
          placeholder="One step per line. Edit these before saving the proposal."
        />
        <Row>
          <Button
            primary={sequential}
            onPress={() => setSequential(!sequential)}
          >
            {sequential ? "Sequential dependencies" : "Independent steps"}
          </Button>
          <Button
            disabled={s.busy || local || !ids.length || !title.trim()}
            onPress={() =>
              void s.run(async () => {
                const source = s.notes.filter((n) => ids.includes(n.id));
                const result = await cloud("bloom", {
                  text: `Propose concrete steps for this goal using only these sources. Return each step as one branch; do not execute anything. Goal: ${title}\n${source.map((n) => n.title + "\n" + n.body.slice(0, 1500)).join("\n")}`.slice(
                    0,
                    16000,
                  ),
                });
                setSteps(
                  result.branches
                    .map((b) => b.title + ": " + b.detail.replace(/\n/g, " "))
                    .join("\n"),
                );
              })
            }
          >
            Suggest steps with cloud AI
          </Button>
          <Button
            disabled={s.busy || !ids.length || !title.trim() || !steps.trim()}
            onPress={() =>
              void s.run(async () => {
                await intelligence.propose(
                  title,
                  ids,
                  steps.split("\n"),
                  sequential,
                );
                setSteps("");
                setTitle("");
              })
            }
          >
            Save proposal
          </Button>
        </Row>
        <Label muted>
          Proposals create no tasks. Approving a step creates one action on the
          first source note. Dependencies must be completed here in order.
          External services are never changed.
        </Label>
      </Card>
      {s.goals.map((g) => (
        <Card key={g.id}>
          <Label size={24}>{g.title}</Label>
          <Sources ids={JSON.parse(g.sourceIds)} s={s} />
          {s.steps
            .filter((step) => step.goalId === g.id)
            .map((step) => (
              <Card key={step.id}>
                <Label>{step.text}</Label>
                <Label muted>
                  {step.state} ·{" "}
                  {step.dependencies.length
                    ? "After: " +
                      step.dependencies
                        .map((id) => s.steps.find((x) => x.id === id)?.text)
                        .join(", ")
                    : "No dependencies"}
                </Label>
                <Row>
                  {step.state === "proposed" && (
                    <Button
                      disabled={s.busy}
                      onPress={() =>
                        void s.run(() =>
                          intelligence.transition(step.id, "approve"),
                        )
                      }
                    >
                      Approve action
                    </Button>
                  )}
                  {step.state === "approved" && (
                    <>
                      <Button
                        disabled={s.busy || !canComplete(step, s.steps)}
                        onPress={() =>
                          void s.run(() =>
                            intelligence.transition(step.id, "complete"),
                          )
                        }
                      >
                        Complete step
                      </Button>
                      <Button
                        disabled={s.busy}
                        onPress={() =>
                          void s.run(() =>
                            intelligence.transition(step.id, "revert"),
                          )
                        }
                      >
                        Revert approval
                      </Button>
                    </>
                  )}
                </Row>
              </Card>
            ))}
          <Eyebrow>Audit trail</Eyebrow>
          {s.events
            .filter((e) => e.goalId === g.id)
            .slice(0, 30)
            .map((e) => (
              <Label key={e.id} muted size={12}>
                {new Date(e.at).toLocaleString()} · {e.action}
                {e.stepId
                  ? " · " + s.steps.find((x) => x.id === e.stepId)?.text
                  : ""}
              </Label>
            ))}
        </Card>
      ))}
    </>
  );
}
