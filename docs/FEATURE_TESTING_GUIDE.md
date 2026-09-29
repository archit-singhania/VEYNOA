# Veynoa: 20-feature manual testing guide

Updated 2026-09-29. These are acceptance steps and expected results, not a claim that every step has been performed. Physical-device audio, live gateway validation and full backup/import remain deferred as requested. Nothing was deployed.

## Start here

1. Use Node 24. In the repository root, run `npm ci` if dependencies are not installed. On this Windows machine, use `& 'C:\Program Files\nodejs\npm.cmd'` in place of `npm` if PowerShell's npm shim fails.
2. Run `npm run export -w @veynoa/mobile`, then `node scripts/preview.mjs`. Open http://127.0.0.1:8081. The export command prepares the local PDF worker automatically. Keep the preview terminal running.
3. Leave local-only mode enabled initially. Most of these features work without an account or gateway.
4. Create two synthetic notes: **QA Launch** with body `Launch planning: research customer interviews and prepare a prototype.` and **QA Research** with body `Customer interviews will guide our launch prototype.` Use these names only once so title-based links are unambiguous.
5. Wait for “Saved on this device” after editing. Reload once and verify both notes remain.
6. The two main entry points are **Workspace** on the home screen and **Note tools** inside any note. Exit Focus first if you cannot see the editor tools. Web shortcuts also open Commands.

Use harmless test content, including for the vault. Do not use Delete all local data as routine cleanup: it erases the vault and workspace data, and existing exports are not full backups.

## 1. Unified inbox

1. Open Workspace → Inbox.
2. Find the two new QA notes under Ready to organize.
3. Open QA Launch → Note tools → Organize → Mark organized.
4. Return to Inbox, then check My thoughts.
5. Start a quick capture, type a draft, close it without saving, and return to Inbox. Choose Resume capture.

**Expect:** the organized note leaves Inbox but stays in My thoughts. The unfinished draft is resumable. Inbox also lists pending/failed AI jobs and native recordings awaiting transcription; empty lists are normal without recordings or cloud work. New recordings are reached through their parent notes. Return to inbox reverses organization.

## 2. Multiple tags and collections

1. Open QA Launch → Note tools → Organize.
2. Enter `Work, Ideas, work` in Note tags and choose Save tags.
3. Open Workspace → Collections; select `#work`, then `#ideas`.
4. Reload and repeat.

**Expect:** the same note appears under both tags. Tags are trimmed, lowercased and deduplicated. Changing its note kind does not remove tags. These collections are tag filters, not duplicated notes or nested folders.

## 3. Action items inside notes

1. Open QA Launch → Note tools → Actions.
2. Enter `Prepare interview questions`, a valid due date in `YYYY-MM-DD`, and High priority. Add action.
3. Choose Complete, then Reopen on that action.
4. Leave it open with today's date and inspect Workspace → Today.

**Expect:** the action retains its note, date and priority after reload. Completion changes its state and contributes to Weekly counts. Use Edit action to change its text/date/priority and Save action to retain the changes. Invalid dates are rejected. Action items are distinct from Markdown checklists and whole-note task completion.

## 4. Project spaces

1. Open Workspace → Projects. Create **QA Release** with a short description.
2. Select the project and choose Add project thought.
3. Open QA Research → Note tools → Organize and select QA Release.
4. Return to Projects → QA Release.

**Expect:** an overview shows the project description, member notes and open action count. Notes and their recordings/decisions remain accessible from the overview. A note has one project and multiple tags. Choose None in Organize to remove project membership without deleting the note. Use Edit project details, change the form above and Save project; existing members should stay assigned. Project deletion is not exposed in this version.

## 5. Reminders and resurfacing

1. Open QA Launch → Note tools → Reminder.
2. Enter a time a few minutes ahead in local `YYYY-MM-DD HH:mm` format. Choose Schedule reminder.
3. Leave Workspace → Today open until the time passes; it refreshes the clock every 30 seconds.
4. Open the resurfaced note and choose Clear reminder. Try an invalid or past date and verify it is rejected.

**Expect on web:** the note appears under Reminders ready to revisit. There is no web push notification while the app is closed. Rediscover a thought independently shows up to three least recently edited active notes.

