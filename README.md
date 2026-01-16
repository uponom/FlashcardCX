# Flashcard Learning App

A Progressive Web App (PWA) for learning vocabulary using adaptive flashcards. Built with vanilla JavaScript, no external dependencies.

## Features

- Create and manage flashcards with words, translations, tags, and languages
- Adaptive learning algorithm that prioritizes difficult cards
- Text-to-speech pronunciation support
- Tag-based filtering
- Backup and restore functionality
- CSV import support
- Multi-language interface (English, Ukrainian, Russian)
- Fully offline capable
- Installable as PWA

## Project Structure

- `index.html` — entry point
- `app.js` — UI and app wiring
- `core.mjs` — data model, selectors, CSV parsing, storage helpers
- `backup.mjs` — backup/restore helpers
- `styles.css` — UI styles
- `sw.js` — service worker (offline cache)
- `manifest.json` — PWA manifest
- `tests/run.mjs` — minimal unit tests

## Getting Started

Run a local server (required for service workers and PWA testing):

```bash
python3 -m http.server 8001
```

Open `http://localhost:8001/` in your browser.

## Development

- No build step or external dependencies.
- Data is stored in `localStorage`.
- Backup/restore uses JSON files (cards + settings).
- CSV import expects 4 comma-separated fields per row: `word,translation_en,translation_ua,translation_ru`.

## Testing

Run unit tests with Node:

```bash
node tests/run.mjs
```

## Requirements

- Modern web browser with:
  - LocalStorage support
  - Service Worker support
  - ES6 module support
  - Web Speech API (optional, for TTS)

## Offline Use

- The app is offline-first once loaded (assets cached by the service worker).
- For a clean offline test, load the app once online, then switch to offline mode and reload.
