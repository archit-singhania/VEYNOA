# Veynoa: complete manual testing guide — baseline + 20 + 10

Updated 2026-09-29. These are acceptance steps and expected results, not a claim that every step has been performed. Physical-device audio, live gateway validation and full backup/import remain deferred as requested. Nothing was deployed.

## Start here

1. Use Node 24. In the repository root, run `npm ci` if dependencies are not installed. On this Windows machine, use `& 'C:\Program Files\nodejs\npm.cmd'` in place of `npm` if PowerShell's npm shim fails.
2. Run `npm run export -w @veynoa/mobile`, then `node scripts/preview.mjs`. Open http://127.0.0.1:8081. The export command prepares the PDF, local inference, and OCR workers automatically; it does not download model weights. Keep the preview terminal running. If port 8081 is already serving this checkout, reuse that server after exporting.
3. Leave local-only mode enabled initially. Most of these features work without an account or gateway.
4. Create two synthetic notes: **QA Launch** with body `Launch planning: research customer interviews and prepare a prototype.` and **QA Research** with body `Customer interviews will guide our launch prototype.` Use these names only once so title-based links are unambiguous.
5. Wait for “Saved on this device” after editing. Reload once and verify both notes remain.
6. The main entry points are **Workspace** on home, **Note tools** inside a note, and **Workspace → Intelligence** for advanced features. Commands also includes Intelligence studio. Exit Focus if editor tools are hidden. The thinking canvas is opened from a note.

Use harmless test content, including for the vault. Do not use Delete all local data as routine cleanup: it erases the vault and workspace data, and existing exports are not full backups.

## Testing order and result log

Run **B1–B8 below → features 1–20 → features 21–30**. Begin with local-only enabled. Test one scenario, leave/reopen its screen, reload, then check persistence before continuing. Use a separate browser profile for destructive reset checks. Record each result as `PASS / FAIL / NOT RUN`, with date, OS/browser or app build, steps and visible error. A build passing is not a manual test passing.

The advanced features are first implementations with boundaries called out below. Local model execution, native audio and live gateway output have not been verified in this environment. Do not mark those passes based on disabled controls or successful bundle export.

## B1. Original notebook, autosave and kinds

1. Create QA Launch and QA Research as above. Edit title/body, wait for Saved on this device, leave and reopen, then reload.
2. Change QA Launch to Idea; use the corresponding kind filter. Pin it and check ordering. Unpin and confirm it remains.
3. Create a Task note, complete/reopen the whole task, and distinguish that status from action items in feature 3.
4. Archive a QA note. Check that it disappears from active search/collections. Restore it from the archive controls.

**Expect:** saved content survives reload; classification and pinning do not duplicate or erase the note. Save errors are visible. A whole-note task, a Markdown checklist and a workspace action are separate records.

## B2. Quick capture, drafts and Focus

1. Open quick capture; try Blank, Idea, Journal and Task. Type a draft and dismiss it without saving.
2. Reload, reopen capture, confirm the draft, then save once.
3. Open the saved note, enable Focus, edit it, leave Focus and verify the tools return.

**Expect:** unfinished draft text survives; saving clears the draft and opens one saved note. Focus changes editor chrome, not note content. Voice handoff on native opens that note's recording screen.

## B3. Trash, Undo and recovery

1. Delete a synthetic note; use Undo immediately and verify the text is restored.
2. Delete again; open Recently deleted in Settings, restore it, then reload.
3. Only on a disposable QA note, delete then permanently remove it. Confirm it cannot be restored.

**Expect:** Trash retains source data until permanent removal; active search/AI omit it. A restored note does not automatically restart canceled AI jobs. Native recording recovery needs the device pass.

## B4. Search, Garden, Timeline and original canvas

1. Search `prototype`, including a word well into a long QA note; open a matching result.
2. Open Memory garden and its topic/kind filters, then a note. Empty groupings are normal before enough content exists.
3. Open Timeline, select the QA notes' date and open a note.
4. Open a note's canvas, add two thoughts, drag them, leave and reopen.

