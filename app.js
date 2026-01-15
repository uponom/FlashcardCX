import {
  createFlashcard,
  normalizeTags,
  normalizeTranslations,
  migrateFlashcards,
  selectors,
  createStorageAdapter,
} from "./core.mjs";

(() => {
  const STORAGE_KEYS = {
    flashcards: "flashcards",
    settings: "settings",
  };

  const BACKUP_SCHEMA_VERSION = 1;

  const defaultSettings = {
    uiLanguage: "en",
    ttsEnabled: true,
    prioritizeUnseen: false,
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
    currentCardId: initialFlashcards[0]?.id || null,
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

  const renderEmptyState = () => `
    <section class="panel empty-state" aria-label="Empty state">
      <h2 class="empty-state__title">No cards yet</h2>
      <p class="panel__content">Create your first flashcard or import a set to start studying.</p>
      <div class="empty-state__actions">
        <button class="empty-state__button" type="button">Create Card</button>
        <button class="empty-state__button" type="button">Import CSV</button>
        <button class="empty-state__button" type="button">Settings</button>
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

  const renderLayout = (state, studyMarkup) => `
    <header class="app__header">
      <h1 class="app__title">Flashcard Learning App</h1>
    </header>
    <div class="app__layout">
      ${state.flashcards.length === 0 ? renderEmptyState() : `
        <div class="study-column">
          <section class="panel">
            <h2 class="panel__title">Study</h2>
            <div class="tag-filter">
              <span class="panel__content">Filter by tags:</span>
              <div class="tag-filter__list"></div>
            </div>
            ${studyMarkup}
          </section>
          <div class="inline-action">
            <button class="app__action" type="button" data-action="open-create">Add Card</button>
          </div>
        </div>
        ${shouldShowCards() ? `
          <section class="panel" data-view="card-list">
            <div class="panel__header">
              <h2 class="panel__title">Cards</h2>
              <button type="button" class="empty-state__button" data-action="close-cards">Close</button>
            </div>
            <div class="card-list"></div>
          </section>
        ` : ""}
      `}
    </div>
    ${shouldShowForm(state) ? `
      <section class="panel" data-view="card-form">
        <h2 class="panel__title">New Card</h2>
        <form class="card-form" autocomplete="off">
          <label class="field">
            <span class="field__label">Word or phrase</span>
            <input name="word" type="text" required>
          </label>
          <label class="field">
            <span class="field__label">Translation (EN)</span>
            <input name="translation-en" type="text" placeholder="Optional">
          </label>
          <label class="field">
            <span class="field__label">Translation (UA)</span>
            <input name="translation-ua" type="text" placeholder="Optional">
          </label>
          <label class="field">
            <span class="field__label">Translation (RU)</span>
            <input name="translation-ru" type="text" placeholder="Optional">
          </label>
          <label class="field">
            <span class="field__label">Tags (comma-separated)</span>
            <input name="tags" type="text" placeholder="travel, food">
          </label>
          <label class="field">
            <span class="field__label">Language</span>
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
            <button type="submit" class="app__action">Save Card</button>
            <button type="button" class="empty-state__button" data-action="cancel-form">Cancel</button>
          </div>
        </form>
      </section>
    ` : ""}
    <section class="panel">
      <h2 class="panel__title">Settings</h2>
      <p class="panel__content">Settings placeholder.</p>
      <div class="settings-actions">
        <button class="empty-state__button" type="button" data-action="open-cards">All cards</button>
      </div>
      <p class="app__footer">Cards: ${state.flashcards.length}. UI: ${state.settings.uiLanguage.toUpperCase()}.</p>
    </section>
    <dialog class="modal" data-modal="confirm-delete">
      <div class="modal__content">
        <h3 class="panel__title">Delete card?</h3>
        <p class="panel__content">This action cannot be undone.</p>
        <div class="modal__actions">
          <button type="button" class="empty-state__button" data-action="confirm-cancel" autofocus>Cancel</button>
          <button type="button" class="app__action" data-action="confirm-delete">Delete</button>
        </div>
      </div>
    </dialog>
  `;

  let advanceTimer = null;
  let pendingNextId = null;
  let swipeStart = null;

  const buildStudyMarkup = (state, filteredCards) => {
    if (!filteredCards.length) {
      return `<p class="panel__content">No cards to study.</p>`;
    }
    const current = filteredCards.find((card) => card.id === state.currentCardId) || filteredCards[0];
    const translations = normalizeTranslations(current.translations);
    const translation = translations[state.settings.uiLanguage] || "";
    const isFlipped = app && app.dataset.studyFlip === "true";

    return `
      <div class="study-controls" data-action="study-card">
        <button
          class="study-action study-action--left"
          type="button"
          data-action="answer-dont-know"
          aria-label="Don't know"
          title="Don't know"
        >❌</button>
        <div class="study-card ${isFlipped ? "is-flipped" : ""}" data-card-id="${current.id}">
          <div class="study-card__inner">
            <div class="study-card__face study-card__front">
              <p class="study-card__word">${current.word}</p>
            </div>
            <div class="study-card__face study-card__back">
              <p class="study-card__translation ${translation ? "" : "is-empty"}">${translation || "—"}</p>
            </div>
          </div>
        </div>
        <button
          class="study-action study-action--right"
          type="button"
          data-action="answer-know"
          aria-label="Know"
          title="Know"
        >✅</button>
      </div>
    `;
  };

  const renderApp = () => {
    if (!app) return;
    const state = store.getState();
    const filteredCards = selectors.getFilteredCards(state);
    if (
      filteredCards.length &&
      !filteredCards.some((card) => card.id === state.currentCardId)
    ) {
      store.dispatch({ type: "study/setCurrent", payload: filteredCards[0].id });
      return;
    }

    const studyMarkup = buildStudyMarkup(state, filteredCards);
    app.innerHTML = renderLayout(state, studyMarkup);
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
        : `<span class="panel__content">No tags yet.</span>`;
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
                <div>
                  <strong>${card.word}</strong>
                  <span class="card-list__meta">${normalizeTranslations(card.translations)[settings.uiLanguage] || "—"}</span>
                </div>
                <div class="card-list__actions">
                  <button type="button" class="empty-state__button" data-action="edit-card" data-id="${card.id}" title="Edit" aria-label="Edit">
                    ✏️
                  </button>
                  <button type="button" class="empty-state__button" data-action="delete-card" data-id="${card.id}" title="Delete" aria-label="Delete">
                    🗑️
                  </button>
                </div>
              </article>
            `
            )
            .join("")
        : `<p class="panel__content">No cards yet.</p>`;
    }
  };

  renderApp();
  store.subscribe(renderApp);

  if (app && app.dataset.showForm === undefined) {
    app.dataset.showForm = store.getState().flashcards.length === 0 ? "true" : "false";
  }
  if (app && app.dataset.showCards === undefined) {
    app.dataset.showCards = "false";
  }

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

      if (target.dataset.action === "answer-know" || target.dataset.action === "answer-dont-know") {
        const currentState = store.getState();
        const filtered = selectors.getFilteredCards(currentState);
        if (!filtered.length) return;
        const current = filtered.find((card) => card.id === currentState.currentCardId) || filtered[0];
        const deltaKey = target.dataset.action === "answer-know" ? "know" : "dontKnow";
        const updated = {
          ...current,
          stats: {
            ...current.stats,
            [deltaKey]: (current.stats?.[deltaKey] || 0) + 1,
          },
          updatedAt: new Date().toISOString(),
        };
        store.dispatch({ type: "flashcards/update", payload: updated });
        persistFlashcards(store.getState().flashcards);
        app.dataset.studyFlip = "true";
        renderApp();

        if (advanceTimer) clearTimeout(advanceTimer);
        const currentIndex = filtered.findIndex((card) => card.id === updated.id);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % filtered.length;
        const nextId = filtered[nextIndex]?.id || updated.id;
        pendingNextId = nextId;
        advanceTimer = setTimeout(() => {
          app.dataset.studyFlip = "false";
          store.dispatch({ type: "study/setCurrent", payload: pendingNextId || nextId });
          pendingNextId = null;
          renderApp();
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
    });

    app.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.closest(".tag-filter")) return;
      const checkboxes = Array.from(app.querySelectorAll(".tag-filter__list input[type='checkbox']"));
      const selectedTags = checkboxes.filter((box) => box.checked).map((box) => box.value);
      store.dispatch({ type: "filters/setTags", payload: selectedTags });
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
      if (advanceTimer) clearTimeout(advanceTimer);
      app.dataset.studyFlip = "false";
      store.dispatch({ type: "study/setCurrent", payload: pendingNextId });
      pendingNextId = null;
      renderApp();
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
