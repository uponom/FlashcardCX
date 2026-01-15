# Requirements Document

## Introduction

Flashcard Learning App - это PWA приложение для изучения иностранных слов и фраз методом карточек (flashcards). Приложение позволяет пользователям создавать собственные карточки, управлять ими, создавать резервные копии и использовать адаптивный алгоритм повторения на основе статистики изучения.

## Glossary

- **Flashcard (Карточка)**: Учебная карточка, содержащая слово/фразу на иностранном языке, перевод, теги, язык и статистику изучения
- **App (Приложение)**: PWA приложение Flashcard Learning App
- **Storage (Хранилище)**: Локальное хранилище браузера для сохранения карточек
- **Backup (Бекап)**: Резервная копия всех карточек пользователя
- **Tag (Тег)**: Метка для категоризации и фильтрации карточек
- **Study_Session (Сессия обучения)**: Процесс изучения карточек с показом и оценкой знаний
- **Statistics (Статистика)**: Счетчики "знаю" и "не знаю" для каждой карточки
- **TTS (Text-to-Speech)**: Система озвучивания текста

## Requirements

### Requirement 1: Управление карточками

**User Story:** As a user, I want to create and manage flashcards with words/phrases and translations, so that I can build my personal vocabulary collection.

#### Acceptance Criteria

1. WHEN a user clicks the add card button, THE App SHALL display a form for creating a new flashcard
2. WHEN creating a flashcard, THE App SHALL require the user to enter a foreign word/phrase and its translation
3. WHEN creating a flashcard, THE App SHALL allow the user to optionally add tags and specify the language
4. WHEN a flashcard is created, THE App SHALL immediately add it to the study collection
5. WHEN a flashcard is saved, THE App SHALL persist it to Storage
6. WHEN a user selects an existing flashcard for editing, THE App SHALL display a form with the current flashcard data
7. WHEN editing a flashcard, THE App SHALL allow the user to modify the word, translation, tags, and language
8. WHEN an edited flashcard is saved, THE App SHALL update the flashcard in Storage while preserving its statistics
9. THE App SHALL display an add card button on all screens
10. IF there are no flashcards in Storage, THEN THE App SHALL show an empty card view with only create/import/settings actions available

### Requirement 2: Локальное хранилище данных

**User Story:** As a user, I want my flashcards to be saved locally, so that they persist when I restart the application.

#### Acceptance Criteria

1. WHEN the App starts, THE App SHALL load all flashcards from Storage
2. WHEN a flashcard is created or modified, THE App SHALL immediately persist changes to Storage
3. WHEN the App is restarted, THE App SHALL restore all previously saved flashcards
4. THE Storage SHALL maintain flashcard data including word, translation, tags, language, and statistics

### Requirement 3: Резервное копирование и восстановление

**User Story:** As a user, I want to create backups of my flashcards and restore them, so that I can protect my data and transfer it between devices.

#### Acceptance Criteria

1. WHEN a user requests a backup, THE App SHALL export all flashcards to a downloadable file
2. WHEN a user uploads a backup file, THE App SHALL validate the file format
3. IF Storage contains existing flashcards WHEN restoring a backup, THEN THE App SHALL prompt the user to choose between merge or overwrite
4. WHEN the user chooses merge, THE App SHALL combine existing flashcards with backup flashcards without duplicates
5. WHEN the user chooses overwrite, THE App SHALL replace all existing flashcards with backup flashcards
6. WHEN restore completes, THE App SHALL persist the updated flashcard collection to Storage

### Requirement 4: Импорт из CSV

**User Story:** As a user, I want to import flashcards from a CSV file, so that I can quickly add multiple cards at once.

#### Acceptance Criteria

1. WHEN a user uploads a CSV file, THE App SHALL parse the file and extract flashcard data
2. WHEN parsing CSV, THE App SHALL validate that required fields (word and translation) are present
3. IF the CSV contains invalid data, THEN THE App SHALL display an error message with details
4. WHEN CSV import succeeds, THE App SHALL add all imported flashcards to the collection
5. WHEN CSV import completes, THE App SHALL persist imported flashcards to Storage
6. THE App SHALL accept CSV files without headers containing exactly two fields per row: word/phrase and translation
7. THE App SHALL use a single, consistent delimiter for CSV (comma)

### Requirement 5: Фильтрация по тегам

**User Story:** As a user, I want to filter flashcards by tags, so that I can focus on specific topics during study sessions.

#### Acceptance Criteria

1. WHEN a user accesses the filter interface, THE App SHALL display all available tags
2. WHEN a user selects one or more tags, THE App SHALL filter the study collection to show only flashcards with those tags
3. WHEN no tags are selected, THE App SHALL include all flashcards in the study collection
4. WHEN filters are applied, THE App SHALL update the study session to use only filtered flashcards
5. Tag matching SHALL be case-insensitive
6. WHEN multiple tags are selected, THE App SHALL include cards that contain any of the selected tags

### Requirement 6: Статистика изучения

**User Story:** As a user, I want the app to track how many times I marked each card as "know" or "don't know", so that the app can prioritize cards I struggle with.

#### Acceptance Criteria

1. WHEN a flashcard is created, THE App SHALL initialize "know" and "don't know" counters to zero
2. WHEN a user marks a flashcard as "know", THE App SHALL increment the "know" counter for that flashcard
3. WHEN a user marks a flashcard as "don't know", THE App SHALL increment the "don't know" counter for that flashcard
4. WHEN statistics are updated, THE App SHALL persist the changes to Storage
5. THE App SHALL store statistics as part of each flashcard's data

### Requirement 7: Адаптивный показ карточек

