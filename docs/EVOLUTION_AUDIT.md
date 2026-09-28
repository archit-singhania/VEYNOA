# Experience and reliability upgrade

Date: 2026-09-28. This supplements the original baseline and UI audits.

## Completed in this phase

- Motion system: spring press feedback, page reveals, modal fades and native route transitions. Both the device reduced-motion preference and the Gentle motion setting disable decorative motion.
- Quick capture: one small composer with Blank, Idea, Journal and Task starting points, voice handoff, locally persisted draft text and atomic note creation/draft clearing. Saving is guarded against duplicate taps; failures remain visible in the composer.
- Focus writing: a quieter editor with secondary actions behind More options and a dedicated Focus mode.
- Recovery: versioned SQLite upgrade adds soft deletion. Recently deleted retains notes and recordings until explicitly purged; Restore and an Undo notification recover notes. Trashed content is excluded from active search, exports and AI retrieval. Deleting cancels queued jobs; restoring does not automatically restart them.
- Queue resilience: typed permanent/retryable errors, bounded jittered retries, server Retry-After support and cancellation without consuming attempts. A successful analysis is reused if only its embedding stage failed. Revision and active-note checks guard the embedding stage.
- Retrieval: blended keyword/semantic ranking keeps useful notes without embeddings; paragraph selection finds relevant context beyond a long note's opening.
- Gateway: readiness endpoint, connection check, request IDs, content-type and length checks, fail-closed limiter errors, provider response deadlines and embedding dimension validation.

## Verification

- All 28 automated tests pass, including SQLite migration/data preservation, recoverable deletion with audio retention, retry classification, privacy gating, hybrid retrieval and gateway failure cases.
- Mobile and gateway TypeScript checks pass.
- Expo exports pass for web, Android and iOS. These are JavaScript/Hermes bundles, not signed installable applications.
- Browser: existing note survived schema upgrade; quick draft survived reload; saving opened the editor; Focus hid secondary controls; reopening capture showed a cleared draft. Phone-width (390 × 844) composer inspected with all controls visible. No browser console errors were reported during the check.
- Added a clearly labeled local QA note, “QA · Quick capture recovery.” Existing content was retained. Trash/restore storage behavior is covered by automated tests; its full browser interaction and native recording recovery remain acceptance checks.

## Remaining and next steps

1. Test Android and iPhone: microphone permission, recording interruptions, keyboard layout, process termination, playback, native transitions and reduced motion. Verify Trash → Restore with real audio and queue state.
2. Configure and deploy the intended Cloudflare gateway, then run synthetic transcribe → analyze → embed → Ask acceptance tests. The health endpoint checks bindings, not successful model inference. This phase did not deploy or call a live provider.
3. Complete restorable backups/import including audio; current JSON/Markdown exports are not backups. Trashed content is intentionally omitted from exports.
4. Finish the broader roadmap: stronger segmented dictation, richer relationships/canvas editing, performance/accessibility measurement, AI evaluation, durable production quotas and signed release builds.

The provider deadline bounds the HTTP response wait; it cannot guarantee cancellation of already-running upstream inference. Processing remains foreground-based. No production-readiness or measured performance claim is made.
