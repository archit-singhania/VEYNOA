# VEYNOA — V1 product specification

Speak. Think. Remember.

An account-free, local-first mobile notebook. Notes are the home screen. Voice and AI assist the notebook without replacing it with a chat homepage.

## Scope

Notes with autosave, pinning, archive and smart collections; voice recording and playback; optional cloud transcription and analysis; tasks and journal labels on the same note; related thoughts and grounded answers; Garden, Bloom, Timeline and DayStory; export and deletion; light/dark themes.

No accounts, collaboration, cloud note synchronization, subscriptions, ads or calendar integration in V1. Cloud inference is opt-in. Local-only is the initial state. Never insert synthetic user notes on first launch.

## Acceptance

1. Create, edit, reopen, search, archive and delete notes offline without data loss.
2. Request microphone permission only on a recording action; preserve recordings in document storage.
3. Suggestions require an explicit acceptance action and never rewrite the source note.
4. Local-only prevents every inference request, including queued jobs.
5. Ask sends at most eight relevant excerpts and shows source notes.
6. DayStory skips empty days; saving it is an explicit action.
7. Export is portable; deletion removes notes, derived records, recordings and preferences.
8. Android and iOS physical-device verification is a release gate, not implied by a successful bundle.
