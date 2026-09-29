# Twenty-feature expansion audit

Advanced follow-up: [Intelligence audit](INTELLIGENCE_AUDIT.md) and the expanded [baseline + 30 testing guide](FEATURE_TESTING_GUIDE.md) supersede the earlier OCR/canvas/graph limitations where explicitly documented. The verification below describes the previous expansion.

Date: 2026-09-29. Scope: implementations for all twenty proposed feature areas, with explicit first-version boundaries. This is development work, not a production-release certification.

## Implementation summary

| # | Feature | Delivered | Boundary / acceptance still needed |
|---|---|---|---|
| 1 | Unified inbox | Organization state, resumable draft, queue and untranscribed recordings | Native recording inbox acceptance |
| 2 | Tags / collections | Persistent multiple normalized tags and collection filters | Flat tags; no nested folders |
| 3 | Action items | Per-note text, priority, due date, edit/reschedule, complete/reopen | No recurring tasks, delegation or task push reminders |
| 4 | Projects | Create/edit overview, membership, note/action counts, project capture and Ask scope | One project per note; no project deletion UI |
| 5 | Reminders | Future-date validation, persisted time, native local notifications, cancellation and Today resurfacing | Web has in-app reminders only; native delivery untested |
| 6 | Daily plan | Date-specific priorities/reflection, due/overdue actions, explicit save | Save before switching dates |
| 7 | Weekly review | Rolling seven-day counts, completed/open actions and carry-forward draft | Local deterministic review, not an AI narrative |
| 8 | Links / backlinks | Wiki references, explicit links and reverse navigation | Ambiguous titles need IDs; no inline link syntax highlighting |
| 9 | Version history | Throttled automatic snapshots, manual checkpoints, preview and restore | Latest 100 visible; title/body snapshots, not workspace-object history |
| 10 | Formatted editor | Selection toolbar, Markdown storage/reading view, interactive checklists | Supported Markdown subset rather than full WYSIWYG |
| 11 | Attachments | Local image/PDF/text attachment bytes, image preview, open/save and text extraction | PDF extraction on web; no OCR; exports omit attachment bytes |
| 12 | Templates | Create/edit/use and save-note-as-template | Flat template list |
| 13 | Timestamped transcripts | Optional provider segments, atomic persistence, seek/play and manual correction | Native playback/live provider acceptance deferred; no fabricated timing |
| 14 | Meeting workspace | Agenda, decisions, recording entry and linked action items | Single-user; no calendar bot, diarization or external assignment |
| 15 | Rewrite preview | Validated gateway route, mode selection, editable comparison, explicit acceptance and history | Live inference deferred; stale source blocks acceptance |
| 16 | Scoped Ask | Select up to eight notes or project members; bounded excerpts and source navigation | Whole-note links, no exact highlighted passage citation UI; live eval deferred |
| 17 | Connection suggestions | Keyword candidates with explicit persistent acceptance/backlinks | Local keyword matching; no duplicate merging |
| 18 | Incoming sharing | Native plugin configuration, intent route, review before import, local file retention; web paste flow | SDK 55 experimental native integration needs rebuilt binary/device verification |
| 19 | Commands | Search notes/actions, navigate, create task, Ctrl/Cmd+K and capture shortcut | Hardware shortcuts implemented on web; button on all platforms |
| 20 | Private space / app lock | Passphrase-encrypted separate vault, authenticated encryption, session clearing, conflict detection; native biometric/passcode UI gate | No passphrase reset/change, encrypted attachments or vault backup; security/native acceptance required |

## Data and privacy

Migration three preserves existing notes and adds project, metadata, actions, versions, links, templates, plans, attachments, transcript segments and vault tables. New and existing notes enter Inbox. Foreign keys retain note-bound data in Trash and cascade it on permanent deletion. Deleting a note cancels its reminder. Full reset also removes the new tables' contents, and the Settings warning names them.

Vault entries are stored separately as an encrypted JSON payload. Both title and body are encrypted with AES-256-GCM, fresh 96-bit nonces, a random 128-bit salt and PBKDF2-HMAC-SHA256 (600,000 iterations). The password is not stored. Keys are cleared on vault lock/leave/background. The implementation uses the installed Noble libraries; this application-level integration has not received an independent security audit. Ordinary notes, metadata and attachments are not encrypted by app lock. JavaScript cannot promise forensic erasure of every temporary memory copy.

New files are read locally. Shared URLs are stored without automatic fetching. Private entries are excluded structurally from the ordinary notes store, search, AI and export. AI remains optional and respects local-only mode. Current exports still do not provide a complete restorable backup.

## Verification and outstanding evidence

- Mobile and gateway TypeScript checks passed during integration.
- 38 automated tests passed: original tests plus new migration/history/relationship/date/formatting/crypto tests and the rewrite route validation test.
- Expo web, Android and iOS exports passed during integration. These are JS/Hermes bundles, not signed APK/IPA builds or device tests.
- Wrangler dry-run passed for the updated gateway. No deployment occurred and no live inference was requested.
- Browser automation failed to initialize because its local runtime assets were unavailable, including after a reset. Consequently no new browser interaction or visual acceptance is claimed for this expansion. Follow the manual guide.
- Dependency audit reports 13 moderate entries arising from two underlying transitive advisories: `decode-uri-component` malformed URI decoding and older `uuid` buffer handling through Expo tooling. No high/critical entry was reported. The suggested force fixes downgrade Expo packages across major versions, so they were not applied. Review compatible upstream fixes before release. The raw report is local under ignored `artifacts/dependency-audit.json`.

## Diff hygiene

The workspace npm cache appeared while installing dependencies with an explicit local cache because access to the normal cache was restricted. `.npm-cache/`, `.cache/`, `*.log`, `*.log.*` and temporary files are now ignored. No npm-cache or log files were tracked when checked. The generated PDF worker is also ignored and reproducibly copied from `pdfjs-dist` by `scripts/prepare-web.mjs` before npm start/web/export.

`package.json`, `package-lock.json`, application source, native plugin configuration and the preparation script are intentional source changes. They must remain reviewable and versioned. Existing user-staged changes were preserved; this work did not commit, push or deploy.

## Next steps

1. Run the [manual guide](FEATURE_TESTING_GUIDE.md), starting with local web functionality and reload persistence.
2. Later, complete physical-device audio, keyboard, notification, share extension and biometric tests in a native build.
3. Later, configure the gateway and validate synthetic transcription, rewrite and scoped Ask, including failure/privacy behavior.
4. Implement full backup/import, including clear decisions about vault backup/recovery; complete security/accessibility/performance and release review.

References used for integration: [Expo sharing](https://docs.expo.dev/versions/v55.0.0/sdk/sharing/), [LocalAuthentication](https://docs.expo.dev/versions/v55.0.0/sdk/local-authentication/), [DocumentPicker](https://docs.expo.dev/versions/v55.0.0/sdk/document-picker/), [Notifications](https://docs.expo.dev/versions/v55.0.0/sdk/notifications/), [Noble ciphers](https://github.com/paulmillr/noble-ciphers), [Whisper response](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/).
