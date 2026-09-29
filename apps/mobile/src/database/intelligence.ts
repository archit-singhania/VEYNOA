import { randomUUID } from "expo-crypto";
import { db } from "./repository";
import { createIntelligence } from "./intelligenceCore";
export type {
  Decision,
  StudyCard,
  Goal,
  Step,
  Evidence,
} from "./intelligenceCore";
export const intelligence = createIntelligence(db, randomUUID);