**Expect:** drilldowns open the source notes; canvas text/positions persist. The original canvas remains a finite board. Advanced canvas checks are in feature 28.

## B5. Themes, motion, accessibility and greeting

1. In Settings, try Grove, Dusk and Tide with light, dark and system appearance; reload.
2. Disable Gentle motion, then test OS reduced motion; open/close capture and navigate screens.
3. At phone width, use long titles, large text and keyboard navigation. On native, run VoiceOver/TalkBack checks later.
4. Set greeting to Never, then Daily and Always; check startup speech on a device with speech enabled.

**Expect:** preferences persist; text/buttons remain usable; reduced motion suppresses decorative effects. Speech/audio behavior is a device acceptance check, not validated by web appearance.

## B6. Original native recording and segmented dictation — deferred device pass

1. Open a QA note → Record. Deny microphone permission, check the explanation, then grant permission in OS settings and retry.
2. Record a short clip, pause/resume, save and play it. Seek, leave/reopen and restart the app.
3. Try leaving/backgrounding during recording; follow the visible stop/save/discard controls. Check an incoming-call interruption separately.
4. With the gateway configured later, transcribe the saved clip and try experimental segmented dictation.

**Expect:** retained recordings belong to the note and survive restart. Denial/interruption should not silently pretend a recording succeeded. Transcription is appended once with durable queue state. Segmented dictation may contain gaps; it is not seamless live speech recognition. Also run `docs/DEVICE_CHECKLIST.md`.

## B7. Original cloud analysis, Ask, Bloom, DayStory and queue — deferred gateway pass

1. Configure/test your HTTPS gateway using the setup instructions at the end. Use synthetic notes and explicitly turn local-only off.
2. Edit a note; inspect analysis suggestions. Accept a suggested kind and confirm the original writing is retained.
3. Ask a question over notes; open each cited source. Try an unsupported question: output should not invent source IDs.
4. Generate Bloom branches; review before accepting them. In Timeline generate a DayStory from sufficient content and explicitly save it as a journal note.
5. Temporarily use an unreachable gateway; inspect the pending/failed queue and retry controls. Restore the URL, retry, then turn local-only back on.

**Expect:** cloud actions visibly process or fail; disabled privacy mode blocks cloud inference. Stale analyses are not applied after content changes. DayStory is manually generated, not a nightly automation. Retries occur while the app is active and do not guarantee background processing.

## B8. Export and destructive reset — disposable profile only

1. Export JSON and Markdown; open both and confirm ordinary note text is readable. Check that vault and trashed notes are excluded.
2. Do not treat these as backups: attachments, all workspace/intelligence records and restorable audio are not fully exported/imported.
3. In a disposable profile only, use Delete all local data. Reopen and verify ordinary notes, vault, projects, plans, decisions, cards and goals are gone.

**Expect:** reset removes application records. Downloaded model caches are browser-managed and are not cleared by database reset; Stop/unload removes the active worker, while browser site-data controls remove cached downloads.

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

## 21. Living knowledge graph

1. Give QA Launch and QA Research the `work` tag. Put them in QA Release. Add a wiki/manual link using feature 8.
2. Open Workspace → Intelligence → Graph. Select All projects, then QA Release. Try Created since with a valid date and an invalid date.
3. Select a plotted node or its matching button; open its source note. Use Zoom +/− and horizontal scrolling.
4. Later, obtain cloud analysis for a note containing a named entity. Return to Graph; inspect the dashed entity edges.

**Expect:** recorded tags, projects and links use solid edges; AI-extracted entities use dashed edges and are explicitly marked for verification. Source buttons open actual notes. Clusters are connected components, not a learned community classifier. Up to 50 active notes are graphed; the date filter concerns note creation, not a historical graph reconstruction. Editing analyzed text removes stale entity analysis until regenerated.

## 22. Time-aware memory

