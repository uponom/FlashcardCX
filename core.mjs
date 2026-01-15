const safeJsonParse = (value, fallback, silent = false) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    if (!silent) {
      console.warn("Failed to parse JSON from storage.", error);
    }
    return fallback;
  }
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `fc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeTranslations = (input) => {
  if (typeof input === "string") {
    const value = input.trim();
    return { en: value, ua: value, ru: value };
  }
  if (!input || typeof input !== "object") {
    return { en: "", ua: "", ru: "" };
  }
  return {
    en: String(input.en ?? "").trim(),
    ua: String(input.ua ?? "").trim(),
    ru: String(input.ru ?? "").trim(),
  };
};

const createFlashcard = ({ word, translations, translation, tags = [], language = "en" }) => {
  const now = new Date().toISOString();
  const normalizedTranslations = normalizeTranslations(translations ?? translation ?? "");
  return {
    id: generateId(),
    word,
    translations: normalizedTranslations,
    tags,
    language,
    stats: { know: 0, dontKnow: 0, RecentKnows: 0, RecentDontKnows: 0 },
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeTags = (tagsInput) => {
  if (!tagsInput) return [];
  const rawTags = Array.isArray(tagsInput)
    ? tagsInput
    : String(tagsInput)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
  const unique = new Set();
  rawTags.forEach((tag) => unique.add(tag.toLowerCase()));
  return Array.from(unique);
};

const selectors = {
  getFilteredCards(state) {
    if (!state.selectedTags || !state.selectedTags.length) return state.flashcards;
    const selected = new Set(state.selectedTags.map((tag) => tag.toLowerCase()));
    return state.flashcards.filter((card) =>
      card.tags.some((tag) => selected.has(String(tag).toLowerCase()))
    );
  },
  getAvailableTags(state) {
    const tags = new Set();
    state.flashcards.forEach((card) => {
      card.tags.forEach((tag) => tags.add(String(tag).toLowerCase()));
    });
    return Array.from(tags).sort();
  },
  getCurrentCard(state) {
    return state.flashcards.find((card) => card.id === state.currentCardId) || null;
  },
};

const computeWeights = (cards, prioritizeUnseen) => {
  return cards.map((card) => {
    const know = Number(card.stats?.RecentKnows || 0);
    const dontKnow = Number(card.stats?.RecentDontKnows || 0);
    const ratio = (know + 1) / (dontKnow + 1);
    let weight = 1 / ratio;
    if (prioritizeUnseen && know + dontKnow === 0) {
      weight *= 2;
    }
    return Math.max(weight, 0.01);
  });
};

const selectWeighted = (cards, weights, rng = Math.random) => {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return cards[0] || null;
  let threshold = rng() * total;
  for (let i = 0; i < cards.length; i += 1) {
    threshold -= weights[i];
    if (threshold <= 0) return cards[i];
  }
  return cards[cards.length - 1] || null;
};

const pickNextCard = (cards, settings, rng = Math.random) => {
  if (!cards.length) return null;
  const weights = computeWeights(cards, settings.prioritizeUnseen);
  return selectWeighted(cards, weights, rng);
};

const createStorageAdapter = (storageLike, defaultSettings, storageKeys, options = {}) => ({
  loadFlashcards() {
    const raw = storageLike.getItem(storageKeys.flashcards);
    const parsed = raw ? safeJsonParse(raw, [], options.silentParseErrors) : [];
    return Array.isArray(parsed) ? parsed : [];
  },
  saveFlashcards(flashcards) {
    storageLike.setItem(storageKeys.flashcards, JSON.stringify(flashcards));
  },
  loadSettings() {
    const raw = storageLike.getItem(storageKeys.settings);
    const parsed = raw ? safeJsonParse(raw, {}, options.silentParseErrors) : {};
    return { ...defaultSettings, ...(parsed || {}) };
  },
  saveSettings(settings) {
    storageLike.setItem(storageKeys.settings, JSON.stringify(settings));
  },
});

const migrateFlashcards = (cards) => {
  if (!Array.isArray(cards)) return { cards: [], didMigrate: true };
  let didMigrate = false;
  const migrated = cards.map((card) => {
    if (!card || typeof card !== "object") return card;
    const next = { ...card };
    const hadLegacy = "translation" in next;
    const normalized = normalizeTranslations(next.translations ?? next.translation ?? "");
    if (!next.translations || hadLegacy) {
      next.translations = normalized;
      didMigrate = true;
    } else if (
      next.translations.en !== normalized.en ||
      next.translations.ua !== normalized.ua ||
      next.translations.ru !== normalized.ru
    ) {
      next.translations = normalized;
      didMigrate = true;
    }
    if (hadLegacy) {
      delete next.translation;
      didMigrate = true;
    }
    if (!next.stats || typeof next.stats !== "object") {
      next.stats = { know: 0, dontKnow: 0, RecentKnows: 0, RecentDontKnows: 0 };
      didMigrate = true;
    } else {
      if (next.stats.RecentKnows === undefined) {
        next.stats.RecentKnows = 0;
        didMigrate = true;
      }
      if (next.stats.RecentDontKnows === undefined) {
        next.stats.RecentDontKnows = 0;
        didMigrate = true;
      }
    }
    return next;
  });

  return { cards: migrated, didMigrate };
};

export {
  createFlashcard,
  generateId,
  normalizeTags,
  normalizeTranslations,
  migrateFlashcards,
  selectors,
  createStorageAdapter,
  computeWeights,
  pickNextCard,
};