**Later on native:** grant notification permission when explicitly scheduling. A discreet notification says a thought is ready; tapping it opens the note. Permission denial leaves an existing reminder unchanged. Moving a note to Trash cancels its reminder; restoring does not reschedule it. OS delivery timing still needs device verification.

## 6. Daily planning page

1. Open Workspace → Today.
2. Write three priorities and a reflection. Choose Save daily plan.
3. Reload and return to Today.
4. Enter another valid date, choose Load date, write a different plan and save. Load the original date again.

**Expect:** each date has independent saved priorities and reflection. Due/overdue actions are shown relative to the loaded date. Save before changing dates: these fields use explicit saving, unlike ordinary notes. Reminders are evaluated against the current time.

## 7. Weekly reflection

1. Create a test note and complete an action during testing.
2. Open Workspace → Weekly.
3. Inspect captured notes, completed actions and open items.
4. Choose Use top three as today’s draft. Review the priorities on Today and choose Save daily plan if you want to retain them.

**Expect:** a rolling seven-day review using actual note creation and action completion timestamps. Carry forward uses the first three open actions in the workspace order. It fills a draft; it does not silently save over your plan. This is a deterministic review, not an AI-written weekly narrative. Archived/deleted notes and their actions are excluded.

## 8. Note links and backlinks

1. Add `See [[QA Research]]` to QA Launch and wait for saving.
2. Open Note tools → Links. Open the linked QA Research note.
3. In QA Research's Links panel, inspect Backlinks.
4. Alternatively use Find a thought to link and choose Link on a result.

**Expect:** the outgoing link and reciprocal backlink navigate to the correct notes. Exact IDs also work inside `[[...]]`. Duplicate titles are intentionally not guessed; use the ID or the link picker. Unlink saved connection removes a saved link; a textual wiki link remains until you remove it from the body. Trashed targets are excluded.

## 9. Version history

1. Open QA Launch → Note tools → History → Save checkpoint.
2. Change its title/body and wait for saving.
3. Return to History, select the checkpoint, and inspect the displayed contents.
4. Choose Restore this version. Reload.

**Expect:** the title/body restore, and the pre-restore contents receive a checkpoint too. Automatic snapshots preserve the first content edit in each minute; they are not every-keystroke undo. The UI lists the latest 100 snapshots. Versions are retained in Trash and cascade away only on permanent deletion. Tags/actions are separate from text versions.

## 10. Formatted writing

1. Open a note. Select a word and choose Bold or Highlight.
2. On separate lines, insert Heading, Quote, Checklist and Code using the toolbar, then add text.
3. Choose Reading view.
4. Tap a checklist item, then return to Edit text and reload.

**Expect:** heading hierarchy, emphasis, highlights, quotes, monospaced blocks and interactive checkboxes. Formatting is stored as readable Markdown; the editor shows its markers, and Reading view renders the supported subset. Checklist state survives reload. This is not a full WYSIWYG editor or arbitrary HTML renderer. For headings/quotes/checklists, put the cursor at the start of a line.

## 11. Attachments and document reading

1. Open Note tools → Attachments. Attach a small PNG/JPEG/WebP image and a text-based PDF or `.txt` file.
2. Reload: the files should remain with the note. Images have inline previews.
3. Choose Open / save file. On web this downloads the local file; on native it opens the system sharing interface.
4. On web choose Extract text for the PDF. Review the preview, then Append extracted text to note.
5. Search for a distinctive word after appending it.

**Expect:** local attachment persistence, a 10 MB per-file limit, and searchable text after explicit appending. PDF extraction processes up to 100 pages / 100,000 characters and does not upload the PDF. Native extraction supports text/Markdown files; use web for PDF extraction. Scanned PDFs and images need OCR, which is not implemented. Attachments are not included in current exports. If PDF extraction fails on web, rerun the export command and ensure `/pdf.worker.min.mjs` is served as JavaScript.

## 12. Custom templates

1. Open Workspace → Templates; create **QA Meeting** with headings for Agenda, Decisions and Next steps.
2. Choose Use template, change the new note, and return to Templates.
3. Use the same template again; inspect the starting contents.
4. Choose Edit template, change its structure, Save template and use it once more.