1. Edit QA Launch after installing this version; add a distinctive line, wait for save, then change/remove it and save again.
2. Open Intelligence → Memory. Choose today's date and search a literal word in the observed text. Try a date before installing this upgrade.
3. To exercise a different-day comparison, create/edit a QA note on one day and change it the next; choose the first day's cutoff. Compare the added/removed lines with the current note.
4. Later with cloud enabled, enter a historical question and choose Ask cloud AI about first 8 snapshots; inspect its sources.

**Expect:** the latest observed snapshot up to the end of the chosen local date is shown. Later text must not appear as earlier knowledge. Existing notes get their first snapshot at upgrade time; earlier history is unknown. Snapshots currently capture title/body only, and comparisons count distinct changed lines. Cloud historical questions use the first eight available snapshots and whole-note source links; the links open current notes, while the snapshot text stays visible in Memory.

## 23. Visual intelligence dashboard

1. Create several QA notes today and mark one Idea. Add an action to that idea.
2. Open Intelligence → Dashboard. Select today's activity bar/date, the ideas-with-actions metric, each action priority, and a collection tag.
3. Open each drilldown source and compare the figures with your notebook.

**Expect:** the 14-day chart counts note creation dates, priority controls count open actions, and the idea percentage counts idea notes with any action (including completed ones). Drilldowns open the counted notes; multiple actions on a note need not produce multiple note buttons. These are descriptive counts, not predictions or a productivity score. Empty datasets show zero, not fabricated sample data.

## 24. Private on-device models — experimental web acceptance

1. Use the web app with local-only still enabled. Open Intelligence → Local AI. No weights should download merely from opening the tab.
2. Choose Load / download Semantic search & classification. Allow the download to finish; expect a ready indicator or a visible actionable error. Downloads may be large. Repeat separately for Summarization and English speech only when needed.
3. Select QA Launch; choose Suggest category locally. Enter a semantically related query and Search locally.
4. Load Summarization, select a source and Summarize locally. Review/edit the output and save it as a new note. Confirm the source remains and is linked to the summary.
5. Load English speech; choose Transcribe audio file locally with an English clip under three minutes/30 MB. Review and save the output. The uploaded file itself is not retained as a recording by this flow.
6. While the loaded worker remains active, disable network access and repeat an inference. Re-enable the network afterward. Reload offline separately to test cache behavior; successful warm-worker inference alone does not prove cached restart works.
7. Choose Stop / unload models during processing and verify it stops or reports cancellation. On native, check the unsupported-runtime message and disabled model controls.

**Expect:** model files download from model hosts, but selected note/audio content stays in the browser for inference. There is no automatic cloud fallback. Similarity scores are not confidence probabilities; category suggestions do not automatically change note kinds. Summary input is limited to 3,000 characters, semantic search to the first 50 active notes. Small models can give weak or incorrect output. Browser storage eviction may require another download. Actual model execution/performance and offline reload are NOT RUN in this environment.

## 25. Multimodal evidence search

1. Attach a two-page text PDF, a text file, and an image with distinctive English writing to QA Research using feature 11.
2. Open Intelligence → Evidence, select QA Research, and Load source attachments. Index the PDF and text file on web.
3. In Local AI load English image OCR and/or Image/text embeddings. Return to Evidence, reload attachments, and Index file for the image.
4. Search a word on PDF page 2, then a word in the image. With vision loaded, describe an image rather than quoting its text.
5. Inspect each hit's page/region locator, source note and original attachment. Reindex the same file and verify matching locators are replaced rather than simply duplicated.
6. Later, create a native recording with real timestamped segments (feature 13), search a word in a segment, then Play from timestamp and Pause on that device.

**Expect:** PDF hits identify a page; OCR hits identify the full image or line-region coordinates; image-vector hits identify the image. The original attachment opens/downloads for verification. Region coordinates are currently displayed as metadata, not a highlighted crop, and PDF opening does not automatically scroll to the cited page. Text/audio hits use keywords; image hits use CLIP similarity. No synthetic audio timestamps are invented. Scanned PDFs need a separate OCR workflow; native PDF/model inference is not implemented. Audio URIs remain device-local.

