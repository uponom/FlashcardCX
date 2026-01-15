# Architecture Design Document

## Overview

This document describes the architecture of the Flashcard Learning PWA based on the agreed requirements. The app is fully offline, uses browser-native APIs only, and stores all data in localStorage.

## Goals

- Provide a fast, offline-first flashcard study experience with adaptive repetition.
- Allow users to create, edit, import, backup, and restore flashcards.
- Support tags for filtering, multilingual UI (EN/UA/RU), and TTS for major languages.
- Keep the codebase small, dependency-free, and easy to maintain.

## Non-goals

- Cloud sync, accounts, or any external services.
- Spaced repetition algorithms beyond the required adaptive weighting.
- Third-party UI frameworks or libraries.

## High-level Architecture

The app follows a modular, single-page architecture:

- UI Layer: renders screens and handles user interactions.
- State Layer: holds application state and derived views.
- Domain Layer: flashcard model, scheduling algorithm, validation.
- Persistence Layer: localStorage access and versioned backup handling.
- System Layer: PWA assets, service worker, i18n, and TTS.

Data flow is unidirectional: UI events -> state updates -> persistence -> UI re-render.

## Modules and Responsibilities

### 1) UI Module

- Screens:
  - Study screen (flashcard view, TTS toggle, know/don't know actions).
  - Card editor (create/edit with EN/UA/RU translations).
  - Import/Backup/Restore.
  - Settings (language, TTS, optional "prioritize never shown").
- Always-visible quick action: Add Card button.
- Empty state: show blank card with only create/import/settings actions.
- Input validation: required word field; translations (EN/UA/RU) are optional.
- Responsive layout: single-column on mobile, multi-column on desktop; spacing and button sizing adapt to screen size.
- Cards section: hidden by default; opened via "All cards" button in Settings; includes close button; list sorted by word.
- Theme toggle: light/dark switch stored in settings and applied via CSS variables.

### 2) State Module

- Single source of truth for:
  - flashcards array
  - filters (selected tags)
  - settings (uiLanguage, ttsEnabled, prioritizeUnseen)
  - currentCardId
- Provides selectors for:
  - filtered cards
  - tag list
  - next card candidate list with weights

### 3) Domain Module

- Flashcard model (schema and normalization):
  - Normalizes tags, word, and translations for comparisons.
  - Stores two rolling counters (`RecentKnows`, `RecentDontKnows`) capped at 20 total.
- Adaptive scheduler:
  - Computes weights based on know/don't know counters.
  - Samples next card proportionally to weights.
- Merge logic:
  - Identifies duplicates using normalized word+translations(EN/UA/RU)+language.

### 4) Persistence Module

- localStorage keys:
  - `flashcards`
  - `settings`
- Storage operations:
  - load all
  - save all
  - transactional updates via in-memory state and full overwrite

### 5) Import/Export Module

- Backup:
  - Export JSON with schema version and full flashcards list.
  - Validate schema version on import.
- Restore:
  - Merge or overwrite strategy.
  - Merge uses duplicate detection rules.
- CSV:
  - Comma-delimited, no headers, four fields per row (word + translations EN/UA/RU).
  - Validates non-empty required fields.

### 6) i18n Module

- Dictionary-based strings (EN default, UA, RU).
- Language stored in settings; UI re-renders on change.

### 7) TTS Module

- Uses Web Speech API local voices only (offline, OS-provided).
- Language codes mapped from flashcard language selection.
- Respects TTS toggle setting.
- Falls back gracefully when voices are missing.

### 8) PWA Module

- Manifest and service worker.
- Cache-first for static assets.
- No network calls beyond asset caching.

## Components and Interfaces

This section defines concrete components per layer and their main interfaces (functions, events, or data contracts).

### UI Layer

Components:

- `StudyView` (card front/back, swipe area, action buttons, TTS toggle)
- `CardForm` (create/edit with EN/UA/RU translations)
- `ImportExportView` (CSV import, backup export, restore dialog)
- `SettingsView` (uiLanguage, ttsEnabled, prioritizeUnseen)
- `TagFilterBar` (multi-select tag list)

Interfaces:

- Emits UI events: `createCard`, `updateCard`, `deleteCard` (optional), `importCsv`, `exportBackup`, `restoreBackup`, `toggleTts`, `changeUiLanguage`, `togglePrioritizeUnseen`, `selectTags`, `markKnow`, `markDontKnow`.
- Consumes state selectors: `currentCard`, `filteredCards`, `availableTags`, `settings`, `emptyState`.

### State Layer

Components:

- `Store` (in-memory state + reducer)
- `Selectors` (derived data)

Interfaces:

- `dispatch(action)` with typed actions for CRUD, import/restore, settings, and study results.
- `getState()` returns current state.
- Selectors: `getFilteredCards()`, `getAvailableTags()`, `getNextCardCandidates()`, `getCurrentCard()`.

### Domain Layer

Components:

- `CardNormalizer`
- `Scheduler`
- `DuplicateDetector`
- `Validator`

Interfaces:

- `normalizeCard(card)` returns normalized shape for comparison.
- `validateCardInput(word, translations)` returns validation errors (word required, translations optional).
- `computeWeights(cards)` returns weights array.
- `selectNextCard(cards, weights, rng)` returns card id.
- `findDuplicates(existing, incoming)` returns duplicate map.

### Persistence Layer

Components:

- `StorageAdapter` (localStorage only)

Interfaces:

- `loadFlashcards()` -> `Flashcard[]`
- `saveFlashcards(flashcards)`
- `loadSettings()` -> `Settings`
- `saveSettings(settings)`

### Import/Export Layer

Components:

- `BackupSerializer`
- `CsvParser`

Interfaces:

- `exportBackup(flashcards)` -> `Blob`/string
- `parseBackup(json)` -> `{schemaVersion, flashcards}`
- `parseCsv(text)` -> `{validCards, errors}`

### i18n Layer

Components:

- `Dictionary`
- `Translator`

Interfaces:

- `t(key, params?)` returns localized string.
- `setUiLanguage(code)` updates current language.

### TTS Layer

Components:

- `TtsEngine`

Interfaces:

- `speak(text, languageCode)`
- `stop()`
- `isAvailable()` -> boolean

### PWA Layer

Components:

- `ServiceWorkerManager`

Interfaces:

- `registerServiceWorker()`
- `precacheAssets(assetList)`

## Data Model

### Flashcard Schema (v1)

- `id`: string (unique)
- `word`: string
- `translations`:
  - `en`: string
  - `ua`: string
  - `ru`: string
- `tags`: array of strings
- `language`: string (TTS code, e.g., `en`, `de`, `es`, `fr`, `ua`, `ru`)
- `stats`:
  - `know`: number
  - `dontKnow`: number
  - `RecentKnows`: number
  - `RecentDontKnows`: number
- `createdAt`: ISO string
- `updatedAt`: ISO string

Constraints:

- `word` is required and non-empty after trimming.
- `translations.en`/`translations.ua`/`translations.ru` may be empty strings.
- `tags` may be empty; duplicates are removed during normalization.
- `stats.know` and `stats.dontKnow` are integers >= 0.

Normalization rules:

- Word/translations: trim, collapse whitespace, lowercased for duplicate checks.
- Tags: trim, lowercased for filtering; store original user casing optional.

### Settings Schema (v1)

- `uiLanguage`: `en` | `ua` | `ru`
- `ttsEnabled`: boolean
- `prioritizeUnseen`: boolean
- `theme`: `light` | `dark`
- `ttsVoiceMap`: mapping of language code -> voice name (optional)

### Runtime State (in-memory)

- `flashcards`: array of Flashcard
- `settings`: Settings
- `selectedTags`: array of string
- `currentCardId`: string or null
- `persistWarning`: string or null (set when best-effort save fails)

### Backup Schema (v1)

```
{
  "schemaVersion": 1,
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "flashcards": [ ...Flashcard ]
}
```

## Correctness Properties

- Storage consistency: after any mutation that persists successfully, in-memory state and localStorage are equivalent.
- Card invariants: no flashcard has empty `word`; translations may be empty; stats are non-negative integers; `RecentKnows + RecentDontKnows <= 20`.
- Filtering: when tags are selected, a card is included if it matches any selected tag (case-insensitive).
- Scheduling: next-card selection uses only the filtered set; weights derive solely from stats and optional unseen boost.
- Merge restore: duplicates are identified by normalized word+translations(EN/UA/RU)+language and are not duplicated in storage.
- Translation display: study view shows translation matching current UI language; empty translation is allowed and shown as empty state.
- Progress bar uses only `RecentKnows`/`RecentDontKnows` (capped to 20 total).
- Offline-only: the app must not initiate network requests beyond local asset caching.
- TTS compliance: when TTS is disabled or unavailable, no speech is produced and the UI remains usable.

## Adaptive Scheduling Algorithm

### Weight Calculation

Given per-card counters:

- `k = know`
- `d = dontKnow`

Weight example:

- `ratio = (k + 1) / (d + 1)`
- `weight = 1 / ratio`

Cards with more "don't know" yield larger weights. A minimum floor can be applied to avoid zero probability.

### Selection

- Compute weights for filtered cards.
- Optionally boost cards with `k + d = 0` when `prioritizeUnseen = true`.
- Sample next card using weighted random choice.

## Duplicate Detection (Merge Restore)

Duplicates are defined by normalized:

- word + translations(EN/UA/RU) + language

Tags are not used for duplicate detection. On merge, existing cards keep their stats. For duplicates found in backup:

- If the existing card exists, optionally merge tags (union).
- Preserve highest `updatedAt`.

## CSV Import

- Each line has four fields: word, translation EN, translation UA, translation RU.
- Translation fields may be empty; word is required.
- Empty lines are ignored.
- Invalid rows are collected and reported with line numbers.

## UX Flow Summary

- App start:
  - Load flashcards and settings from localStorage.
  - If none, show empty state.
  - Otherwise show a study card and speak it (if TTS enabled).
- Study interaction:
  - Swipe left or click left/left button: don't know.
  - Swipe right or click right/right button: know.
  - Card flips to show translation for the current UI language; stats updated; next card chosen.

## Offline and Security Considerations

- All data stored locally; no network calls.
- Service worker caches only app assets.
- No analytics or external fonts.
- TTS MUST use only OS/local voices (Web Speech API local voices); no online synthesis.

## Responsive Layout

- Mobile-first CSS with a single-column layout under ~720px width.
- Desktop layout uses multi-column panels for Study/Cards/Settings.
- Header stacks vertically on narrow screens; primary actions remain visible.
- Buttons and form controls expand or stack on small screens to improve touch usability.

## Error Handling

- TTS unavailable: `isAvailable()` returns false; disable TTS toggle and show a non-blocking notice.
- CSV parse errors: collect line numbers and reasons; allow partial import or cancel.
- Backup parse errors: block restore, show validation error, keep existing storage unchanged.
- Storage errors (quota or JSON parse): best-effort save; keep in-memory state, set `persistWarning`, and prompt user to export backup.
- Service worker errors: log to console and continue without offline caching.

## Testing Strategy

- Unit tests:
  - normalization and duplicate detection
  - weight calculation and weighted selection
  - CSV parsing and error reporting
  - backup serialization and version validation
- Integration tests:
  - create/edit flow persists to localStorage
  - import/restore merge vs overwrite
  - tag filtering with case-insensitive matching
  - TTS toggle behavior
- Manual tests:
  - PWA install/offline usage
  - swipe mapping (left = don't know, right = know)
  - empty state UX and action availability