**Expect:** each use creates an independent note; editing a note does not change its template. Template edits affect future notes. Note tools → Organize → Save as template also captures an existing note's body and kind. A starter Meeting template is supplied on first migration.

## 13. Timestamped transcripts — native acceptance later

1. Record a short synthetic clip with two distinct sentences. Save it.
2. When a gateway is configured, transcribe it. Open the note's recording panel.
3. Tap a returned segment to jump to its start; use Pause to stop playback.
4. Choose Correct segment, edit its text/times and Save timestamped segment. Reload.
5. If the provider returns no segments, manually add one with start `0`, an end within the recording duration, and your sentence.

**Expect:** valid provider segments are saved atomically with transcription. Tapping seeks the associated recording. Manual corrections persist; reversed times and times beyond the recording are rejected. Corrections do not silently rewrite text already appended to the note. Playback continues past the segment end until paused; sentence precision depends on provider timing. Web audio capture remains unsupported. No speaker diarization is claimed.

## 14. Meeting workspace

1. Create a meeting note from a template or open a blank note.
2. Open Note tools → Meeting. Add an agenda item and a decision.
3. Choose Meeting action items and create an assigned-to-yourself next step with a date.
4. Later on native, choose Record meeting, save a short recording, and return.

**Expect:** agenda/decision sections append to the source note, actions belong to that same note, and recordings/transcripts remain below it. This is a single-user meeting workspace; calendar joining, speaker identification and sending tasks to other people are not included.

## 15. AI rewrite with preview — live gateway later

1. First inspect Note tools → Rewrite while local-only is on. Generation should be disabled with an explanation.
2. When ready for live AI testing, configure an HTTPS gateway in Settings, test its connection, and turn local-only off using synthetic content.
3. Choose Clarify, Summarize, Professional or Friendly and Generate rewrite preview.
4. Compare original and suggestion; edit the suggestion if desired. Discard it, then generate again and Accept rewrite.
5. Check History. Also try editing the original after generation, before accepting.

**Expect:** no replacement before acceptance; acceptance preserves an original checkpoint. A changed original blocks stale acceptance. Invalid/failed cloud responses leave the note intact. Inputs over 16,000 characters need shortening. A successful health check alone is not proof that inference works.

## 16. Ask across selected material — live gateway later

1. Open Workspace → Ask. Select QA Launch and QA Research (maximum eight notes).
2. Ask a question answered by those notes. Inspect the response and source buttons.
3. Click a source to open the supporting note.
4. Open a project and choose Ask this project; review the preselected notes before sending.

**Expect:** only excerpts from selected active notes are sent. Project preselection is capped at eight. Source IDs outside the selected set are rejected by the gateway. Vault entries never appear as sources. Ask an unsupported question too: the model should say the sources are insufficient, but model factual accuracy still needs live evaluation. The UI links source notes; exact highlighted sentence citations are not yet provided.

## 17. Suggested connections

1. Open QA Launch → Note tools → Links.
2. Inspect Suggested connections · shared words. QA Research should be a candidate because of overlapping vocabulary.
3. Choose Accept connection, reload, and inspect both notes' Links panels.

**Expect:** acceptance creates a persistent connection and backlink. Unaccepted suggestions do not modify the notebook. Accepted candidates disappear from the suggestions list. This version uses transparent keyword overlap locally, not a claim of AI understanding or duplicate-note merging.

## 18. Share-to-Veynoa

1. On web, open Workspace → Import shared content, paste a link/text and Save to inbox.
2. Inspect the new note and Inbox. The link should be preserved as text.
3. Later, install a native development build containing the sharing plugin. In another app, choose Share → Veynoa for text, a link, an image or PDF.
4. Review the imported content in Veynoa, then Save to inbox.

**Expect:** nothing is saved until you confirm the import. Native supported files are copied into local attachment storage; unsupported file types show an error. URLs are not fetched automatically. The system share target needs a rebuilt native app and uses Expo's experimental SDK 55 incoming-sharing support; it is not validated in Expo Go. Returning from another app can also show Review shared content.

## 19. Command palette and shortcuts

