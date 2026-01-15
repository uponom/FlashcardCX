import {
  createFlashcard,
  generateId,
  normalizeTags,
  normalizeTranslations,
  migrateFlashcards,
  selectors,
  createStorageAdapter,
  pickNextCard,
} from "./core.mjs";
import { buildCardKey, validateBackup, mergeCards, prepareIncoming } from "./backup.mjs";

(() => {
  const STORAGE_KEYS = {
    flashcards: "flashcards",
    settings: "settings",
  };

  const BACKUP_SCHEMA_VERSION = 1;

  const defaultSettings = {
    uiLanguage: "en",
    ttsEnabled: false,
    prioritizeUnseen: false,
    theme: "light",
    ttsVoiceMap: {},
  };

  const I18N = {
    en: {
      appTitle: "Flashcard Learning App",
      emptyTitle: "No cards yet",
      emptyDesc: "Create your first flashcard or import a set to start studying.",
      createCard: "Create Card",
      importCsv: "Import CSV",
      settings: "Settings",
      addCard: "Add Card",
      filterByTags: "Filter by tags:",
      noTagsYet: "No tags yet.",
      cardsTitle: "Cards",
      close: "Close",
      allCards: "All cards",
      newCard: "New Card",
      wordLabel: "Word or phrase",
      translationEn: "Translation (EN)",
      translationUa: "Translation (UA)",
      translationRu: "Translation (RU)",
      tagsLabel: "Tags (comma-separated)",
      languageLabel: "Language",
      saveCard: "Save Card",
      cancel: "Cancel",
      noCardsYetShort: "No cards yet.",
      noCardsToStudy: "No cards to study.",
      statsLine: "Total: ✅ {totalKnow} / ❌ {totalDont} · Recent20: ✅ {recentKnow} / ❌ {recentDont}",
      speak: "Speak",
      dontKnow: "Don't know",
      know: "Know",
      settingsDesc: "Preferences",
      toggleTheme: "Toggle theme",
      toggleSpeech: "Toggle speech",
      backup: "Backup",
      restore: "Restore",
      restoreTitle: "Restore cards and settings",
      restoreDesc: "Choose how to apply the backup.",
      merge: "Merge",
      overwrite: "Overwrite",
      deleteCardTitle: "Delete card?",
      deleteCardDesc: "This action cannot be undone.",
      delete: "Delete",
      edit: "Edit",
      uiLanguage: "Interface language",
    },
    ua: {
      appTitle: "Додаток для флешкарт",
      emptyTitle: "Поки що немає карток",
      emptyDesc: "Створіть першу картку або імпортуйте набір, щоб почати навчання.",
      createCard: "Створити картку",
      importCsv: "Імпорт CSV",
      settings: "Налаштування",
      addCard: "Додати картку",
      filterByTags: "Фільтр за тегами:",
      noTagsYet: "Тегів поки що немає.",
      cardsTitle: "Картки",
      close: "Закрити",
      allCards: "Усі картки",
      newCard: "Нова картка",
      wordLabel: "Слово або фраза",
      translationEn: "Переклад (EN)",
      translationUa: "Переклад (UA)",
      translationRu: "Переклад (RU)",
      tagsLabel: "Теги (через кому)",
      languageLabel: "Мова",
      saveCard: "Зберегти",
      cancel: "Скасувати",
      noCardsYetShort: "Карток поки що немає.",
      noCardsToStudy: "Немає карток для навчання.",
      statsLine: "Всього: ✅ {totalKnow} / ❌ {totalDont} · Останні 20: ✅ {recentKnow} / ❌ {recentDont}",
      speak: "Озвучити",
      dontKnow: "Не знаю",
      know: "Знаю",
      settingsDesc: "Параметри",
      toggleTheme: "Змінити тему",
      toggleSpeech: "Озвучування",
      backup: "Бекап",
      restore: "Відновити",
      restoreTitle: "Відновлення карток і налаштувань",
      restoreDesc: "Оберіть спосіб застосування бекапу.",
      merge: "Об'єднати",
      overwrite: "Перезаписати",
      deleteCardTitle: "Видалити картку?",
      deleteCardDesc: "Цю дію неможливо скасувати.",
      delete: "Видалити",
      edit: "Редагувати",
      uiLanguage: "Мова інтерфейсу",
    },
    ru: {
      appTitle: "Приложение флеш-карт",
      emptyTitle: "Карточек пока нет",
      emptyDesc: "Создайте первую карточку или импортируйте набор, чтобы начать обучение.",
      createCard: "Создать карточку",
      importCsv: "Импорт CSV",
      settings: "Настройки",
      addCard: "Добавить карточку",
      filterByTags: "Фильтр по тегам:",
      noTagsYet: "Тегов пока нет.",
      cardsTitle: "Карточки",
      close: "Закрыть",
      allCards: "Все карточки",
      newCard: "Новая карточка",
      wordLabel: "Слово или фраза",
      translationEn: "Перевод (EN)",
      translationUa: "Перевод (UA)",
      translationRu: "Перевод (RU)",
      tagsLabel: "Теги (через запятую)",
      languageLabel: "Язык",
      saveCard: "Сохранить",
      cancel: "Отмена",
      noCardsYetShort: "Карточек пока нет.",
      noCardsToStudy: "Нет карточек для обучения.",
      statsLine: "Всего: ✅ {totalKnow} / ❌ {totalDont} · Последние 20: ✅ {recentKnow} / ❌ {recentDont}",
      speak: "Озвучить",
      dontKnow: "Не знаю",
      know: "Знаю",
      settingsDesc: "Параметры",
      toggleTheme: "Сменить тему",
      toggleSpeech: "Озвучивание",
      backup: "Бэкап",
      restore: "Восстановить",
      restoreTitle: "Восстановление карточек и настроек",
      restoreDesc: "Выберите способ применения бэкапа.",
      merge: "Объединить",
      overwrite: "Перезаписать",
      deleteCardTitle: "Удалить карточку?",
      deleteCardDesc: "Это действие нельзя отменить.",
      delete: "Удалить",
      edit: "Редактировать",
      uiLanguage: "Язык интерфейса",
    },
  };

  const createTranslator = (lang) => {
    const dict = I18N[lang] || I18N.en;
    return (key, vars = {}) => {
      const template = dict[key] || I18N.en[key] || key;
      return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
    };
  };

  const storage = createStorageAdapter(localStorage, defaultSettings, STORAGE_KEYS);

  const testRunner = () => {
    const results = [];
    const assert = (name, condition) => {
      results.push({ name, passed: Boolean(condition) });
    };

    const testCard = createFlashcard({
      word: "hola",
      translations: { en: "hello", ua: "привіт", ru: "привет" },
      tags: ["greet"],
      language: "es",
    });

    assert("createFlashcard sets required fields", Boolean(testCard.id && testCard.word));
    assert("createFlashcard initializes stats", testCard.stats.know === 0 && testCard.stats.dontKnow === 0);
    assert("createFlashcard sets language", testCard.language === "es");

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

    try {
      storage.saveSettings({ ...defaultSettings, uiLanguage: "ua" });
      const loaded = storage.loadSettings();
      assert("settings persist to localStorage", loaded.uiLanguage === "ua");
    } catch (error) {
      assert("settings persist to localStorage", false);
    }

    return results;
  };

  const createStore = (initialState) => {
    let state = { ...initialState };
    const listeners = new Set();

    const getState = () => state;

    const setState = (nextState) => {
      state = { ...state, ...nextState };
      listeners.forEach((listener) => listener(state));
    };

    const subscribe = (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };

    const dispatch = (action) => {
      switch (action.type) {
        case "flashcards/set":
          setState({ flashcards: action.payload });
          break;
        case "flashcards/add":
          setState({ flashcards: [...state.flashcards, action.payload] });
          break;
        case "flashcards/update": {
          const updated = state.flashcards.map((card) =>
            card.id === action.payload.id ? action.payload : card
          );
          setState({ flashcards: updated });
          break;
        }
        case "settings/set":
          setState({ settings: { ...state.settings, ...action.payload } });
          break;
        case "filters/setTags":
          setState({ selectedTags: action.payload });
          break;
        case "study/setCurrent":
          setState({ currentCardId: action.payload });
          break;
        case "persist/setWarning":
          setState({ persistWarning: action.payload });
          break;
        default:
          console.warn("Unknown action:", action);
      }
    };

    return { getState, setState, dispatch, subscribe };
  };

  const app = document.getElementById("app");
  const voiceCache = {
    voices: [],
    ready: false,
  };

  const loadedFlashcards = storage.loadFlashcards();
  const migration = migrateFlashcards(loadedFlashcards);
  const initialFlashcards = migration.cards;
  if (migration.didMigrate) {
    try {
      storage.saveFlashcards(initialFlashcards);
    } catch (error) {
      console.warn("Failed to persist migrated flashcards.", error);
    }
  }
  const initialSettings = storage.loadSettings();

  const store = createStore({
    flashcards: initialFlashcards,
    settings: initialSettings,
    selectedTags: [],
    currentCardId: null,
    persistWarning: null,
  });

  const persistFlashcards = (flashcards) => {
    try {
      storage.saveFlashcards(flashcards);
      store.dispatch({ type: "persist/setWarning", payload: null });
      return true;
    } catch (error) {
      console.warn("Failed to persist flashcards.", error);
      store.dispatch({
        type: "persist/setWarning",
        payload: "Unable to save changes. Please export a backup.",
      });
      return false;
    }
  };

  const persistSettings = (settings) => {
    try {
      storage.saveSettings(settings);
      store.dispatch({ type: "persist/setWarning", payload: null });
      return true;
    } catch (error) {
      console.warn("Failed to persist settings.", error);
      store.dispatch({
        type: "persist/setWarning",
        payload: "Unable to save settings. Please export a backup.",
      });
      return false;
    }
  };

  const ensureCardId = (card) => {
    if (card.id) return card;
    return { ...card, id: generateId() };
  };

  const loadVoices = () => {
    if (!("speechSynthesis" in window)) return [];
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        voiceCache.voices = voices;
        voiceCache.ready = true;
      }
      return voiceCache.voices;
    } catch (error) {
      console.warn("TTS voice loading failed.", error);
      return [];
    }
  };

  const pickVoice = (langCode, settings) => {
    if (!voiceCache.ready) loadVoices();
    const voices = voiceCache.voices || [];
    const preferredName = settings.ttsVoiceMap?.[langCode];
    if (preferredName) {
      const exact = voices.find((voice) => voice.name === preferredName);
      if (exact) return exact;
    }
    const matchesLang = voices.find((voice) => voice.lang.toLowerCase().startsWith(langCode));
    return matchesLang || null;
  };

  const sanitizeTtsText = (text) => {
    return String(text || "")
      .replace(/\([^)]*\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const speakText = (text, langCode, force = false) => {
    if (!("speechSynthesis" in window)) return;
    const cleanText = sanitizeTtsText(text);
    if (!cleanText) return;
    const settings = store.getState().settings;
    if (!settings.ttsEnabled && !force) return;
    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = langCode;
      const voice = pickVoice(langCode, settings);
      if (voice) utterance.voice = voice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn("TTS playback failed.", error);
    }
  };

  const openCardForm = (card = null) => {
    if (!app) return;
    app.dataset.showForm = "true";
    app.dataset.activeCardId = card ? card.id : "";
    const wordValue = card ? card.word : "";
    const translationsValue = normalizeTranslations(card ? card.translations : "");
    const tagsValue = card ? card.tags.join(", ") : "";
    const languageValue = card ? card.language : "en";
    const title = card ? "Edit Card" : "New Card";

    const form = app.querySelector("[data-view='card-form']");
    if (form) {
      form.querySelector("h2").textContent = title;
      form.querySelector("input[name='word']").value = wordValue;
      form.querySelector("input[name='translation-en']").value = translationsValue.en;
      form.querySelector("input[name='translation-ua']").value = translationsValue.ua;
      form.querySelector("input[name='translation-ru']").value = translationsValue.ru;
      form.querySelector("input[name='tags']").value = tagsValue;
      form.querySelector("select[name='language']").value = languageValue;
      form.querySelector("[data-form-error]").textContent = "";
    }
  };

  const renderEmptyState = (t) => `
    <section class="panel empty-state" aria-label="Empty state">
      <h2 class="empty-state__title">${t("emptyTitle")}</h2>
      <p class="panel__content">${t("emptyDesc")}</p>
      <div class="empty-state__actions">
        <button class="empty-state__button" type="button">${t("createCard")}</button>
        <button class="empty-state__button" type="button">${t("importCsv")}</button>
        <button class="empty-state__button" type="button">${t("settings")}</button>
      </div>
    </section>
  `;

  const shouldShowForm = (state) => {
    if (!app) return state.flashcards.length === 0;
    if (state.flashcards.length === 0) return true;
    return app.dataset.showForm === "true";
  };

  const shouldShowCards = () => {
    if (!app) return false;
    return app.dataset.showCards === "true";
  };

  const renderLayout = (state, studyMarkup, studyStatsMarkup, t) => `
    <header class="app__header"></header>
    <div class="app__layout">
      ${state.flashcards.length === 0 ? renderEmptyState(t) : `
        <div class="study-column">
          <section class="panel">
            ${studyMarkup}
            <div class="tag-filter">
              <span class="panel__content">${t("filterByTags")}</span>
              <div class="tag-filter__list"></div>
            </div>
            ${studyStatsMarkup}
          </section>
          ${shouldShowForm(state) ? "" : `
            <div class="inline-action">
              <button class="app__action" type="button" data-action="open-create">${t("addCard")}</button>
            </div>
          `}
        </div>
        ${shouldShowCards() ? `
          <section class="panel" data-view="card-list">
            <div class="panel__header">
              <h2 class="panel__title">${t("cardsTitle")}</h2>
              <button type="button" class="empty-state__button" data-action="close-cards">${t("close")}</button>
            </div>
            <div class="card-list"></div>
          </section>
        ` : ""}
      `}
    </div>
    ${shouldShowForm(state) ? `
      <section class="panel" data-view="card-form">
        <h2 class="panel__title">${t("newCard")}</h2>
        <form class="card-form" autocomplete="off">
          <label class="field">
            <span class="field__label">${t("wordLabel")}</span>
            <input name="word" type="text" required>
          </label>
          <label class="field">
            <span class="field__label">${t("translationEn")}</span>
            <input name="translation-en" type="text" placeholder="Optional">
          </label>
          <label class="field">
            <span class="field__label">${t("translationUa")}</span>
            <input name="translation-ua" type="text" placeholder="Optional">
          </label>
          <label class="field">
            <span class="field__label">${t("translationRu")}</span>
            <input name="translation-ru" type="text" placeholder="Optional">
          </label>
          <label class="field">
            <span class="field__label">${t("tagsLabel")}</span>
            <input name="tags" type="text" placeholder="travel, food">
          </label>
          <label class="field">
            <span class="field__label">${t("languageLabel")}</span>
            <select name="language">
              <option value="en">English</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="ua">Ukrainian</option>
              <option value="ru">Russian</option>
            </select>
          </label>
          <p class="form-error" data-form-error></p>
          <div class="card-form__actions">
            <button type="submit" class="app__action">${t("saveCard")}</button>
            <button type="button" class="empty-state__button" data-action="cancel-form">${t("cancel")}</button>
          </div>
        </form>
      </section>
    ` : ""}
    <section class="panel app__settings">
      <h2 class="panel__title">${t("settings")}</h2>
      <div class="settings-row">
        <div class="settings-group">
          <button class="empty-state__button" type="button" data-action="open-cards">${t("allCards")}</button>
          <button class="empty-state__button" type="button" data-action="toggle-theme" title="${t("toggleTheme")}" aria-label="${t("toggleTheme")}">
            ${state.settings.theme === "dark" ? "🌙" : "☀️"}
          </button>
          <button class="empty-state__button" type="button" data-action="toggle-tts" title="${t("toggleSpeech")}" aria-label="${t("toggleSpeech")}">
            ${state.settings.ttsEnabled ? "🔊" : "🔇"}
          </button>
        </div>
        <div class="settings-group">
          <div class="lang-toggle" role="group" aria-label="${t("uiLanguage")}">
            <button type="button" class="lang-toggle__button ${state.settings.uiLanguage === "en" ? "is-active" : ""}" data-action="ui-language" data-lang="en">EN</button>
            <button type="button" class="lang-toggle__button ${state.settings.uiLanguage === "ua" ? "is-active" : ""}" data-action="ui-language" data-lang="ua">UA</button>
            <button type="button" class="lang-toggle__button ${state.settings.uiLanguage === "ru" ? "is-active" : ""}" data-action="ui-language" data-lang="ru">RU</button>
          </div>
        </div>
        <div class="settings-group">
          <button class="empty-state__button" type="button" data-action="backup">${t("backup")}</button>
          <button class="empty-state__button" type="button" data-action="restore">${t("restore")}</button>
        </div>
      </div>
      <p class="app__footer">Cards: ${state.flashcards.length}. UI: ${state.settings.uiLanguage.toUpperCase()}.</p>
    </section>
    <dialog class="modal" data-modal="confirm-delete">
      <div class="modal__content">
        <h3 class="panel__title">${t("deleteCardTitle")}</h3>
        <p class="panel__content">${t("deleteCardDesc")}</p>
        <div class="modal__actions">
          <button type="button" class="empty-state__button" data-action="confirm-cancel" autofocus>${t("cancel")}</button>
          <button type="button" class="app__action" data-action="confirm-delete">${t("delete")}</button>
        </div>
      </div>
    </dialog>
    <dialog class="modal" data-modal="restore-mode">
      <div class="modal__content">
        <h3 class="panel__title">${t("restoreTitle")}</h3>
        <p class="panel__content">${t("restoreDesc")}</p>
        <div class="modal__actions">
          <button type="button" class="empty-state__button" data-action="restore-cancel" autofocus>${t("cancel")}</button>
          <button type="button" class="empty-state__button" data-action="restore-merge">${t("merge")}</button>
          <button type="button" class="app__action" data-action="restore-overwrite">${t("overwrite")}</button>
        </div>
      </div>
    </dialog>
    <input type="file" accept=".json,application/json" data-action="restore-file" hidden>
  `;

  let advanceTimer = null;
  let pendingNextId = null;
  let swipeStart = null;
  let pendingRestorePayload = null;

  const transitionToNext = (nextId) => {
    if (!nextId) return;
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
    const cardInner = app?.querySelector(".study-card__inner");
    const proceed = () => {
      app.dataset.studyFlip = "false";
      app.dataset.flipDirection = "";
      app.dataset.lastSpokenId = "";
      store.dispatch({ type: "study/setCurrent", payload: nextId });
      pendingNextId = null;
      renderApp();
    };
    if (cardInner) {
      cardInner.classList.add("is-exiting");
      setTimeout(proceed, 450);
    } else {
      proceed();
    }
  };

  const buildStudyMarkup = (state, filteredCards, t) => {
    if (!filteredCards.length) {
      return `<p class="panel__content">${t("noCardsToStudy")}</p>`;
    }
    const current = filteredCards.find((card) => card.id === state.currentCardId) || filteredCards[0];
    const translations = normalizeTranslations(current.translations);
    const translation = translations[state.settings.uiLanguage] || "";
    if (app) {
      app.dataset.currentSpeakText = current.word;
      app.dataset.currentSpeakLang = current.language || "en";
      app.dataset.currentCardId = current.id;
    }
    return `
      <div class="study-controls" data-action="study-card">
        <button
          class="study-action study-action--left"
          type="button"
          data-action="answer-dont-know"
          aria-label="${t("dontKnow")}"
          title="${t("dontKnow")}"
        >❌</button>
        <div class="study-card" data-card-id="${current.id}">
          <div class="study-card__inner">
            <div class="study-card__face study-card__front">
              <p class="study-card__word">${current.word}</p>
            </div>
            <div class="study-card__face study-card__back">
              <p class="study-card__translation ${translation ? "" : "is-empty"}">${translation || "—"}</p>
            </div>
          </div>
          ${(() => {
            const know = Number(current.stats?.RecentKnows || 0);
            const dontKnow = Number(current.stats?.RecentDontKnows || 0);
            const total = know + dontKnow;
            if (!total) return "";
            const knowPct = Math.round((know / total) * 100);
            const dontPct = 100 - knowPct;
            return `
              <div class="study-progress" role="img" aria-label="Know ${know}, Don't know ${dontKnow}">
                <div class="study-progress__dont" style="width: ${dontPct}%"></div>
                <div class="study-progress__know" style="width: ${knowPct}%"></div>
              </div>
            `;
          })()}
        </div>
        <button
          class="study-action study-action--right"
          type="button"
          data-action="answer-know"
          aria-label="${t("know")}"
          title="${t("know")}"
        >✅</button>
      </div>
    `;
  };

  const renderApp = () => {
    if (!app) return;
    const state = store.getState();
    const t = createTranslator(state.settings.uiLanguage);
    document.title = t("appTitle");
    document.documentElement.lang = state.settings.uiLanguage || "en";
    const filteredCards = selectors.getFilteredCards(state);
    if (
      filteredCards.length &&
      (!state.currentCardId ||
        !filteredCards.some((card) => card.id === state.currentCardId))
    ) {
      const picked = pickNextCard(filteredCards, state.settings);
      store.dispatch({ type: "study/setCurrent", payload: picked?.id || filteredCards[0].id });
      return;
    }

    const studyMarkup = buildStudyMarkup(state, filteredCards, t);
    const studyStatsMarkup = (() => {
      if (!filteredCards.length) return "";
      const current = filteredCards.find((card) => card.id === state.currentCardId) || filteredCards[0];
      const stats = current.stats || {};
      const totalKnow = Number(stats.know || 0);
      const totalDont = Number(stats.dontKnow || 0);
      const recentKnow = Number(stats.RecentKnows || 0);
      const recentDont = Number(stats.RecentDontKnows || 0);
      return `
        <div class="study-stats">
          <p class="study-stats__text">
            ${t("statsLine", { totalKnow, totalDont, recentKnow, recentDont })}
          </p>
          <button class="study-stats__speak" type="button" data-action="speak-now" title="${t("speak")}" aria-label="${t("speak")}">
            🔈
          </button>
        </div>
      `;
    })();
    app.innerHTML = renderLayout(state, studyMarkup, studyStatsMarkup, t);
    document.body.dataset.theme = state.settings.theme || "light";
    if (app.dataset.studyFlip === "true") {
      app.classList.add("is-answering");
    } else {
      app.classList.remove("is-answering");
    }
    if (state.settings.ttsEnabled && app.dataset.currentSpeakText && app.dataset.studyFlip !== "true") {
      if (app.dataset.lastSpokenId !== app.dataset.currentCardId) {
        app.dataset.lastSpokenId = app.dataset.currentCardId || "";
        setTimeout(() => {
          speakText(app.dataset.currentSpeakText, app.dataset.currentSpeakLang || "en");
        }, 0);
      }
    }
    if (app.dataset.activeCardId !== undefined && app.dataset.showForm === "true") {
      const activeId = app.dataset.activeCardId || "";
      const activeCard = state.flashcards.find((card) => card.id === activeId);
      if (activeId && activeCard) {
        openCardForm(activeCard);
      } else {
        openCardForm(null);
      }
    }

    const filterList = app.querySelector(".tag-filter__list");
    if (filterList) {
      const tags = selectors.getAvailableTags(state);
      const selected = new Set(state.selectedTags);
      filterList.innerHTML = tags.length
        ? tags
            .map(
              (tag) => `
              <label class="tag-pill">
                <input type="checkbox" value="${tag}" ${selected.has(tag) ? "checked" : ""}>
                <span>${tag}</span>
              </label>
            `
            )
            .join("")
        : `<span class="panel__content">${t("noTagsYet")}</span>`;
    }

    const list = app.querySelector("[data-view='card-list'] .card-list");
    if (list) {
      const { flashcards, settings } = state;
      const sorted = [...flashcards].sort((a, b) =>
        String(a.word || "").localeCompare(String(b.word || ""), undefined, { sensitivity: "base" })
      );
      list.innerHTML = sorted.length
        ? sorted
            .map(
              (card) => `
              <article class="card-list__item">
                <div class="card-list__info">
                  <strong>${card.word}</strong>
                  <span class="card-list__meta">${normalizeTranslations(card.translations)[settings.uiLanguage] || "—"}</span>
                  ${(() => {
                    const know = Number(card.stats?.RecentKnows || 0);
                    const dontKnow = Number(card.stats?.RecentDontKnows || 0);
                    const total = know + dontKnow;
                    if (!total) return "";
                    const knowPct = Math.round((know / total) * 100);
                    const dontPct = 100 - knowPct;
                    return `
                      <div class="study-progress card-list__progress" role="img" aria-label="Know ${know}, Don't know ${dontKnow}">
                        <div class="study-progress__dont" style="width: ${dontPct}%"></div>
                        <div class="study-progress__know" style="width: ${knowPct}%"></div>
                      </div>
                    `;
                  })()}
                </div>
                <div class="card-list__actions">
                  <button type="button" class="empty-state__button" data-action="edit-card" data-id="${card.id}" title="${t("edit")}" aria-label="${t("edit")}">
                    ✏️
                  </button>
                  <button type="button" class="empty-state__button" data-action="delete-card" data-id="${card.id}" title="${t("delete")}" aria-label="${t("delete")}">
                    🗑️
                  </button>
                </div>
              </article>
            `
            )
            .join("")
        : `<p class="panel__content">${t("noCardsYetShort")}</p>`;
    }

    if (app.dataset.studyFlip === "true") {
      const direction = app.dataset.flipDirection || "right";
      requestAnimationFrame(() => {
        const cardEl = app.querySelector(".study-card");
        if (cardEl) {
          cardEl.classList.add("is-flipped");
          cardEl.classList.add(`is-flipped-${direction}`);
        }
      });
    }
  };

  if (app && app.dataset.showForm === undefined) {
    app.dataset.showForm = store.getState().flashcards.length === 0 ? "true" : "false";
  }
  if (app && app.dataset.showCards === undefined) {
    app.dataset.showCards = "false";
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      loadVoices();
      const state = store.getState();
      if (state.settings.ttsEnabled && app?.dataset.currentSpeakText && app?.dataset.lastSpokenId !== app?.dataset.currentCardId) {
        app.dataset.lastSpokenId = app.dataset.currentCardId || "";
        speakText(app.dataset.currentSpeakText, app.dataset.currentSpeakLang || "en");
      }
    });
    loadVoices();
  }

  store.subscribe(renderApp);
  renderApp();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("test") === "1") {
    const results = testRunner();
    if (app) {
      const passed = results.filter((result) => result.passed).length;
      app.innerHTML = `
        <section class="panel">
          <h2 class="panel__title">Test Results</h2>
          <p class="panel__content">Passed ${passed} / ${results.length}</p>
          <ul class="test-list">
            ${results
              .map(
                (result) => `
                <li class="test-list__item ${result.passed ? "is-pass" : "is-fail"}">
                  ${result.passed ? "PASS" : "FAIL"}: ${result.name}
                </li>
              `
              )
              .join("")}
          </ul>
        </section>
      `;
    }
  }

  if (app) {
    app.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.matches("[data-modal='confirm-delete']")) {
        const dialog = target;
        if (dialog instanceof HTMLDialogElement) {
          dialog.close();
          app.dataset.pendingDeleteId = "";
        }
        return;
      }

      if (target.dataset.action === "open-create") {
        app.dataset.showForm = "true";
        app.dataset.activeCardId = "";
        renderApp();
      }

      if (target.dataset.action === "cancel-form") {
        app.dataset.activeCardId = "";
        if (store.getState().flashcards.length === 0) {
          app.dataset.showForm = "true";
          openCardForm(null);
        } else {
          app.dataset.showForm = "false";
          renderApp();
        }
      }

      if (target.dataset.action === "edit-card") {
        const id = target.dataset.id;
        app.dataset.showForm = "true";
        app.dataset.activeCardId = id || "";
        const card = store.getState().flashcards.find((item) => item.id === id);
        renderApp();
        openCardForm(card || null);
      }

      if (target.dataset.action === "open-cards") {
        app.dataset.showCards = "true";
        renderApp();
      }

      if (target.dataset.action === "close-cards") {
        app.dataset.showCards = "false";
        renderApp();
      }

      if (target.dataset.action === "toggle-theme") {
        const nextTheme = store.getState().settings.theme === "dark" ? "light" : "dark";
        store.dispatch({ type: "settings/set", payload: { theme: nextTheme } });
        persistSettings(store.getState().settings);
        renderApp();
      }

      if (target.dataset.action === "toggle-tts") {
        const nextTts = !store.getState().settings.ttsEnabled;
        store.dispatch({ type: "settings/set", payload: { ttsEnabled: nextTts } });
        persistSettings(store.getState().settings);
        renderApp();
      }

      if (target.dataset.action === "ui-language") {
        const nextLang = target.dataset.lang;
        if (!nextLang) return;
        store.dispatch({ type: "settings/set", payload: { uiLanguage: nextLang } });
        persistSettings(store.getState().settings);
        renderApp();
      }

      if (target.dataset.action === "answer-know" || target.dataset.action === "answer-dont-know") {
        const currentState = store.getState();
        const filtered = selectors.getFilteredCards(currentState);
        if (!filtered.length) return;
        const current = filtered.find((card) => card.id === currentState.currentCardId) || filtered[0];
        const deltaKey = target.dataset.action === "answer-know" ? "know" : "dontKnow";
        const prevStats = current.stats || {};
        const recentKnow = Number(prevStats.RecentKnows || 0);
        const recentDont = Number(prevStats.RecentDontKnows || 0);
        const recentTotal = recentKnow + recentDont;
        const updateRecent = (isKnow) => {
          let nextKnow = recentKnow;
          let nextDont = recentDont;
          if (recentTotal < 20) {
            if (isKnow) nextKnow += 1;
            else nextDont += 1;
          } else {
            if (isKnow) {
              if (nextKnow < 20) {
                nextKnow += 1;
                if (nextDont > 0) nextDont -= 1;
              } else if (nextDont > 0) {
                nextDont -= 1;
              }
            } else {
              if (nextDont < 20) {
                nextDont += 1;
                if (nextKnow > 0) nextKnow -= 1;
              } else if (nextKnow > 0) {
                nextKnow -= 1;
              }
            }
          }
          return { nextKnow, nextDont };
        };
        const isKnow = deltaKey === "know";
        const recentUpdate = updateRecent(isKnow);
        const updated = {
          ...current,
          stats: {
            ...prevStats,
            [deltaKey]: (prevStats?.[deltaKey] || 0) + 1,
            RecentKnows: recentUpdate.nextKnow,
            RecentDontKnows: recentUpdate.nextDont,
          },
          updatedAt: new Date().toISOString(),
        };
        store.dispatch({ type: "flashcards/update", payload: updated });
        persistFlashcards(store.getState().flashcards);
        app.dataset.studyFlip = "true";
        app.dataset.flipDirection = deltaKey === "know" ? "right" : "left";
        renderApp();

        if (advanceTimer) clearTimeout(advanceTimer);
        const nextCard = pickNextCard(filtered, currentState.settings);
        const nextId = nextCard?.id || updated.id;
        pendingNextId = nextId;
        advanceTimer = setTimeout(() => {
          transitionToNext(pendingNextId || nextId);
        }, 20000);
      }
      if (target.dataset.action === "delete-card") {
        const id = target.dataset.id;
        const dialog = app.querySelector("[data-modal='confirm-delete']");
        if (dialog instanceof HTMLDialogElement) {
          app.dataset.pendingDeleteId = id || "";
          dialog.showModal();
        }
      }

      if (target.dataset.action === "confirm-delete") {
        const id = app.dataset.pendingDeleteId || "";
        if (!id) return;
        const updatedCards = store.getState().flashcards.filter((card) => card.id !== id);
        store.dispatch({ type: "flashcards/set", payload: updatedCards });
        const nextId = updatedCards[0]?.id || null;
        store.dispatch({ type: "study/setCurrent", payload: nextId });
        persistFlashcards(updatedCards);
        app.dataset.pendingDeleteId = "";
        const dialog = app.querySelector("[data-modal='confirm-delete']");
        if (dialog instanceof HTMLDialogElement) {
          dialog.close();
        }
        renderApp();
      }

      if (target.dataset.action === "confirm-cancel") {
        app.dataset.pendingDeleteId = "";
        const dialog = app.querySelector("[data-modal='confirm-delete']");
        if (dialog instanceof HTMLDialogElement) {
          dialog.close();
        }
      }

      if (target.dataset.action === "speak-now") {
        speakText(app?.dataset.currentSpeakText, app?.dataset.currentSpeakLang || "en", true);
      }

      if (target.dataset.action === "backup") {
        const payload = {
          schemaVersion: BACKUP_SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          flashcards: store.getState().flashcards,
          settings: store.getState().settings,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "flashcards-backup.json";
        link.click();
        URL.revokeObjectURL(url);
      }

      if (target.dataset.action === "restore") {
        const input = app.querySelector("[data-action='restore-file']");
        if (input instanceof HTMLInputElement) {
          input.value = "";
          input.click();
        }
      }

      if (target.dataset.action === "restore-cancel") {
        const dialog = app.querySelector("[data-modal='restore-mode']");
        if (dialog instanceof HTMLDialogElement) {
          dialog.close();
        }
        pendingRestorePayload = null;
      }

      if (target.dataset.action === "restore-merge" || target.dataset.action === "restore-overwrite") {
        const mode = target.dataset.action === "restore-merge" ? "merge" : "overwrite";
        if (!pendingRestorePayload) return;
        const prepared = prepareIncoming(pendingRestorePayload, BACKUP_SCHEMA_VERSION, generateId);
        if (!prepared.ok) {
          alert("Invalid backup format.");
          return;
        }
        const incoming = prepared.cards;
        let nextCards = [];
        if (mode === "overwrite") {
          nextCards = incoming;
        } else {
          const existing = store.getState().flashcards;
          nextCards = mergeCards(existing, incoming);
        }
        if (mode === "overwrite" && prepared.settings) {
          store.dispatch({ type: "settings/set", payload: prepared.settings });
          persistSettings(store.getState().settings);
        }
        store.dispatch({ type: "flashcards/set", payload: nextCards });
        store.dispatch({ type: "study/setCurrent", payload: nextCards[0]?.id || null });
        persistFlashcards(nextCards);
        pendingRestorePayload = null;
        const dialog = app.querySelector("[data-modal='restore-mode']");
        if (dialog instanceof HTMLDialogElement) {
          dialog.close();
        }
        renderApp();
      }
    });

    app.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.closest(".tag-filter")) {
        const checkboxes = Array.from(app.querySelectorAll(".tag-filter__list input[type='checkbox']"));
        const selectedTags = checkboxes.filter((box) => box.checked).map((box) => box.value);
        store.dispatch({ type: "filters/setTags", payload: selectedTags });
        return;
      }
      if (target.dataset.action === "restore-file") {
        const file = target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(String(reader.result || ""));
            if (!validateBackup(parsed, BACKUP_SCHEMA_VERSION)) {
              alert("Invalid backup format.");
              return;
            }
            const existing = store.getState().flashcards;
            if (existing.length) {
              pendingRestorePayload = parsed;
              const dialog = app.querySelector("[data-modal='restore-mode']");
              if (dialog instanceof HTMLDialogElement) {
                dialog.showModal();
              }
            } else {
              const prepared = prepareIncoming(parsed, BACKUP_SCHEMA_VERSION, generateId);
              if (!prepared.ok) {
                alert("Invalid backup format.");
                return;
              }
              const incoming = prepared.cards;
              if (prepared.settings) {
                store.dispatch({ type: "settings/set", payload: prepared.settings });
                persistSettings(store.getState().settings);
              }
              store.dispatch({ type: "flashcards/set", payload: incoming });
              store.dispatch({ type: "study/setCurrent", payload: incoming[0]?.id || null });
              persistFlashcards(incoming);
              renderApp();
            }
          } catch (error) {
            console.warn("Restore failed.", error);
            alert("Restore failed.");
          }
        };
        reader.readAsText(file);
      }
    });


    app.addEventListener("pointerdown", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest(".study-card")) return;
      swipeStart = { x: event.clientX, y: event.clientY };
    });

    app.addEventListener("pointerup", (event) => {
      if (!swipeStart) return;
      const deltaX = event.clientX - swipeStart.x;
      const deltaY = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      const action = deltaX < 0 ? "answer-dont-know" : "answer-know";
      const button = app.querySelector(`[data-action='${action}']`);
      if (button instanceof HTMLElement) {
        button.click();
      }
    });

    app.addEventListener("pointercancel", () => {
      swipeStart = null;
    });

    app.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const card = target.closest(".study-card");
      if (!card) return;
      if (!app.dataset.studyFlip || app.dataset.studyFlip !== "true") return;
      if (!pendingNextId) return;
      transitionToNext(pendingNextId);
    });

    app.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.closest("[data-view='card-form']")) return;
      event.preventDefault();

      const formData = new FormData(form);
      const word = String(formData.get("word") || "").trim();
      const translations = normalizeTranslations({
        en: formData.get("translation-en"),
        ua: formData.get("translation-ua"),
        ru: formData.get("translation-ru"),
      });
      const tags = normalizeTags(formData.get("tags"));
      const language = String(formData.get("language") || "en");
      const errorEl = form.querySelector("[data-form-error]");

      if (!word) {
        if (errorEl) errorEl.textContent = "Word is required.";
        return;
      }

      const activeId = app.dataset.activeCardId || "";
      const now = new Date().toISOString();
      let updatedCards = store.getState().flashcards;

      if (activeId) {
        const existing = updatedCards.find((card) => card.id === activeId);
        if (existing) {
          const updated = {
            ...existing,
            word,
            translations,
            tags,
            language,
            updatedAt: now,
          };
          store.dispatch({ type: "flashcards/update", payload: updated });
          updatedCards = store.getState().flashcards;
        }
      } else {
        const newCard = createFlashcard({ word, translations, tags, language });
        store.dispatch({ type: "flashcards/add", payload: newCard });
        updatedCards = store.getState().flashcards;
      }

      persistFlashcards(updatedCards);
      app.dataset.activeCardId = "";
      if (store.getState().flashcards.length === 0) {
        app.dataset.showForm = "true";
        openCardForm(null);
      } else {
        app.dataset.showForm = "false";
        renderApp();
      }
      form.reset();
    });
  }

  window.FlashcardApp = {
    BACKUP_SCHEMA_VERSION,
    createFlashcard,
    storage,
    store,
    selectors,
    normalizeTags,
    normalizeTranslations,
    migrateFlashcards,
    persistFlashcards,
    persistSettings,
  };
})();
