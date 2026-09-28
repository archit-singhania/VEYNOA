# AI contracts

POST `/v1/analyze`: text → kind, title, topics, entities, suggestions, tasks, journalCandidate, importance.
POST `/v1/transcribe`: base64 audio → text.
POST `/v1/embed`: texts → vectors + model.
POST `/v1/bloom`: text → branches.
POST `/v1/story`: dated excerpts → summary + open items.
POST `/v1/ask`: question + up to eight excerpts → answer + source IDs.
POST `/v1/connect`: excerpts → related source/target pairs.

All schemas are executable in packages/ai-contracts. Requests are capped, malformed model output fails closed, and source IDs must belong to the request. Notes are untrusted quoted data, never instructions. There is no external action tool available to the model.

No provider keys in the app. Worker routes require an installation header and IP/installation rate limits. Public anonymous access remains a quota-abuse risk; deploy only for a bounded beta with provider budget limits. No guarantee of unlimited free inference.