1. On home, choose Commands. Type part of a note title and open a result.
2. On web press Ctrl+K (Windows/Linux) or Cmd+K (Mac) anywhere in the ordinary workspace.
3. Search for Projects, Today, New task or Settings. Use Tab/Enter to select a result.
4. Press Escape while the search field is focused. Try Ctrl/Cmd+Shift+N to open quick capture.

**Expect:** fast navigation, note finding, new-task creation and capture without losing saved notes. The palette excludes archived and private vault notes. The button works on all platforms; hardware keyboard shortcuts are currently implemented for web.

## 20. App lock and encrypted private space

1. Open Workspace → Private vault. With harmless test data, choose and confirm a passphrase of at least 12 characters. Store the passphrase safely; there is no recovery or reset.
2. Create a private note, Save encrypted note, Lock vault, then unlock with the same passphrase.
3. Lock again and try an incorrect passphrase. Nothing should change. Return to Workspace and search for the private title/body: it must not appear.
4. Unlock, edit a private note without saving, then leave the vault. Return and unlock: unsaved edits should be gone, while the last saved version remains.
5. Later on native, enroll biometrics and choose Enable device app lock. Authenticate, background the app, return, cancel the prompt, then authenticate successfully. The interface should remain hidden until success.

**Expect:** private titles/bodies are encrypted together using AES-256-GCM and a PBKDF2-derived key; passphrases are not persisted. Private entries are separate from ordinary notes, AI, search and exports. The key is cleared on leaving/backgrounding the vault; a stale second session cannot silently overwrite a newer encrypted payload. Device app lock gates the interface and permits OS passcode fallback; it does not encrypt ordinary notes. Biometric app lock is native-only. Face ID requires an appropriate development build. Private attachments, passphrase changes, recovery and vault backups are not implemented. Complete security/device review before trusting this new feature with important secrets.

## If a test fails

1. Stop editing the affected item and record the feature, platform/build, exact steps, expected behavior, actual behavior and any visible error.
2. For save failures, keep the screen open and copy unsaved ordinary text somewhere safe before reloading. Private edits require particular care because leaving the vault deliberately clears them.
3. For cloud failures, check local-only mode, gateway URL/origin and the processing queue. Do not repeatedly send large recordings. The health endpoint checks configuration, not model results.
4. For native sharing/Face ID/notifications, check that you installed a build containing the new plugins; hot reload cannot add native capabilities.
5. Recheck persistence after every successful scenario by leaving/reopening and, where appropriate, reloading. Then test phone width, dark theme, large text, keyboard navigation and reduced motion.

## Suggested order

Run 1–4, 6–12, 14 without audio, 17–19 web and 20's synthetic vault checks first. Schedule 5's native notification, 13's audio, 15–16's live AI, 18's native share and 20's biometrics for the deferred device/service phase. Full backup/import remains separate work.

## Preparing the deferred native and gateway passes

When you choose to run them later:

1. Use the existing `preview` EAS build profile in `apps/mobile/eas.json` for an installable custom app. From `apps/mobile`, `npx eas-cli build --platform android --profile preview` produces an APK after you configure the intended Expo project/account. For iOS use `--platform ios --profile preview`; Apple signing and device provisioning are required. These commands run remote builds and have not been executed here.
2. Install the resulting build on your own test device. Keep local-only on for microphone, playback, share-import, reminder and biometric tests. A new binary is needed after native plugin changes.
3. For cloud tests later, review `services/ai-gateway/wrangler.jsonc`, account/model access and limits. It allows both local preview hostnames; add your actual hosted origin if you use another origin. Authenticate the intended Cloudflare account, then run the existing `npm run gateway:deploy` only when you are ready to deploy.
4. Put the resulting HTTPS gateway URL into Settings, Save gateway, Test connection, then disable local-only for synthetic test notes. Run features 13, 15 and 16. Restore local-only when finished if desired.

No physical test, cloud build, signing operation or live deployment was performed as part of this implementation.

Reference constraints: [Expo incoming sharing](https://docs.expo.dev/versions/v55.0.0/sdk/sharing/), [Expo LocalAuthentication](https://docs.expo.dev/versions/v55.0.0/sdk/local-authentication/), [Cloudflare Whisper response](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/).
