import {
  createFlashcard,
  normalizeTags,
  normalizeTranslations,
  migrateFlashcards,
  selectors,
  createStorageAdapter,
  computeWeights,
  pickNextCard,
} from "../core.mjs";

const results = [];
const assert = (name, condition) => {
  results.push({ name, passed: Boolean(condition) });
};

const storageData = new Map();
const storageLike = {
  getItem(key) {
    return storageData.has(key) ? storageData.get(key) : null;
  },
  setItem(key, value) {
    storageData.set(key, value);
  },
};

const STORAGE_KEYS = {
  flashcards: "flashcards",
  settings: "settings",
};

const defaultSettings = {
  uiLanguage: "en",
  ttsEnabled: true,
  prioritizeUnseen: false,
};

const storage = createStorageAdapter(storageLike, defaultSettings, STORAGE_KEYS);

const testCard = createFlashcard({
  word: "hola",
  translations: { en: "hello", ua: "привіт", ru: "привет" },
  tags: ["greet"],
  language: "es",
});

assert("createFlashcard sets required fields", Boolean(testCard.id && testCard.word));
assert(
  "createFlashcard initializes stats",
  testCard.stats.know === 0 &&
    testCard.stats.dontKnow === 0 &&
    testCard.stats.RecentKnows === 0 &&
    testCard.stats.RecentDontKnows === 0
);
assert("createFlashcard sets language", testCard.language === "es");
assert(
  "createFlashcard stores translations",
  testCard.translations.en === "hello" && testCard.translations.ua === "привіт" && testCard.translations.ru === "привет"
);

const normalized = normalizeTags(" Travel,food, travel ");
assert("normalizeTags lowercases and dedupes", normalized.length === 2 && normalized.includes("travel") && normalized.includes("food"));

const normalizedTranslations = normalizeTranslations({ en: "Hi", ua: "", ru: "Привет" });
assert(
  "normalizeTranslations trims and defaults",
  normalizedTranslations.en === "Hi" && normalizedTranslations.ua === "" && normalizedTranslations.ru === "Привет"
);

const stateForFilter = {
  flashcards: [
    { id: "1", tags: ["food", "travel"] },
    { id: "2", tags: ["work"] },
  ],
  selectedTags: ["TRAVEL"],
  currentCardId: null,
};
const filtered = selectors.getFilteredCards(stateForFilter);
assert("filter matches any selected tag (case-insensitive)", filtered.length === 1 && filtered[0].id === "1");

const stateForTags = {
  flashcards: [
    { id: "1", tags: ["Food", "travel"] },
    { id: "2", tags: ["work", "travel"] },
  ],
};
const available = selectors.getAvailableTags(stateForTags);
assert("available tags are lowercased and unique", available.length === 3 && available.includes("food") && available.includes("work"));

storage.saveSettings({ ...defaultSettings, uiLanguage: "ua" });
const loadedSettings = storage.loadSettings();
assert("settings persist to storage adapter", loadedSettings.uiLanguage === "ua");

storageLike.setItem(STORAGE_KEYS.flashcards, "[invalid");
const loadedCards = storage.loadFlashcards();
assert("invalid flashcards JSON falls back to []", Array.isArray(loadedCards) && loadedCards.length === 0);

const legacyCards = [
  { id: "1", word: "hola", translation: "hello", tags: [], language: "es", stats: { know: 0, dontKnow: 0 } },
  { id: "2", word: "ciao", translations: { en: "hi", ua: "", ru: "" }, tags: [], language: "it", stats: { know: 0, dontKnow: 0 } },
];
const migrated = migrateFlashcards(legacyCards);
assert(
  "migrateFlashcards adds translations and removes legacy field",
  migrated.cards[0].translations.en === "hello" && !("translation" in migrated.cards[0])
);
assert(
  "migrateFlashcards adds recent counters",
  migrated.cards[0].stats.RecentKnows === 0 && migrated.cards[0].stats.RecentDontKnows === 0
);

const weightCards = [
  { stats: { RecentKnows: 0, RecentDontKnows: 3 } },
  { stats: { RecentKnows: 5, RecentDontKnows: 0 } },
];
const weights = computeWeights(weightCards, false);
assert("computeWeights prioritizes more dontKnow", weights[0] > weights[1]);

const picked = pickNextCard([{ id: "a", stats: { know: 0, dontKnow: 0 } }], { prioritizeUnseen: true }, () => 0);
assert("pickNextCard returns a card when available", picked && picked.id === "a");

const failed = results.filter((result) => !result.passed);
if (failed.length) {
  console.error("Tests failed:");
  failed.forEach((result) => console.error(`- ${result.name}`));
  process.exit(1);
}

console.log(`All tests passed (${results.length}).`);