**User Story:** As a user, I want cards I struggle with to appear more frequently, so that I can focus on words I need to practice.

#### Acceptance Criteria

1. WHEN selecting the next flashcard to display, THE App SHALL calculate probability based on the know/don't-know ratio
2. WHEN a flashcard has a lower know/don't-know ratio, THE App SHALL increase its probability of being shown
3. WHEN a flashcard has a higher know/don't-know ratio, THE App SHALL decrease its probability of being shown
4. WHEN all flashcards have been shown, THE App SHALL allow the study session to continue with recalculated probabilities
5. THE App SHALL provide a setting to prioritize "never shown" cards (optional)

### Requirement 8: Сессия обучения

**User Story:** As a user, I want to study flashcards with an interactive interface, so that I can effectively learn vocabulary.

#### Acceptance Criteria

1. WHEN the App starts, THE App SHALL immediately display a flashcard from the study collection
2. WHEN a flashcard is displayed, THE App SHALL show the foreign word/phrase
3. WHEN a flashcard is displayed, THE TTS SHALL pronounce the word/phrase in the specified language
4. WHEN a user swipes left or right, THE App SHALL register the response as "don't know" or "know" respectively
4a. Swipe left SHALL map to "don't know"; swipe right SHALL map to "know"
5. WHEN a user clicks left or right arrow buttons, THE App SHALL register the response as "don't know" or "know" respectively
6. WHEN a user clicks "don't know" or "know" buttons, THE App SHALL register the corresponding response
7. WHEN a response is registered, THE App SHALL flip the flashcard to show the translation
8. WHEN a response is registered, THE App SHALL update the flashcard statistics
9. WHEN a flashcard interaction completes, THE App SHALL select and display the next flashcard

### Requirement 9: Озвучивание карточек

**User Story:** As a user, I want flashcards to be pronounced automatically, so that I can learn correct pronunciation.

#### Acceptance Criteria

1. WHEN a flashcard is displayed, THE TTS SHALL pronounce the foreign word/phrase
2. WHEN pronouncing text, THE TTS SHALL use the language specified in the flashcard
3. IF no language is specified, THEN THE TTS SHALL use a default language
4. IF TTS is unavailable, THEN THE App SHALL continue functioning without audio
5. THE App SHALL display a toggle button for enabling/disabling TTS on the flashcard screen
6. WHEN a user toggles TTS off, THE App SHALL stop automatic pronunciation of flashcards
7. WHEN a user toggles TTS on, THE App SHALL resume automatic pronunciation of flashcards
8. WHEN TTS setting changes, THE App SHALL persist the user's preference
9. THE App SHALL support at least the following flashcard languages for TTS: English, German, Spanish, French, Ukrainian, Russian

### Requirement 10: Многоязычный интерфейс

**User Story:** As a user, I want to use the app in my preferred language, so that I can understand the interface easily.

#### Acceptance Criteria

1. THE App SHALL support English, Ukrainian, and Russian interface languages
2. WHEN the App starts, THE App SHALL use English as the default interface language
3. WHEN a user selects a different interface language, THE App SHALL update all UI text to the selected language
4. WHEN the interface language changes, THE App SHALL persist the preference
5. WHEN the App restarts, THE App SHALL load the previously selected interface language

### Requirement 11: PWA функциональность

**User Story:** As a user, I want to install the app on my device and use it offline, so that I can study anywhere without internet connection.

#### Acceptance Criteria

1. THE App SHALL be installable as a Progressive Web App
2. THE App SHALL include a web app manifest with appropriate metadata
3. THE App SHALL register a service worker for offline functionality
4. WHEN offline, THE App SHALL continue to function with locally stored flashcards
5. THE App SHALL cache all necessary assets for offline use

### Requirement 12: Полная автономность

**User Story:** As a user, I want the app to work completely offline without any network dependencies, so that I have full privacy and can use it anywhere.

#### Acceptance Criteria

1. THE App SHALL NOT make any network requests to external services
2. THE App SHALL NOT depend on external APIs or third-party services
3. THE App SHALL store all data locally on the user's device
4. THE App SHALL use only browser-native APIs for all functionality
5. THE App SHALL function completely without internet connectivity

### Requirement 13: Схема данных и бэкап

**User Story:** As a user, I want backups to be simple and compatible over time, so that I can restore my cards reliably.

#### Acceptance Criteria

1. THE App SHALL define a flashcard schema including: id, word/phrase, translation, tags, language, stats (know/don't know), and timestamps
2. THE App SHALL export backups as a JSON file
3. THE backup JSON SHALL include a schema version
4. THE App SHALL validate the backup schema version before restore

### Requirement 14: Алгоритм показа карточек

**User Story:** As a user, I want a clear adaptive algorithm for showing cards, so that difficult cards appear more often.

#### Acceptance Criteria

1. THE App SHALL compute a weight for each card based on its know/don't-know counters
2. Cards with lower know/(don't-know+1) ratio SHALL receive higher weights
3. The selection algorithm SHALL sample the next card proportionally to weights
4. The algorithm SHALL be deterministic given the same random seed

## Decisions (Resolved Clarifications)

- Storage: localStorage.
- Backup format: JSON with schema version in the file; simple file extension.
- Duplicate detection for merge: normalize case/whitespace; key is word+translation+language; tags ignored.
- CSV import: no headers; two fields per row; comma delimiter.
- Tag filtering: case-insensitive; require ALL selected tags.
- Study algorithm: adaptive probability; optional setting to prioritize never-shown cards.
- Swipe mapping: left = "don't know", right = "know".
- TTS languages: English, German, Spanish, French, Ukrainian, Russian.
