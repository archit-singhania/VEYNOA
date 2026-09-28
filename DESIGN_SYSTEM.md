# Veynoa — The Quiet Atelier

An editorial notebook with a botanical identity: thoughtful typography, warm materials, a restrained palette and an orbital companion. The interface gives voice capture a clear invitation while keeping the user's own notes central.

## Palettes

| Palette | Character                  | Light background | Dark background | Light accent |
| ------- | -------------------------- | ---------------- | --------------- | ------------ |
| Grove   | Evergreen, ivory and brass | #F6F5F0          | #14241F         | #365F4E      |
| Dusk    | Terracotta and sandstone   | #F7F2EC          | #291F1C         | #955B42      |
| Tide    | Midnight blue and silver   | #F1F4F6          | #16232E         | #3F6684      |

Each palette supports light, dark and device appearance. Preferences persist alongside existing settings; older preferences fall back to Grove. Semantic color tokens live in `apps/mobile/src/theme/tokens.ts`. Hero backgrounds stay dark in both appearances to anchor the voice invitation.

## Typography and detail

- Editorial serif headlines and note titles; native system sans-serif for controls and body copy. Georgia on iOS/web, platform serif on Android; no remote font request.
- Restrained uppercase section labels, generous line height, clear hierarchy and real note metadata.
- Custom vector monogram, consistent 24-unit outline icons and an orbital SVG companion. No image dependency or decorative bitmap download.
- Cards use 17–24 px radii, fine borders and deliberate negative space. Pinning changes surface tone. Hover, focus and pressed states provide feedback.

## Responsive behavior

- At 1050 px and above: 232 px workspace sidebar with navigation, create action, settings and privacy state.
- Smaller widths: safe-area-aware bottom dock; header actions sit above the full-width headline on phones.
- Two-column notes above 760 px, single column below; user can choose a list view. Collections scroll horizontally without compressing labels.
- Voice hero and contextual daily count adapt to available space. Daily counts come from real notes.
- Editor uses a paper-like surface with date, word count, separate tools and suggestions. iOS keyboard avoidance and keyboard-dismiss-on-scroll are enabled.

## Interaction and accessibility

Primary controls have at least 44 px touch targets. Icon-only buttons have accessible names. Palette and collection choices expose selected state. Text supports native font scaling. Orb motion honors reduced-motion settings; waveform remains tied to actual recording metering. Input focus changes border color. Small semantic accents use stronger contrast than decorative gold.

No fabricated activity, sample notes or fake AI output. Cloud-only actions retain their disabled states and explanations. Theme changes are independent of privacy and inference settings.

## Verification

Desktop and 390 px browser layouts visually reviewed. Verified appearance controls, note collection and persisted existing content. Native device layout, screen-reader navigation and large-font edge cases still require the physical-device checklist. Build/typecheck results are reported in the UI audit.
