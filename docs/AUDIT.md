# VEYNOA implementation audit

2026-09-29 expansion: [20-feature audit](FEATURE_EXPANSION_AUDIT.md) and [manual testing guide](FEATURE_TESTING_GUIDE.md). These supersede baseline statements about absent tags, history, attachments and private storage; release and device validation remain incomplete.

Latest follow-up: [Experience and reliability upgrade](EVOLUTION_AUDIT.md) records the new motion, quick capture, recovery, queue and gateway work, with 28 passing tests. The evidence below describes the original baseline.

Date: 2026-09-28. Started from a repository containing only a README.

**Outcome: runnable development baseline, with implemented surfaces across the roadmap. The full proposed V1 is not complete or production-ready.** Code existence, successful builds and device acceptance are distinguished below.

| Phase                    | Implemented                                                                                                                                               | Status / remaining                                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Specification        | PRODUCT, ARCHITECTURE, DATABASE, AI_CONTRACTS, DESIGN_SYSTEM, ROADMAP                                                                                     | Complete for this baseline; simplifications below are explicit.                                                                                                                                |
| 1 — Expo foundation      | SDK 55, TypeScript, Router, Zustand, safe areas, gestures, light/dark/system theme, monorepo                                                              | Android/iOS/web JS exports pass. Expo Go launch on physical Android/iPhone remains unverified.                                                                                                 |
| 2 — Notes                | Create/edit, immediate autosave, pin, archive/restore, delete, text search, smart kind collections, task completion                                       | Web create/edit/reload and suggestion acceptance verified. Plain-text editor; custom folders, rich attachments and multiple labels per note remain.                                            |
| 3 — SQLite               | Versioned migration, repository, FK cascades, native FTS5 triggers, analysis revision guards, atomic transcription, persistent queue/settings             | Real SQLite tests pass. Web has a tested-startup fallback because its WASM build lacks FTS5. Database upgrade/restore matrix remains.                                                          |
| 4 — Personality          | Reduced-motion-aware breathing orb, time-based greeting, device TTS, daily/always/never preference, haptics                                               | Native speech/haptics and startup timing unverified. No elaborate startup transition.                                                                                                          |
| 5 — Voice                | On-demand permission, metering, pause/resume, document-directory persistence, note playback, foreground pause, back protection                            | Native-only; physical-device interruptions/storage-failure tests remain. Web explicitly directs users to mobile.                                                                               |
| 6 — Gateway              | Seven versioned routes, Workers AI binding, Zod validation, bounded request bodies, per-IP/install limits, CORS, no-store responses, no note database     | Worker dry-run passes. Not deployed; no authenticated Cloudflare account/live inference validated.                                                                                             |
| 7 — Dictation            | Saved-recording transcription and experimental ~12-second segmented capture, progressive append, durable jobs, atomic transcript marking, ordered retries | Experimental implementation only. Segment gaps, recorder transitions and end-to-end latency need physical-device/provider checks. Not claimed as seamless live STT.                            |
| 8 — Ambient intelligence | Three-second analysis debounce, local rule suggestions, structured cloud analysis, revision-bound output, explicit kind acceptance                        | Full-note analysis, not changed paragraph extraction. Suggestions change note kind; extracted individual tasks lack separate task records. No 100-note model evaluation yet.                   |
| 9 — Second Brain         | Local embedding storage, cosine retrieval, max-eight source excerpts, cited Ask, related-word cards, connect API                                          | End-to-end provider evaluation pending. Related cards use words; typed persisted relationship graph, block/entity normalization and semantic result list remain.                               |
| 10 — Visual intelligence | Frequency-sized Garden clusters, topic drilldown, Bloom branches, persistent draggable SVG-linked canvas                                                  | Initial board, not infinite canvas. Pinch zoom, manual connections, accessible positional controls, node deletion and double-tap-to-note remain.                                               |
| 11 — Timeline / DayStory | Chronological notes, date selection, minimum-content guard, bounded summary context, explicit save-to-journal                                             | Manual generation; no nightly scheduling. Source set limited to eight notes; saved story becomes a new journal note and regeneration is not deduplicated.                                      |
| 12 — Hardening           | Foreground retries/backoff, timeout/abort, privacy gating, error boundary, JSON/Markdown export, delete-all, automated tests, CI definition, EAS profiles | Partial. Backup/import with audio, crash recovery under device kill, broad accessibility/performance, production abuse/budget controls, security review, signed app builds and release remain. |

## Verification evidence

- 17 automated tests passed: real SQLite schema/FTS/update/delete behavior, stale revision rejection, cascade deletion, transaction rollback, greetings, suggestions, cosine edge cases, retrieval bounds, retry bounds, schema validation, gateway rate limits/citations/origins, transcription response, local-only and HTTPS gating.
- Mobile and Worker TypeScript checks passed.
- Expo dependency check matches installed SDK package recommendations (offline check).
- Expo exports succeeded for web, Android and iOS. These are JS/Hermes bundles, not APK/IPA distribution builds.
- Cloudflare Wrangler deployment dry-run succeeded with AI and both rate-limit bindings. No remote deployment occurred.
- Browser: initial startup uncovered missing web FTS5; fixed with platform fallback. Created a clearly marked QA note, accepted a task suggestion and reloaded; body/title/kind persisted. Dark editor visually inspected. Broader browser/device interaction coverage remains.
- CI workflow is written but has not run on GitHub.

## Important implementation limits

1. A single `kind` represents each note's current collection. It cannot simultaneously be a task and journal. Analyses hold topics/entities as JSON; the full proposed normalized thought-block/entity/project graph is not built.
2. Local search is native FTS5; web uses case-insensitive text matching. Semantic retrieval requires generated embeddings and a configured live gateway.
3. Queue processing happens while the app is open. Five failed attempts require explicit retry. Switching local-only on aborts active client requests; requests already received by the provider cannot be recalled.
4. Notes are not encrypted by the app. Device protections apply. JSON/Markdown exports do not include audio bytes, embeddings, queue or preferences and are not full restorable backups.
5. Anonymous rate limiting is not authentication. No global durable quota ledger or provider failover is implemented. Cloudflare is the only working provider adapter; no fake cloud results are substituted.
6. Native audio and live provider behavior have not been tested in this environment. Do not treat the experimental segmented mode as reliable dictation until it passes the checklist.
7. Performance targets and 100-note AI evaluation accuracy have not been measured. No percentage-complete estimate is asserted.

## Next steps, in order

1. Run Expo Go on Android and iPhone and complete `DEVICE_CHECKLIST.md`, starting with note durability and recording continuity. Fix those failures before expanding features.
2. Authenticate the intended Cloudflare account, review quotas/model availability/origins, deploy the gateway and exercise transcribe → append → analyze → embed → Ask using synthetic notes/audio.
3. Harden the segmented recorder state machine against interruptions, duplicate saves, process death and network backpressure; measure gaps and latency.
4. Add multi-label/block/task/project/relationship persistence; wire semantic connections into related cards and Garden.
5. Complete canvas navigation/editing and a real restorable backup including recordings; add import validation and migration tests.
6. Build the 100-note evaluation corpus, run live-model evaluations, measure device performance and audit accessibility.
7. Apply production budget/abuse controls, produce signed preview APK/iOS builds, then perform release review. Store distribution and credentials are separate prerequisites.

See README for commands. All implementation changes remain local; no commit, push, PR, deployment or store submission was performed.
