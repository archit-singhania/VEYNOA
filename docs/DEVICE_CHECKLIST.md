# Device acceptance checklist

Run on physical Android and iPhone with an Expo Go version compatible with SDK 55. Record device, OS, commit and result. JavaScript exports do not prove these checks pass.

For the 20-feature expansion, use a native preview/development build containing the new sharing, notification and authentication plugins; Expo Go is insufficient for the full checklist. Follow [the feature-by-feature guide](FEATURE_TESTING_GUIDE.md) for expected results.

- Cold launch, no account flow, safe areas, keyboard handling and large font.
- Create/edit in airplane mode; reopen and force-stop/relaunch; verify exact text.
- Search punctuation/Unicode, pin, archive/restore and task completion.
- Deny microphone permission; typing remains usable. Grant permission and retry.
- Record, pause/resume, save/replay; headphone disconnect and phone-call interruption.
- Background/foreground recording; Android back and iOS gestures must not silently discard audio.
- Experimental segmented dictation for two minutes: inspect gaps, duplicates and transcript ordering.
- Disconnect during inference, restart, recover queue, verify exactly-once transcript insertion.
- Toggle local-only during inference; no new requests and queued work stays local.
- Provider 429, timeouts and failed-job retry; earlier failed segments block later segments.
- Edit during analysis; stale output must not appear for the new revision.
- Ask citations refer only to supplied notes; test instruction-like text inside notes.
- Canvas drag/persistence, narrow-screen scrolling, VoiceOver/TalkBack, reduced motion.
- Export through OS share sheet. Current exports exclude audio bytes.
- Delete-all removes notes, derived records, recordings and preferences.
- Measure launch <1.5 s, local search/open <100 ms and typing/voice 60 FPS. These are unmeasured targets.

Release also requires backup/restore testing, model evaluation, provider budget controls and live Worker inference verification.