## 26. Decision intelligence

1. Open Intelligence → Decisions. Select QA Launch first and QA Research as supporting evidence.
2. Enter a decision question, choice, alternative and assumptions, then Record decision. Reload.
3. Enter an observed outcome, Save outcome, leave/reopen and confirm it persists.
4. Later, enable cloud and Review evidence with cloud AI. Compare its suggestions to the actual sources.

**Expect:** choice, alternatives, assumptions, supporting notes and outcome remain separate. Saving does not rewrite the source note. The optional AI review identifies possible issues; it cannot prove an assumption false or guarantee causality. Review text is transient, while the recorded decision/outcome persists. An unavailable supporting note is labeled unavailable.

## 27. Personalized resurfacing

1. Open Intelligence → Resurface and enter `launch prototype`; select QA Release.
2. Inspect the reason beneath each suggestion. Choose Useful on one note and Less useful on another; reload.
3. Snooze a note for seven days and verify it disappears. Choose Reset feedback and snoozes and confirm it can return.

**Expect:** context words, project, due reminders, note age and feedback adjust the order; matching tags share a bounded feedback preference. Archived notes are excluded. Each result explains ranking signals. This is transparent local adaptive scoring, not a trained personal ML model or a push-notification service.

## 28. Conversational thinking canvas

1. Open QA Launch's canvas. Add three thoughts; choose Select / edit on one, change its text and Save edited thought. Drag, leave and reopen.
2. Select two branches. Choose Propose plan from selected, then open the Goals tab in Intelligence. Verify it is only a proposal and has not created actions.
3. Later with cloud enabled, choose Challenge assumptions or Explore alternatives. Edit the suggested branches; Discard once, then regenerate and Accept branches. Check that only accepted suggestions are saved.
4. For local voice on web, first load English speech in Local AI, return to the canvas, choose Dictate locally and grant microphone permission. Speak an eight-second phrase, wait for transcription, inspect the draft, stop, and explicitly add/save the thought.
5. Leave the canvas or background the app while dictating; verify the microphone stops.

**Expect:** editing/selection and saved positions survive navigation; generated branches require review. Plans carry the originating note as a source. Local dictation uses eight-second recording windows with processing pauses and drops an unfinished window when stopped; it is not continuous real-time streaming or automatic live mind mapping. Native local-model dictation is unavailable. The board is finite; use short sessions and review transcription errors.

## 29. Learning and recall

1. Open Intelligence → Learning, select QA Research and Draft from source. Edit the question/answer to create a useful recall prompt, then Save card.
2. Try answering mentally before Reveal answer. Choose Again, then inspect Scheduled cards.
3. Create another card and choose Good on its first review. Reload and compare due times.
4. Edit the source note, return when a card is due and inspect its changed-source warning. Delete a disposable due card.

**Expect:** Again schedules approximately ten minutes; first Good schedules one day; first Easy schedules four days. Later intervals depend on prior reviews and self-ratings. Review/lapse counts persist. Return to the tab after the due time to refresh the due list. Source edits do not silently rewrite a learned answer; stale cards should be checked and replaced. The ≥21-day metric reports schedule intervals, not verified mastery. This release has manual/drafted flashcards and self-graded recall, not automatic quiz generation or a trained mastery model.

## 30. Goal execution assistant

1. Open Intelligence → Goals; select QA Launch, name a goal, and enter three steps on separate lines. Keep Sequential dependencies on and Save proposal.
2. Inspect Today: no actions should have been created yet. Return and approve step 2, then try Complete step: it should be disabled until step 1 is done.
3. Approve/complete step 1; now complete step 2. Inspect Today and the audit trail.
4. Approve step 3 and Revert approval; its generated unfinished action should disappear and the proposal should return.
5. Approve it again, edit the generated action's text or date in note tools, then try Revert approval. Expect a refusal that preserves your edited action.
6. Create an independent-steps proposal and compare completion behavior. Later test Suggest steps with cloud AI, edit the draft, then explicitly save/approve it.

