import { normalizeTranslations, migrateFlashcards } from "./core.mjs";

const normalizeWordKey = (value) => {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const buildCardKey = (card) => {
  const translations = normalizeTranslations(card.translations);
  const word = normalizeWordKey(card.word);
  const lang = normalizeWordKey(card.language || "en");
  return [
    word,
    normalizeWordKey(translations.en),
    normalizeWordKey(translations.ua),
    normalizeWordKey(translations.ru),
    lang,
  ].join("|");
};

const ensureCardId = (card, idFactory) => {
  if (card.id) return card;
  return { ...card, id: idFactory() };
};

const validateBackup = (payload, schemaVersion) => {
  if (!payload || typeof payload !== "object") return false;
  if (payload.schemaVersion !== schemaVersion) return false;
  if (!Array.isArray(payload.flashcards)) return false;
  if (!payload.settings || typeof payload.settings !== "object") return false;
  return true;
};

const mergeCards = (existing, incoming) => {
  const map = new Map();
  existing.forEach((card) => map.set(buildCardKey(card), card));
  incoming.forEach((card) => {
    const key = buildCardKey(card);
    if (map.has(key)) {
      const existingCard = map.get(key);
      map.set(key, {
        ...existingCard,
        tags: Array.from(new Set([...(existingCard.tags || []), ...(card.tags || [])])),
      });
    } else {
      map.set(key, card);
    }
  });
  return Array.from(map.values());
};

const prepareIncoming = (payload, schemaVersion, idFactory) => {
  if (!validateBackup(payload, schemaVersion)) return { ok: false, cards: [] };
  const migrated = migrateFlashcards(payload.flashcards);
  const cards = migrated.cards.map((card) => ensureCardId(card, idFactory));
  return { ok: true, cards, settings: payload.settings };
};

export { buildCardKey, validateBackup, mergeCards, prepareIncoming };
