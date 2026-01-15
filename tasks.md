# Implementation Plan (Tasks)

This checklist decomposes the application into sequential tasks. Each task has an explicit verification step to confirm correctness before moving on.

## 1) Project Setup and Baseline

1.1. [ ] Create minimal project structure (`index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.json`) with vanilla JS and no external dependencies.
1.2. [ ] Define asset loading order and ensure app starts without errors in the console.
1.3. [ ] Test: Open the app in a browser, verify a blank page loads with no console errors.

## 2) Data Model and Storage

2.1. [ ] Implement the Flashcard schema and Settings schema (per `design.md`).
2.2. [ ] Implement localStorage adapter: load/save flashcards and settings.
2.3. [ ] Add schema version handling for backup JSON.
2.4. [ ] Test: Create a sample card in memory, persist it, reload the page, and verify it is restored.

## 3) State Management and Selectors

3.1. [ ] Implement a simple store with state, actions, and selectors (no external libs).
3.2. [ ] Add selectors for current card, filtered cards, and available tags.
3.3. [ ] Implement `persistWarning` handling in state.
3.4. [ ] Test: Dispatch actions in the console and confirm state transitions and selectors are correct.

## 4) Base UI Shell

4.1. [ ] Build the main layout with a persistent Add Card button and placeholders for Study, Card Form, Settings, Import/Export.
4.2. [ ] Implement empty state (no cards) per requirements.
4.3. [ ] Test: With empty storage, verify only create/import/settings actions are available.

## 5) Card CRUD (Create/Edit)

5.1. [ ] Implement CardForm for create and edit; validate required fields.
5.2. [ ] Wire CardForm to store and persistence; preserve stats on edit.
5.3. [ ] Add UI for editing an existing card (entry point from study view or list).
5.4. [ ] Test: Create a card, edit it, reload, and confirm stats remain unchanged.

## 6) Tagging and Filtering

6.1. [ ] Implement tag entry in CardForm; normalize tags (trim, lowercase for matching).
6.2. [ ] Build TagFilterBar and integrate with selectors.
6.3. [ ] Apply filter rule: match ANY selected tag (case-insensitive).
6.4. [ ] Test: Create multiple cards with tags and confirm filtering matches any selected tag.

## 7) Study Flow and Card Interaction

7.1. [ ] Implement StudyView with card front/back states and flip animation.
7.2. [ ] Add buttons for "know" and "don't know".
7.3. [ ] Implement swipe gestures (left = don't know, right = know).
7.4. [ ] Update stats on actions and persist.
7.5. [ ] Test: Use buttons and swipes, confirm stats increment and next card loads.

## 8) Adaptive Scheduling

8.1. [ ] Implement weight calculation and weighted selection per design.
8.2. [ ] Add optional "prioritize unseen" setting.
8.3. [ ] Ensure selection operates on filtered set only.
8.4. [ ] Test: Create cards with different stats and verify high "don't know" cards appear more often.

## 9) TTS (Offline Local Voices Only)

9.1. [ ] Implement TTS engine using Web Speech API local voices only.
9.2. [ ] Add per-card language selection and map to TTS codes.
9.3. [ ] Add TTS toggle; persist setting.
9.4. [ ] Handle missing voices gracefully.
9.5. [ ] Test: Toggle TTS on/off and verify speech uses local voices or is disabled with a notice.

## 10) i18n (EN/UA/RU)

10.1. [ ] Build dictionary tables and translation function.
10.2. [ ] Wire UI to update labels when UI language changes.
10.3. [ ] Persist `uiLanguage` in settings.
10.4. [ ] Test: Switch UI language and verify all visible strings update.

## 11) Backup and Restore

11.1. [ ] Implement JSON backup export with schema version.
11.2. [ ] Implement restore flow with validation and merge/overwrite selection.
11.3. [ ] Implement duplicate detection by normalized word+translation+language.
11.4. [ ] Merge behavior: keep existing stats, optionally union tags.
11.5. [ ] Test: Export, clear storage, restore, and verify full data integrity; test merge vs overwrite.

## 12) CSV Import

12.1. [ ] Implement CSV parser (comma-delimited, two fields per row, no headers).
12.2. [ ] Validate required fields; collect errors with line numbers.
12.3. [ ] Allow partial import or cancel when errors are present.
12.4. [ ] Test: Import valid CSV and a CSV with errors; confirm proper messaging and imports.

## 13) PWA and Offline

13.1. [ ] Create `manifest.json` with required fields and icons.
13.2. [ ] Implement service worker with cache-first strategy for app assets.
13.3. [ ] Ensure no network requests beyond asset caching.
13.4. [ ] Test: Install as PWA, go offline, and verify the app works with stored data.

## 14) Error Handling and Resilience

14.1. [ ] Implement `persistWarning` UI when storage writes fail (best-effort save).
14.2. [ ] Add user-friendly error messages for backup/CSV/restore failures.
14.3. [ ] Test: Simulate storage quota error and verify warning and export suggestion.

## 15) Final QA and Documentation

15.1. [ ] Run through full study workflow, editing, filtering, import/export, and TTS.
15.2. [ ] Confirm all requirements are met and no regressions exist.
15.3. [ ] Update README with run/usage instructions and offline constraints.
15.4. [ ] Test: Fresh browser profile install and full flow validation.