**Expect:** approval creates one action on the first selected source note. Every proposal/approval/completion/reversal is auditable. Dependencies are sequential or independent in this UI; arbitrary dependency editing is not exposed. Complete dependencies from Goals: changing action completion directly in Today does not synchronize goal-step state. Missing/archived source notes block step changes until restored. No email, calendar, external task service or background agent is executed. Reversal applies only to an unchanged unfinished action.

## Advanced privacy and persistence regression

1. Put a unique phrase only in the private vault; confirm it never appears in Graph, Memory, Dashboard, Resurface, Learning, Goals, local semantic search or Evidence.
2. Trash an ordinary source note and verify its note-bound intelligence results disappear from active views; restore it and verify its cards/decisions/history return. Existing goal audit records remain, with unavailable sources labeled.
3. Permanently delete a disposable source and confirm its snapshots/cards/decisions/indexed evidence cascade away. Goal records are kept as an audit with detached source IDs; full reset removes them too.
4. Reload after recording a decision, rating a recommendation, grading a card and approving a goal step. All persisted state must survive.
5. Run every new tab at phone width and with dark theme/reduced motion. Record clipping, keyboard traps and missing labels as failures; automated visual acceptance was unavailable for this phase.

## If a test fails

1. Stop editing the affected item and record the feature, platform/build, exact steps, expected behavior, actual behavior and any visible error.
2. For save failures, keep the screen open and copy unsaved ordinary text somewhere safe before reloading. Private edits require particular care because leaving the vault deliberately clears them.
3. For cloud failures, check local-only mode, gateway URL/origin and the processing queue. Do not repeatedly send large recordings. The health endpoint checks configuration, not model results.
4. For native sharing/Face ID/notifications, check that you installed a build containing the new plugins; hot reload cannot add native capabilities.
5. Recheck persistence after every successful scenario by leaving/reopening and, where appropriate, reloading. Then test phone width, dark theme, large text, keyboard navigation and reduced motion.

## Suggested order

Run baseline B1–B5 and non-destructive B8 checks, then 1–4, 6–12, 14 without audio, 17–19 web and 20's synthetic vault checks. Next run 21–23, 26–30 locally; run 24–25 and 28's local voice after explicit model downloads. Schedule B6–B7, 5's native notification, 13's audio, 15–16's live AI, 18's native share and 20's biometrics for the deferred device/service phase. Full backup/import remains separate work.

## Preparing the deferred native and gateway passes

When you choose to run them later:

1. Use the existing `preview` EAS build profile in `apps/mobile/eas.json` for an installable custom app. From `apps/mobile`, `npx eas-cli build --platform android --profile preview` produces an APK after you configure the intended Expo project/account. For iOS use `--platform ios --profile preview`; Apple signing and device provisioning are required. These commands run remote builds and have not been executed here.
2. Install the resulting build on your own test device. Keep local-only on for microphone, playback, share-import, reminder and biometric tests. A new binary is needed after native plugin changes.
3. For cloud tests later, review `services/ai-gateway/wrangler.jsonc`, account/model access and limits. It allows both local preview hostnames; add your actual hosted origin if you use another origin. Authenticate the intended Cloudflare account, then run the existing `npm run gateway:deploy` only when you are ready to deploy.
4. Put the resulting HTTPS gateway URL into Settings, Save gateway, Test connection, then disable local-only for synthetic test notes. Run features 13, 15 and 16. Restore local-only when finished if desired.

No physical test, cloud build, signing operation or live deployment was performed as part of this implementation.

Reference constraints: [Expo incoming sharing](https://docs.expo.dev/versions/v55.0.0/sdk/sharing/), [Expo LocalAuthentication](https://docs.expo.dev/versions/v55.0.0/sdk/local-authentication/), [Cloudflare Whisper response](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/).
