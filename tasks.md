# Implementation Plan (Tasks)

This checklist decomposes the application into sequential tasks. Each task has an explicit verification step to confirm correctness before moving on.

## 1) Project Setup and Baseline

1.1. [x] Create minimal project structure (`index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.json`) with vanilla JS and no external dependencies.
1.2. [x] Define asset loading order and ensure app starts without errors in the console.
1.3. [x] Test: Open the app in a browser, verify a blank page loads with no console errors.

## 2) Data Model and Storage

2.1. [x] Implement the Flashcard schema with translations (EN/UA/RU, optional) and Settings schema (per `design.md`).
2.2. [x] Implement localStorage adapter updates for translations object.
2.3. [x] Add schema version handling for backup JSON.
2.4. [x] Add migration from legacy single-translation cards to translations object.
2.5. [x] Test: Persist a card with translations (including empty), reload, and verify translations are restored (including migration).

## 3) State Management and Selectors

3.1. [x] Implement a simple store with state, actions, and selectors (no external libs).
3.2. [x] Add selectors for current card, filtered cards, and available tags.
3.3. [x] Implement `persistWarning` handling in state.
3.4. [x] Test: Dispatch actions in the console and confirm state transitions and selectors are correct.

## 4) Base UI Shell

4.1. [x] Build the main layout with a persistent Add Card button and placeholders for Study, Card Form, Settings, Import/Export.
4.2. [x] Implement empty state (no cards) per requirements.
4.3. [x] Test: With empty storage, verify only create/import/settings actions are available.
4.4. [x] Implement responsive layout for desktop (landscape) and mobile (portrait).
4.5. [x] Test: Verify layout adapts at <= 720px width and avoids horizontal scroll.
4.6. [x] Hide Cards section by default; add "All cards" button in Settings and a close button in Cards.
4.7. [x] Test: Cards panel toggles open/close correctly.

## 5) Card CRUD (Create/Edit)

5.1. [x] Implement CardForm for create and edit with EN/UA/RU translations; validate required fields (word only).
5.2. [x] Wire CardForm to store and persistence; preserve stats on edit.
5.3. [x] Add UI for editing an existing card (entry point from study view or list).
5.4. [x] Test: Create a card with translations (including empty), edit it, reload, and confirm stats remain unchanged.
5.5. [x] Sort cards list alphabetically by foreign word.
5.6. [x] Test: Cards list is sorted case-insensitively.

## 6) Tagging and Filtering

6.1. [x] Implement tag entry in CardForm; normalize tags (trim, lowercase for matching).
6.2. [x] Build TagFilterBar and integrate with selectors.
6.3. [x] Apply filter rule: match ANY selected tag (case-insensitive).
6.4. [x] Test: Create multiple cards with tags and confirm filtering matches any selected tag.

## 7) Study Flow and Card Interaction

7.1. [x] Implement StudyView with card front/back states, flip animation, and translation display based on UI language.
7.2. [x] Add buttons for "know" and "don't know".
7.3. [x] Implement swipe gestures (left = don't know, right = know).
7.4. [x] Update stats on actions and persist.
7.5. [x] Test: Use buttons and swipes, confirm stats increment and next card loads.
7.6. [x] Store `RecentKnows`/`RecentDontKnows` per card (sum <= 20) and use it for progress bar.
7.7. [x] Test: Progress bar reflects recent counters and hides when both are zero.

## 8) Adaptive Scheduling

8.1. [x] Implement weight calculation and weighted selection per design.
8.2. [x] Add optional "prioritize unseen" setting.
8.3. [x] Ensure selection operates on filtered set only.
8.4. [x] Test: Create cards with different stats and verify high "don't know" cards appear more often.

## 9) TTS (Offline Local Voices Only)

9.1. [x] Implement TTS engine using Web Speech API local voices only.
9.2. [x] Add per-card language selection and map to TTS codes.
9.3. [x] Add TTS toggle; persist setting.
9.4. [x] Handle missing voices gracefully.
9.5. [x] Test: Toggle TTS on/off and verify speech uses local voices or is disabled with a notice.

## 10) i18n (EN/UA/RU)

10.1. [x] Build dictionary tables and translation function.
10.2. [x] Wire UI to update labels and translation display when UI language changes.
10.3. [x] Persist `uiLanguage` in settings.
10.4. [x] Test: Switch UI language and verify all visible strings update.
10.5. [x] Add light/dark theme toggle in Settings and persist `theme`.
10.6. [x] Test: Theme toggle switches and persists across reloads.

## 11) Backup and Restore

11.1. [x] Implement JSON backup export with schema version (including translations object and settings).
11.2. [x] Implement restore flow with validation and merge/overwrite selection.
11.3. [x] Implement duplicate detection by normalized word+translations(EN/UA/RU)+language.
11.4. [x] Merge behavior: keep existing stats, optionally union tags.
11.5. [x] Test: Export, clear storage, restore, and verify full data integrity; test merge vs overwrite and settings restore.

## 12) CSV Import

12.1. [x] Implement CSV parser (comma-delimited, four fields per row, no headers) for word + translations EN/UA/RU (translations may be empty).
12.2. [x] Validate required fields; collect errors with line numbers.
12.3. [x] Allow partial import or cancel when errors are present.
12.4. [x] Test: Import valid CSV and a CSV with errors; confirm proper messaging and translations parsing (including empty fields).

## 13) PWA and Offline

13.1. [x] Create `manifest.json` with required fields and icons.
13.2. [x] Implement service worker with cache-first strategy for app assets.
13.3. [x] Ensure no network requests beyond asset caching.
13.4. [x] Test: Install as PWA, go offline, and verify the app works with stored data.

## 14) Error Handling and Resilience

14.1. [x] Implement `persistWarning` UI when storage writes fail (best-effort save).
14.2. [x] Add user-friendly error messages for backup/CSV/restore failures.
14.3. [x] Test: Simulate storage quota error and verify warning and export suggestion.

## 15) Final QA and Documentation

15.1. [x] Run through full study workflow, editing, filtering, import/export, and TTS.
15.2. [x] Confirm all requirements are met and no regressions exist.
15.3. [x] Update README with run/usage instructions and offline constraints.
15.4. [x] Test: Fresh browser profile install and full flow validation.
