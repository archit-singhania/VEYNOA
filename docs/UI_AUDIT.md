# UI / UX redesign

Implemented an editorial and botanical visual identity across the existing application.

- Three persisted palettes (Grove, Dusk, Tide), each with light/dark/device appearance.
- Shared typography, semantic color tokens, custom vector icons, monogram and animated orbital companion.
- Responsive sidebar / mobile dock with real collection count and desktop privacy status.
- Voice invitation, daily reflection link, grid/list control, scrolling collection filters, searchable note cards and purposeful empty states.
- Paper-like editor with word count, metadata and separated suggestion surface.
- Themed voice studio, garden landscape, search prompts, chronological timeline and settings palette previews.
- Focus/hover/pressed states, reduced-motion support, named icon buttons and iOS keyboard avoidance.

The redesign does not add live provider credentials, claim native-device verification or complete the backend/product limitations documented in AUDIT.md. No demo notes were inserted by the redesign.

Visual checks: desktop dark home, light appearance controls, 390 px home, Garden and editor. Palette switching and Garden-to-note navigation were exercised. The first phone review identified a cramped title; the corrected full-width headline was rechecked. Editor chrome was then reduced so the note starts higher on the screen. Existing note data remained intact.

Validation: mobile TypeScript passed; all 17 existing regression tests passed; Android, iOS and web bundle exports passed. Browser inspection found that React Native Web did not expose selected tab state through `accessibilityState` alone, so explicit ARIA selected/pressed attributes were added.

Remaining device QA: iOS/Android large-text layout, keyboard behavior, VoiceOver/TalkBack, physical-device recording and motion performance. Review narrow-width landscape and tablet split-screen as part of release QA.
