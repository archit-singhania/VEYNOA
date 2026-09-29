# Advanced intelligence implementation audit

Date: 2026-09-29. These are first implementations across the ten requested feature areas, not a claim that the complete advanced product vision is finished. All changes remain local; nothing deployed.

## Delivered and boundaries

| Feature | Implemented | Remaining / limitation |
|---|---|---|
| 21. Knowledge graph | Notes, tags, projects, accepted/wiki links, revision-valid AI entities, source drilldowns, date/project filtering, zoom, connected components | First 50 notes; circular layout; no learned communities or graph database; entity edges require existing cloud analysis |
| 22. Time-aware memory | SQLite snapshots on content change, end-of-date reconstruction, distinct-line comparison, source links, optional historical Ask | Observed history begins at upgrade; title/body only; cloud context limited to eight snapshots; no full temporal workspace model |
| 23. Visual dashboard | 14-day activity bars, idea/action ratio, open action priority counts, topic counts, source drilldowns | Descriptive metrics, not forecasts, causal analytics or trained models |
| 24. Local models | Browser worker runtime for MiniLM embeddings/classification, Flan-T5 summaries, Whisper English audio, explicit download/unload, reviewed save | Actual inference/latency/offline cache acceptance NOT RUN; web only; bounded inputs; no native engine, automatic fallback or fine-tuning |
| 25. Multimodal search | PDF page/text indexing, Tesseract image OCR with region coordinates, CLIP image/text vectors, transcript timestamp search/playback | Model acceptance NOT RUN; region metadata rather than highlighted crops; no scanned-PDF OCR or automatic page scrolling; mixed scores are not calibrated probabilities |
| 26. Decisions | Structured choice/alternatives/assumptions/evidence/outcomes, optional evidence review through existing grounded Ask | AI review transient; no causal model, automatic contradiction resolution or persistent outcome forecasting |
| 27. Resurfacing | Context/project/reminder/age ranking, persisted positive/negative feedback, tag preferences, seven-day snooze/reset, reasons | Explainable heuristic adaptation, not a trained personal recommendation model; in-app only |
| 28. Thinking canvas | Edit/select branches, reviewed cloud alternatives/assumptions, local web segmented dictation, selected-branch goal proposals | Eight-second windows with inference gaps, unfinished window discarded on stop; no uninterrupted streaming, automatic live map, infinite board or branch deletion UI |
| 29. Learning | Source-linked editable draft cards, reveal/self-grade, spaced scheduling, review/lapse history, changed-source warning | Manual cards and self-assessment; no generated quiz bank, learned mastery estimate or editing saved cards (replace a due card instead) |
| 30. Goals | Editable proposal draft, sequential/independent dependencies, explicit approval to create actions, dependency completion guard, protected reversal, audit | Completion should be managed in Goals; Today changes do not synchronize step state; no arbitrary dependency editor or external execution |

Entry: **Workspace → Intelligence** or **Commands → Intelligence studio**. Canvas changes live on the existing note canvas. The existing premium theme, button motion, responsive page layout and reduced-motion preferences are reused.

## Implementation phases completed

1. Added schema migration four, historical triggers and persistent decisions/feedback/cards/goals/evidence records.
2. Added deterministic graph, history, ranking, scheduling and dependency logic with source-aware UI panels.
3. Added web-only model worker, local runtime assets, explicit download controls and OCR/multimodal indexing. Native imports resolve to a clear unsupported-runtime adapter rather than loading browser code.
4. Extended the existing canvas and connected proposed actions to existing workspace tasks.
5. Added integration tests against the actual intelligence repository through a SQLite adapter, expanded the manual testing guide for the original baseline and all thirty feature areas, and documented acceptance gaps.

The existing canvas save SQL had seven placeholders for six columns. It now uses six, and accepting a batch of suggested branches is transactional. Ordinary single-node edits still use the existing save path.

## Data behavior and privacy

- Existing notes receive a snapshot at migration time, not their original creation date. New content changes create snapshots. There is currently no pruning UI or storage budget for this history: retention controls remain a scale-up task.
- Active intelligence lists omit archived/trashed source notes. Permanent deletion cascades note-bound snapshots, decisions, cards, feedback and indexed evidence. Goals retain audit history and detached source references; full reset removes goals as well.
- Private vault data never enters these tables or the ordinary note store. Ordinary intelligence data is not encrypted by the vault or biometric UI lock.
- Local inference sends no note/image/audio payload to a gateway. Model loading makes network requests to Hugging Face and OCR language-data hosting. Model downloads require explicit interaction. Browser cache eviction can prevent offline restart; Stop/unload does not remove cached downloads.
- Cloud review/generation uses the existing privacy-gated, validated gateway routes. No new autonomous external actions were introduced.
- Existing JSON/Markdown export is still not a complete backup of these tables, attachments or audio. Full backup/import remains deferred.

## Validation record

- Mobile and gateway TypeScript checks pass.
- Existing 38 tests plus 10 new tests pass (48 total). New coverage includes actual proposal/approval/reversal/decision/card/evidence repository operations, dependency gating, history migration, graph provenance, snooze/ranking, scheduling and date drilldowns.
- Web, Android and iOS Expo exports passed during integration. These are JavaScript/Hermes exports, not installed or signed application builds.
- Final local HTTP checks returned 200 for home, the Intelligence route, inference worker, ONNX JS/WASM, OCR worker/core and PDF worker, with the expected JavaScript/WASM MIME types and cross-origin isolation header. This verifies asset delivery, not browser execution.
- The local worker bundles successfully with Transformers.js 4.3.0 and Tesseract.js 6.0.1. Model weights were not downloaded and inference has not been exercised; bundling is not model validation.
- Browser automation remains blocked by `failed to write kernel assets: The system cannot find the path specified`. No new UI interaction, screenshot, microphone or visual acceptance is claimed.
- Upgrading Transformers.js from 3.8.1 to 4.3.0 removed the new high-severity sharp findings. npm reports 13 moderate findings remaining in the existing dependency chain; no forced Expo downgrade was applied.
- Generated `/public/ml/`, PDF worker, model/runtime build artifacts, npm cache and logs are ignored. Source worker code and lockfile are retained. No runtime assets or log output should appear as new tracked content.

## Next release gates

1. Run the complete [manual guide](FEATURE_TESTING_GUIDE.md), starting with baseline B1–B8 and local features. Mark actual results rather than assuming acceptance from the builds.
2. On a supported browser, test each downloaded model, OCR and image embeddings using synthetic content; inspect network requests, cancellation, low-memory behavior, warm-worker offline inference and cold offline reload separately. Record speed and memory use before making performance claims.
3. Run the deferred physical-device audio/notifications/sharing/biometric pass and live gateway evaluation. Verify microphone cleanup when navigating or backgrounding the canvas.
4. Build full backup/import before relying on the expanded local database for irreplaceable data.
5. Add history retention, index rebuild/removal tools, action/goal bidirectional synchronization, large-library pagination, native local inference and broader accessibility/performance testing as follow-ups.

Runtime references: [Transformers.js](https://huggingface.co/docs/transformers.js), [Tesseract.js](https://github.com/naptha/tesseract.js). These document the libraries; they are not evidence that this app's runtime acceptance has passed.
