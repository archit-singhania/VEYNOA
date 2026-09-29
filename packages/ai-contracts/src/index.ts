import { z } from "zod";
import { kinds } from "@veynoa/domain";
const text = z.string().trim().min(1).max(16000);
export const excerpt = z.object({
  id: z.string().max(100),
  title: z.string().max(300),
  text: z.string().max(2000),
});
export const analysis = z.object({
  kind: z.enum(kinds),
  title: z.string().max(300),
  topics: z.array(z.string().max(80)).max(12),
  entities: z.array(z.string().max(100)).max(20),
  suggestions: z
    .array(z.object({ kind: z.enum(kinds), label: z.string().max(200) }))
    .max(6),
  tasks: z.array(z.string().max(300)).max(12),
  journalCandidate: z.boolean(),
  importance: z.number().min(0).max(1),
});
export type Analysis = z.infer<typeof analysis>;
export const requests = {
  rewrite: z.object({
    text,
    mode: z.enum(["summarize", "clarify", "professional", "friendly"]),
  }),
  analyze: z.object({ text }),
  bloom: z.object({ text }),
  transcribe: z.object({
    audio: z
      .string()
      .min(1)
      .max(8_000_000)
      .regex(/^[A-Za-z0-9+/]*={0,2}$/),
  }),
  embed: z.object({ texts: z.array(text).min(1).max(8) }),
  ask: z.object({
    question: z.string().trim().min(1).max(1000),
    sources: z.array(excerpt).min(1).max(8),
  }),
  story: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sources: z.array(excerpt).min(1).max(8),
  }),
  connect: z.object({ sources: z.array(excerpt).min(2).max(8) }),
};
export const responses = {
  rewrite: z.object({ text: z.string().min(1).max(16000) }),
  analyze: analysis,
  transcribe: z.object({
    text: z.string().max(32000),
    segments: z
      .array(
        z
          .object({
            start: z.number().nonnegative(),
            end: z.number().nonnegative(),
            text: z.string().max(32000),
          })
          .refine((s) => s.end > s.start),
      )
      .max(2000)
      .optional(),
  }),
  embed: z.object({
    vectors: z
      .array(z.array(z.number().finite()).min(1).max(4096))
      .min(1)
      .max(8),
    model: z.string(),
  }),
  bloom: z.object({
    branches: z
      .array(
        z.object({ title: z.string().max(120), detail: z.string().max(500) }),
      )
      .min(1)
      .max(6),
  }),
  ask: z.object({
    answer: z.string().max(6000),
    sourceIds: z.array(z.string()).max(8),
  }),
  story: z.object({
    summary: z.string().max(6000),
    openItems: z.array(z.string().max(300)).max(20),
  }),
  connect: z.object({
    links: z
      .array(
        z.object({
          sourceId: z.string(),
          targetId: z.string(),
          score: z.number().min(0).max(1),
        }),
      )
      .max(28),
  }),
};
export type Route = keyof typeof requests;
