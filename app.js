document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  /* =========================================================
     1. UTILITAIRES DE DATES & SÉCURITÉ
     ========================================================= */
  function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDateStr(str) {
    if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return new Date();
    }
    const parts = str.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function addDays(dateStr, delta) {
    const d = parseDateStr(dateStr);
    d.setDate(d.getDate() + delta);
    return toDateStr(d);
  }

  function addMonths(dateStr, deltaMonths) {
    const d = parseDateStr(dateStr);
    const origDay = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + deltaMonths);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(origDay, lastDay));
    return toDateStr(d);
  }

  function formatDateLong(dateStr) {
    return parseDateStr(dateStr).toLocaleDateString("fr-CA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function formatDateShort(dateStr) {
    return parseDateStr(dateStr).toLocaleDateString("fr-CA", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  }

  function formatMonthYear(dateStr) {
    return parseDateStr(dateStr).toLocaleDateString("fr-CA", {
      month: "long",
      year: "numeric"
    });
  }

  function formatWeekRange(dateStr) {
    const base = parseDateStr(dateStr);
    const mondayOffset = (base.getDay() + 6) % 7;
    const start = addDays(dateStr, -mondayOffset);
    const end = addDays(start, 6);
    const s = parseDateStr(start).toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
    const e = parseDateStr(end).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
    return `Semaine du ${s} au ${e}`;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function isObj(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function clampLevel(lvl) {
    const n = Number(lvl);
    if (!Number.isFinite(n)) return 2;
    return Math.min(4, Math.max(1, Math.round(n)));
  }

  function clampRange(val, min, max) {
    const n = Number(val);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  /* =========================================================
     2. DONNÉES PAR DÉFAUT, MIGRATION DOUCE & PERSISTANCE
     ========================================================= */
  const STORAGE_KEY = "ziigi_agenda_v19_data";
  /* Version du format des sauvegardes JSON. À augmenter quand la structure des
     données change, puis compléter migrateImportedData() pour convertir les
     anciens fichiers. Un fichier sans numéro est considéré comme ancien (0). */
  const DATA_VERSION = 1;
  const VALID_THEMES = [
    "primaire-claire",
    "primaire-sombre",
    "nature",
    "bonbon",
    "romantique",
    "noir-et-blanc",
    "gateau-bleuet",
    "milkshake-fraise"
  ];

  const THEME_MIGRATION = {
    light: "primaire-claire",
    clair: "primaire-claire",
    dark: "primaire-sombre",
    sombre: "primaire-sombre",
    bw: "noir-et-blanc",
    "primaire-claire": "primaire-claire",
    "primaire-sombre": "primaire-sombre",
    nature: "nature",
    bonbon: "bonbon",
    romantique: "romantique",
    "noir-et-blanc": "noir-et-blanc",
    "gateau-bleuet": "gateau-bleuet",
    "milkshake-fraise": "milkshake-fraise"
  };

  const DEFAULT_QUOTES = [
    "Tu as le droit d'avancer à ton propre rythme aujourd'hui.",
    "Un petit pas reste un pas vers l'avant.",
    "Prendre une grande respiration est déjà une belle façon de prendre soin de soi.",
    "Ta valeur ne se mesure pas au nombre de cases cochées.",
    "C'est parfaitement correct de faire une pause avant de manquer d'énergie.",
    "Chaque journée est une nouvelle page, sans obligation de perfection.",
    "Traite-toi avec la même tendresse que tu offres à ceux que tu aimes.",
    "Ce que tu fais aujourd'hui, avec l'énergie que tu as, est largement suffisant.",
    "Les nuages finissent toujours par passer, même quand le ciel semble gris longtemps.",
    "Tu n'as pas besoin de tout régler aujourd'hui.",
    "Accorde-toi le droit de changer d'avis ou de ralentir.",
    "Un moment de calme vaut parfois mieux qu'une heure d'agitation.",
    "Célébrer les petites victoires rend le chemin plus léger.",
    "Ton corps et ton esprit font de leur mieux ; remercie-les doucement.",
    "Il y a toujours de la place pour un peu de douceur dans la journée.",
    "Ralentir, ce n'est pas reculer, c'est reprendre son souffle.",
    "Tu mérites du repos, même si tout n'est pas terminé.",
    "Laisse aller ce qui pèse trop lourd aujourd'hui.",
    "Une boisson chaude, un rayon de soleil, une chanson : les petits bonheurs comptent vraiment.",
    "Tu as déjà traversé 100 % de tes journées plus difficiles.",
    "Écouter tes limites est une preuve de sagesse, jamais de faiblesse.",
    "Laisse tomber la pression aujourd'hui et fais place à la douceur.",
    "Même la nature prend le temps de se reposer avant de refleurir.",
    "Garder les choses simples fait un bien fou à l'esprit.",
    "Tu n'es pas en retard : tu avances simplement sur ton propre chemin.",
    "Prends un instant pour remarquer une belle chose autour de toi.",
    "Il y a de la beauté même dans les journées toutes simples.",
    "Tu n'as rien à prouver aujourd'hui, juste à vivre ta journée.",
    "Offre-toi un peu d'espace pour simplement exister aujourd'hui.",
    "La douceur est une force tranquille.",
    "Un peu de lumière suffit parfois à adoucir toute une journée."
  ];

  function createBaseState() {
    return {
      ownerName: "",
      theme: "primaire-claire",
      quotes: DEFAULT_QUOTES.slice(),
      categories: [
        { id: "cat_perso", name: "Perso", color: "#0D9488" },
        { id: "cat_travail", name: "Travail", color: "#2563EB" },
        { id: "cat_soin", name: "Soin", color: "#F59E0B" },
        { id: "cat_creatif", name: "Créatif", color: "#7C3AED" },
        { id: "cat_famille", name: "Famille", color: "#EC4899" }
      ],
      moodPills: [
        { id: "mood_1", emoji: "🌧️", label: "Fatiguée", level: 1 },
        { id: "mood_2", emoji: "☁️", label: "Calme / Neutre", level: 2 },
        { id: "mood_3", emoji: "🌤️", label: "Sereine / Bien", level: 3 },
        { id: "mood_4", emoji: "☀️", label: "Pleine d'élan", level: 4 }
      ],
      sleepPills: [
        { id: "sleep_1", emoji: "🌑", label: "Nuit courte", level: 1 },
        { id: "sleep_2", emoji: "🌒", label: "Repos moyen", level: 2 },
        { id: "sleep_3", emoji: "🌓", label: "Bon sommeil", level: 3 },
        { id: "sleep_4", emoji: "🌕", label: "Très réparateur", level: 4 }
      ],
      careGestures: [
        { id: "care_1", label: "🚿 Douche douce" },
        { id: "care_2", label: "🌬️ Respiration" },
        { id: "care_3", label: "🧘 Étirements" },
        { id: "care_4", label: "☕ Boisson chaude" },
        { id: "care_5", label: "🌿 Pause calme" },
        { id: "care_6", label: "🚶 Mouvement doux" }
      ],
      moments: [],
      tasksByDate: {},
      dumpItems: [],
      routines: [
        { id: "rout_1", text: "Grand verre d'eau au réveil" },
        { id: "rout_2", text: "Prendre l'air quelques minutes" },
        { id: "rout_3", text: "Moment calme sans écran le soir" }
      ],
      routineChecksByDate: {},
      wellnessByDate: {},
      notesByDate: {},
      drawingsByDate: {},
      defaultView: "day",
      gentleMode: false,
      collapsedCards: {},
      lastExportAt: null
    };
  }

  /**
   * Données de démo douces sur les 3 derniers jours pour voir immédiatement
   * les barres groupées (Eau + Repas) et les courbes (État + Sommeil) dans le Récap.
   */
  function createDemoState() {
    const s = createBaseState();
    const today = toDateStr(new Date());
    const yesterday = addDays(today, -1);
    const twoDaysAgo = addDays(today, -2);
    const inThreeDays = addDays(today, 3);

    s.moments = [
      {
        id: "demo_m1",
        title: "Café tranquille & lecture",
        date: today,
        startTime: "08:30",
        endTime: "09:15",
        categoryId: "cat_perso",
        recurrence: "daily",
        note: "Prendre le temps de démarrer en douceur."
      },
      {
        id: "demo_m2",
        title: "Marche douce dehors",
        date: today,
        startTime: "14:00",
        endTime: "14:30",
        categoryId: "cat_soin",
        recurrence: "none",
        note: "S'aérer l'esprit sans téléphone."
      },
      {
        id: "demo_m3",
        title: "Session dessin & carnet",
        date: inThreeDays,
        startTime: "16:00",
        endTime: "17:15",
        categoryId: "cat_creatif",
        recurrence: "weekly",
        note: "Un moment créatif juste pour le plaisir."
      }
    ];

    s.tasksByDate[today] = [
      { id: "demo_t1", text: "Arroser les plantes", done: true },
      { id: "demo_t2", text: "Répondre au message important", done: false }
    ];

    s.dumpItems = [
      { id: "demo_d1", text: "Trier les photos du téléphone quand j'aurai envie" }
    ];

    s.routineChecksByDate[today] = { rout_1: true };

    s.wellnessByDate[twoDaysAgo] = {
      isDemo: true,
      moodId: "mood_2",
      moodSnapshot: { id: "mood_2", emoji: "☁️", label: "Calme / Neutre", level: 2 },
      sleepId: "sleep_2",
      sleepSnapshot: { id: "sleep_2", emoji: "🌒", label: "Repos moyen", level: 2 },
      mealsCount: 2,
      snack: true,
      waterGlasses: 4,
      careIds: ["care_4"]
    };

    s.wellnessByDate[yesterday] = {
      isDemo: true,
      moodId: "mood_3",
      moodSnapshot: { id: "mood_3", emoji: "🌤️", label: "Sereine / Bien", level: 3 },
      sleepId: "sleep_3",
      sleepSnapshot: { id: "sleep_3", emoji: "🌓", label: "Bon sommeil", level: 3 },
      mealsCount: 3,
      snack: false,
      waterGlasses: 6,
      careIds: ["care_1", "care_4", "care_5"]
    };

    s.wellnessByDate[today] = {
      isDemo: true,
      moodId: "mood_4",
      moodSnapshot: { id: "mood_4", emoji: "☀️", label: "Pleine d'élan", level: 4 },
      sleepId: "sleep_3",
      sleepSnapshot: { id: "sleep_3", emoji: "🌓", label: "Bon sommeil", level: 3 },
      mealsCount: 3,
      snack: true,
      waterGlasses: 5,
      careIds: ["care_2", "care_4"]
    };

    return s;
  }

  /* ---- Assainissement des données (import JSON, cloud, localStorage) ---- */
  function safeStr(v, max) {
    return typeof v === "string" ? v.slice(0, max || 2000) : "";
  }
  function safeColor(c, fallback) {
    const t = typeof c === "string" ? c.trim() : "";
    return /^(#[0-9a-fA-F]{3,8}|var\(--[a-zA-Z0-9-]+\))$/.test(t) ? t : fallback;
  }
  function sanitizeLevelPills(arr, defaults) {
    if (!Array.isArray(arr)) return defaults;
    return arr.filter(function (x) { return isObj(x) && typeof x.id === "string" && x.id; }).map(function (x) {
      return { id: safeStr(x.id, 80), emoji: safeStr(x.emoji, 16), label: safeStr(x.label, 80), level: clampLevel(x.level) };
    });
  }
  function sanitizeSnapshot(x) {
    if (!isObj(x)) return null;
    return { id: safeStr(x.id, 80), emoji: safeStr(x.emoji, 16), label: safeStr(x.label, 80), level: clampLevel(x.level) };
  }
  function sanitizeCategories(arr, defaults) {
    if (!Array.isArray(arr)) return defaults;
    const out = arr.filter(function (x) { return isObj(x) && typeof x.id === "string" && x.id; }).map(function (x) {
      return { id: safeStr(x.id, 80), name: safeStr(x.name, 60) || "Catégorie", color: safeColor(x.color, "#2563EB") };
    });
    return out.length > 0 ? out : defaults;
  }
  function sanitizeTextItems(arr, defaults, textKey) {
    if (!Array.isArray(arr)) return defaults;
    return arr.filter(function (x) { return isObj(x) && typeof x.id === "string" && x.id; }).map(function (x) {
      const o = { id: safeStr(x.id, 80) };
      o[textKey] = safeStr(x[textKey], 1000);
      return o;
    });
  }
  function sanitizeTasksMap(map) {
    const out = {};
    if (!isObj(map)) return out;
    Object.keys(map).forEach(function (d) {
      if (!Array.isArray(map[d])) return;
      out[d] = map[d].filter(function (t) { return isObj(t) && typeof t.id === "string" && t.id; }).map(function (t) {
        return { id: safeStr(t.id, 80), text: safeStr(t.text, 1000), done: Boolean(t.done) };
      });
    });
    return out;
  }
  function sanitizeQuotes(arr, defaults) {
    if (!Array.isArray(arr)) return defaults;
    const out = arr.filter(function (q) { return typeof q === "string" && q.trim(); }).map(function (q) { return q.slice(0, 500); });
    return out.length > 0 ? out : defaults;
  }
  function sanitizeStringMap(map, max) {
    const out = {};
    if (!isObj(map)) return out;
    Object.keys(map).forEach(function (d) { if (typeof map[d] === "string") out[d] = map[d].slice(0, max || 20000); });
    return out;
  }
  function sanitizeDrawings(map) {
    const out = {};
    if (!isObj(map)) return out;
    Object.keys(map).forEach(function (d) {
      const v = map[d];
      if (typeof v === "string" && /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 2500000) out[d] = v;
    });
    return out;
  }
  function sanitizeChecksMap(map) {
    const out = {};
    if (!isObj(map)) return out;
    Object.keys(map).forEach(function (d) {
      if (!isObj(map[d])) return;
      out[d] = {};
      Object.keys(map[d]).forEach(function (k) { if (map[d][k]) out[d][k] = true; });
    });
    return out;
  }
  function sanitizeBoolMap(map) {
    const out = {};
    if (!isObj(map)) return out;
    Object.keys(map).forEach(function (k) { out[k] = Boolean(map[k]); });
    return out;
  }

  function normalizeWellnessMap(rawMap) {
    const result = {};
    if (!isObj(rawMap)) return result;

    Object.keys(rawMap).forEach(function (dateKey) {
      const entry = rawMap[dateKey];
      if (!isObj(entry)) return;
      result[dateKey] = {
        moodId: typeof entry.moodId === "string" && entry.moodId ? entry.moodId.slice(0, 80) : null,
        moodSnapshot: sanitizeSnapshot(entry.moodSnapshot),
        sleepId: typeof entry.sleepId === "string" && entry.sleepId ? entry.sleepId.slice(0, 80) : null,
        sleepSnapshot: sanitizeSnapshot(entry.sleepSnapshot),
        mealsCount: clampRange(entry.mealsCount || 0, 0, 3),
        snack: Boolean(entry.snack),
        waterGlasses: clampRange(entry.waterGlasses || 0, 0, 8),
        careIds: Array.isArray(entry.careIds) ? entry.careIds.filter(function (c) { return typeof c === "string"; }).map(function (c) { return c.slice(0, 80); }) : [],
        isDemo: Boolean(entry.isDemo)
      };
    });
    return result;
  }

  function mergeWithDefaults(raw) {
    const def = createBaseState();
    if (!isObj(raw)) return createDemoState();

    const mappedTheme = THEME_MIGRATION[raw.theme] || def.theme;

    return {
      ownerName: safeStr(raw.ownerName, 60),
      theme: VALID_THEMES.includes(mappedTheme) ? mappedTheme : def.theme,
      quotes: sanitizeQuotes(raw.quotes, def.quotes),
      categories: sanitizeCategories(raw.categories, def.categories),
      moodPills: sanitizeLevelPills(raw.moodPills, def.moodPills),
      sleepPills: sanitizeLevelPills(raw.sleepPills, def.sleepPills),
      careGestures: sanitizeTextItems(raw.careGestures, def.careGestures, "label"),
      moments: Array.isArray(raw.moments)
        ? raw.moments
            .filter(function (m) { return isObj(m) && typeof m.date === "string"; })
            .map(function (m, idx) {
              return {
                id: typeof m.id === "string" && m.id ? m.id : uid("mom_" + idx),
                title: typeof m.title === "string" ? m.title : "Sans titre",
                date: m.date,
                startTime: typeof m.startTime === "string" ? m.startTime : "00:00",
                endTime: typeof m.endTime === "string" ? m.endTime : "",
                categoryId: typeof m.categoryId === "string" ? m.categoryId : "",
                recurrence: typeof m.recurrence === "string" ? m.recurrence : "none",
                recurrenceEnd: typeof m.recurrenceEnd === "string" ? m.recurrenceEnd : "",
                excludedDates: Array.isArray(m.excludedDates) ? m.excludedDates.filter(function (d) { return typeof d === "string"; }) : [],
                note: typeof m.note === "string" ? m.note : ""
              };
            })
        : [],
      tasksByDate: sanitizeTasksMap(raw.tasksByDate),
      dumpItems: sanitizeTextItems(raw.dumpItems, [], "text"),
      routines: sanitizeTextItems(raw.routines, def.routines, "text"),
      routineChecksByDate: sanitizeChecksMap(raw.routineChecksByDate),
      wellnessByDate: normalizeWellnessMap(raw.wellnessByDate),
      notesByDate: sanitizeStringMap(raw.notesByDate),
      drawingsByDate: sanitizeDrawings(raw.drawingsByDate),
      defaultView: raw.defaultView === "month" ? "month" : "day",
      gentleMode: Boolean(raw.gentleMode),
      collapsedCards: sanitizeBoolMap(raw.collapsedCards),
      lastExportAt: typeof raw.lastExportAt === "number" ? raw.lastExportAt : null
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDemoState();
      return mergeWithDefaults(JSON.parse(raw));
    } catch (err) {
      console.warn("LocalStorage indisponible ou invalide, chargement des données de démo :", err);
      return createDemoState();
    }
  }

  let state = loadState();
  let currentPage = "agenda"; // "agenda" | "settings"
  let currentView = state.defaultView === "month" ? "month" : "day";    // "day" | "week" | "month" | "recap"
  let selectedDate = toDateStr(new Date());
  let recapDays = 7;
  let recapSeriesVisible = { mood: true, sleep: true, water: true, meals: true };
  let manualQuoteIndex = null;
  let noteSavedTimer = null;
  let resizeTimer = null;

  let scheduleCloudSave = function () {};
  const CLOUD_DIRTY_KEY = "ziigi_agenda_cloud_dirty";
  function saveState() {
    try {
      localStorage.setItem(CLOUD_DIRTY_KEY, String(Date.now()));
    } catch (err) {}
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      showToast("Impossible de sauvegarder localement.");
    }
    scheduleCloudSave();
  }

  /* =========================================================
     3. TOASTS & MODALE DE CONFIRMATION (Zéro alert/confirm)
     ========================================================= */
  function showToast(msg, opts) {
    const container = document.getElementById("toastContainer");
    const el = document.createElement("div");
    el.className = "toast";
    const label = document.createElement("span");
    label.textContent = msg;
    el.appendChild(label);
    let duration = 2500;
    if (opts && typeof opts.onAction === "function") {
      el.classList.add("toast-with-action");
      duration = opts.duration || 6000;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toast-action";
      btn.textContent = opts.actionLabel || "Annuler";
      btn.onclick = function () {
        el.remove();
        opts.onAction();
      };
      el.appendChild(btn);
    }
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, duration);
  }

  /* Annulation de suppression : on garde une copie de l'agenda juste avant
     la suppression et on propose « Annuler » pendant quelques secondes. */
  function snapshotState() {
    try {
      return JSON.stringify(state);
    } catch (err) {
      return null;
    }
  }

  function offerUndo(message, snapshot) {
    if (!snapshot) {
      showToast(message);
      return;
    }
    showToast(message, {
      actionLabel: "Annuler",
      duration: 6000,
      onAction: function () {
        try {
          state = mergeWithDefaults(JSON.parse(snapshot));
          saveState();
          renderAll();
          showToast("Rétabli ✨");
        } catch (err) {
          showToast("Impossible d'annuler.");
        }
      }
    });
  }

  function askConfirm(message, onConfirm) {
    const modal = document.getElementById("confirmModal");
    document.getElementById("confirmMessage").textContent = message;
    modal.classList.remove("hidden");

    const okBtn = document.getElementById("confirmOkBtn");
    const cancelBtn = document.getElementById("confirmCancelBtn");

    function cleanup() {
      modal.classList.add("hidden");
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    }

    okBtn.onclick = function () {
      cleanup();
      onConfirm();
    };
    cancelBtn.onclick = cleanup;
  }

  function askDeleteRecurring(moment, dateStr) {
    const modal = document.getElementById("deleteRecurringModal");
    const msgEl = document.getElementById("deleteRecurringMessage");
    msgEl.textContent = `« ${moment.title} » est un événement récurrent. Que souhaites-tu retirer ?`;
    modal.classList.remove("hidden");

    const singleBtn = document.getElementById("deleteSingleOccurrenceBtn");
    const allBtn = document.getElementById("deleteAllRecurringBtn");
    const cancelBtn = document.getElementById("deleteRecurringCancelBtn");
    const closeBtn = document.getElementById("deleteRecurringCloseBtn");

    function cleanup() {
      modal.classList.add("hidden");
      singleBtn.onclick = null;
      allBtn.onclick = null;
      cancelBtn.onclick = null;
      closeBtn.onclick = null;
      modal.onclick = null;
    }

    singleBtn.onclick = function () {
      cleanup();
      const undoSnap = snapshotState();
      if (!Array.isArray(moment.excludedDates)) moment.excludedDates = [];
      if (!moment.excludedDates.includes(dateStr)) {
        moment.excludedDates.push(dateStr);
      }
      saveState();
      renderAll();
      offerUndo("Ce moment a été retiré pour cette journée.", undoSnap);
    };

    allBtn.onclick = function () {
      cleanup();
      const undoSnap = snapshotState();
      state.moments = state.moments.filter(function (x) { return x.id !== moment.id; });
      saveState();
      renderAll();
      offerUndo("Toute la récurrence a été retirée.", undoSnap);
    };

    cancelBtn.onclick = cleanup;
    closeBtn.onclick = cleanup;
    modal.onclick = function (e) {
      if (e.target === modal) cleanup();
    };
  }

  /* =========================================================
     4. TITRE, THÈME & CITATION
     ========================================================= */
  function renderOwnerTitle() {
    const clean = (state.ownerName || "").trim();
    const title = clean ? `Agenda de ${clean}` : "Mon agenda";
    document.getElementById("appTitleDisplay").textContent = title;
    document.title = title;
  }

  function applyTheme() {
    const theme = VALID_THEMES.includes(state.theme) ? state.theme : "primaire-claire";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta && /^#[0-9a-fA-F]{3,8}$/.test(bg)) meta.setAttribute("content", bg);
    } catch (err) {}
    document.querySelectorAll(".theme-btn").forEach(function (btn) {
      btn.classList.toggle("primary", btn.dataset.themeChoice === theme);
    });
  }

  function renderQuote() {
    const display = document.getElementById("quoteDisplay");
    const quotes = state.quotes;
    if (!quotes || quotes.length === 0) {
      display.textContent = "« Prends soin de toi aujourd'hui. »";
      return;
    }
    let idx = manualQuoteIndex;
    if (idx === null || idx < 0 || idx >= quotes.length) {
      const dayOfMonth = parseDateStr(selectedDate).getDate();
      idx = (dayOfMonth - 1) % quotes.length;
    }
    display.textContent = `« ${quotes[idx]} »`;
  }

  /* =========================================================
     5. RÉSOLUTION DES PASTILLES (ÉTAT & SOMMEIL)
     ========================================================= */
  function resolvePill(type, dayEntry) {
    if (!isObj(dayEntry)) return null;
    const id = type === "mood" ? dayEntry.moodId : dayEntry.sleepId;
    const snapshot = type === "mood" ? dayEntry.moodSnapshot : dayEntry.sleepSnapshot;
    if (!id && !snapshot) return null;

    const list = type === "mood" ? state.moodPills : state.sleepPills;
    const live = list.find(function (p) { return p.id === id; });

    if (live) {
      return {
        id: live.id,
        emoji: live.emoji || "•",
        label: live.label || "Sans titre",
        level: clampLevel(live.level)
      };
    }
    if (isObj(snapshot)) {
      return {
        id: snapshot.id || id,
        emoji: snapshot.emoji || "•",
        label: snapshot.label || "Pastille archivée",
        level: clampLevel(snapshot.level)
      };
    }
    return null;
  }

  function hasWellnessOrTasks(dateStr) {
    const tasks = Array.isArray(state.tasksByDate[dateStr]) ? state.tasksByDate[dateStr] : [];
    if (tasks.length > 0) return true;
    if ((state.notesByDate[dateStr] || "").trim().length > 0) return true;
    const w = state.wellnessByDate[dateStr];
    if (!isObj(w)) return false;
    return Boolean(
      w.moodId ||
      w.sleepId ||
      w.mealsCount > 0 ||
      w.snack ||
      w.waterGlasses > 0 ||
      (Array.isArray(w.careIds) && w.careIds.length > 0)
    );
  }

  /* =========================================================
     6. HORAIRE (MOMENTS + RÉCURRENCES)
     ========================================================= */
  function daysBetween(startStr, endStr) {
    const a = parseDateStr(startStr);
    const b = parseDateStr(endStr);
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((utcB - utcA) / 86400000);
  }

  function getMomentsForDate(dateStr) {
    const target = parseDateStr(dateStr);
    const targetDow = target.getDay();

    return state.moments
      .filter(function (m) {
        if (!m || !m.date) return false;
        if (Array.isArray(m.excludedDates) && m.excludedDates.includes(dateStr)) return false;
        if (m.date === dateStr) return true;
        if (m.date > dateStr) return false;
        if (m.recurrenceEnd && dateStr > m.recurrenceEnd) return false;
        if (m.recurrence === "daily") return true;
        if (m.recurrence === "weekdays") return targetDow >= 1 && targetDow <= 5;
        if (m.recurrence === "weekly") return parseDateStr(m.date).getDay() === targetDow;
        if (m.recurrence === "biweekly") {
          const diff = daysBetween(m.date, dateStr);
          return diff >= 0 && diff % 14 === 0;
        }
        if (m.recurrence === "yearly") {
          const startD = parseDateStr(m.date);
          const startM = startD.getMonth();
          const startDay = startD.getDate();
          if (target.getMonth() === startM && target.getDate() === startDay) return true;
          // Gestion du 29 février les années non bissextiles (affiché le 28 février)
          if (startM === 1 && startDay === 29 && target.getMonth() === 1 && target.getDate() === 28) {
            const y = target.getFullYear();
            const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
            if (!isLeap) return true;
          }
          return false;
        }
        return false;
      })
      .sort(function (a, b) {
        return (a.startTime || "").localeCompare(b.startTime || "");
      });
  }

  function openMomentModal(moment, defaultDate) {
    const modal = document.getElementById("momentModal");
    const catSelect = document.getElementById("momentCategoryInput");
    catSelect.innerHTML = "";

    state.categories.forEach(function (c) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      catSelect.appendChild(opt);
    });

    if (moment) {
      document.getElementById("momentModalTitle").textContent = "Modifier le moment";
      document.getElementById("momentIdInput").value = moment.id;
      document.getElementById("momentTitleInput").value = moment.title || "";
      document.getElementById("momentDateInput").value = moment.date || selectedDate;
      document.getElementById("momentStartInput").value = moment.startTime || "09:00";
      document.getElementById("momentEndInput").value = moment.endTime || "";
      const fallbackCatId = state.categories[0] ? state.categories[0].id : "";
      const hasCat = state.categories.some(function (c) { return c.id === moment.categoryId; });
      document.getElementById("momentCategoryInput").value = hasCat ? moment.categoryId : fallbackCatId;
      document.getElementById("momentRecurrenceInput").value = moment.recurrence || "none";
      document.getElementById("momentNoteInput").value = moment.note || "";
    } else {
      document.getElementById("momentModalTitle").textContent = "Nouveau moment";
      document.getElementById("momentIdInput").value = "";
      document.getElementById("momentTitleInput").value = "";
      document.getElementById("momentDateInput").value = defaultDate || selectedDate;
      document.getElementById("momentStartInput").value = "09:00";
      document.getElementById("momentEndInput").value = "";
      document.getElementById("momentCategoryInput").value = state.categories[0] ? state.categories[0].id : "";
      document.getElementById("momentRecurrenceInput").value = "none";
      document.getElementById("momentNoteInput").value = "";
    }

    modal.classList.remove("hidden");
    document.getElementById("momentTitleInput").focus();
  }

  function renderMoments() {
    const list = document.getElementById("momentsList");
    const moments = getMomentsForDate(selectedDate);
    list.innerHTML = "";

    if (moments.length === 0) {
      list.innerHTML = `<p class="muted">Aucun moment inscrit à l'horaire pour cette journée.</p>`;
      return;
    }

    const recLabels = {
      daily: "🔁 Chaque jour",
      weekdays: "🔁 Lun–Ven",
      weekly: "🔁 Chaque semaine",
      biweekly: "🔁 Aux 2 semaines",
      yearly: "🔁 Chaque année"
    };

    moments.forEach(function (m) {
      const cat = state.categories.find(function (c) { return c.id === m.categoryId; });
      const color = cat ? cat.color : "var(--accent)";
      const timeText = m.endTime ? `${m.startTime} – ${m.endTime}` : (m.startTime || "");
      const recText = recLabels[m.recurrence] || "";

      const el = document.createElement("div");
      el.className = "moment-item";
      el.style.borderLeftColor = color;
      el.innerHTML = `
        <div class="moment-main">
          <div class="moment-top-line">
            <span class="moment-time">${escapeHtml(timeText)}</span>
            ${cat ? `<span class="badge"><span class="cat-dot" style="background:${escapeHtml(color)};"></span>${escapeHtml(cat.name)}</span>` : ""}
            ${recText ? `<span class="badge">${recText}</span>` : ""}
          </div>
          <div class="moment-title"></div>
          ${m.note ? `<div class="moment-note"></div>` : ""}
        </div>
        <div class="moment-actions">
          <button type="button" class="icon-btn" data-edit="1" title="Modifier" aria-label="Modifier">✏️</button>
          <button type="button" class="icon-btn danger-icon" data-del="1" title="Supprimer" aria-label="Supprimer">✕</button>
        </div>
      `;

      el.querySelector(".moment-title").textContent = m.title || "";
      if (m.note) el.querySelector(".moment-note").textContent = m.note;

      el.querySelector("[data-edit]").onclick = function () { openMomentModal(m); };
      el.querySelector("[data-del]").onclick = function () {
        const isRecurring = m.recurrence && m.recurrence !== "none";
        if (isRecurring) {
          askDeleteRecurring(m, selectedDate);
        } else {
          const undoSnap = snapshotState();
          state.moments = state.moments.filter(function (x) { return x.id !== m.id; });
          saveState();
          renderAll();
          offerUndo("Moment supprimé.", undoSnap);
        }
      };

      list.appendChild(el);
    });
  }

  /* =========================================================
     7. À FAIRE, VIDE TON SAC & ROUTINES
     ========================================================= */
  function renderTasksAndRoutines() {
    // À faire aujourd'hui
    const todayList = document.getElementById("todayTasksList");
    const tasks = Array.isArray(state.tasksByDate[selectedDate]) ? state.tasksByDate[selectedDate] : [];
    todayList.innerHTML = "";

    if (tasks.length === 0) {
      todayList.innerHTML = `<p class="muted">Rien d'urgent inscrit pour aujourd'hui.</p>`;
    } else {
      tasks.forEach(function (t) {
        const row = document.createElement("div");
        row.className = `list-item ${t.done ? "done" : ""}`;
        row.innerHTML = `
          <label>
            <input type="checkbox" ${t.done ? "checked" : ""} />
            <span></span>
          </label>
          <div class="row">
            <button type="button" class="sm btn-soft" data-later="1">Plus tard</button>
            <button type="button" class="sm danger" data-del="1" aria-label="Supprimer">✕</button>
          </div>
        `;
        row.querySelector("span").textContent = t.text;
        row.querySelector("input").onchange = function (e) {
          t.done = e.target.checked;
          saveState();
          renderTasksAndRoutines();
        };
        row.querySelector("[data-later]").onclick = function () {
          state.tasksByDate[selectedDate] = tasks.filter(function (x) { return x.id !== t.id; });
          state.dumpItems.unshift({ id: uid("dump"), text: t.text });
          saveState();
          renderTasksAndRoutines();
          showToast("Déplacé dans « Vide ton sac ».");
        };
        row.querySelector("[data-del]").onclick = function () {
          const undoSnap = snapshotState();
          state.tasksByDate[selectedDate] = tasks.filter(function (x) { return x.id !== t.id; });
          saveState();
          renderTasksAndRoutines();
          offerUndo("Supprimé.", undoSnap);
        };
        todayList.appendChild(row);
      });
    }

    // Vide ton sac
    const dumpList = document.getElementById("dumpList");
    dumpList.innerHTML = "";
    if (state.dumpItems.length === 0) {
      dumpList.innerHTML = `<p class="muted">L'esprit est léger : ton sac est vide.</p>`;
    } else {
      state.dumpItems.forEach(function (d) {
        const row = document.createElement("div");
        row.className = "list-item";
        row.innerHTML = `
          <span style="flex:1;"></span>
          <div class="row">
            <button type="button" class="sm primary" data-today="1">Aujourd'hui</button>
            <button type="button" class="sm danger" data-del="1" aria-label="Supprimer">✕</button>
          </div>
        `;
        row.querySelector("span").textContent = d.text;
        row.querySelector("[data-today]").onclick = function () {
          state.dumpItems = state.dumpItems.filter(function (x) { return x.id !== d.id; });
          if (!Array.isArray(state.tasksByDate[selectedDate])) state.tasksByDate[selectedDate] = [];
          state.tasksByDate[selectedDate].push({ id: uid("task"), text: d.text, done: false });
          saveState();
          renderTasksAndRoutines();
          showToast("Ajouté à « À faire aujourd'hui ».");
        };
        row.querySelector("[data-del]").onclick = function () {
          const undoSnap = snapshotState();
          state.dumpItems = state.dumpItems.filter(function (x) { return x.id !== d.id; });
          saveState();
          renderTasksAndRoutines();
          offerUndo("Supprimé.", undoSnap);
        };
        dumpList.appendChild(row);
      });
    }

    // Mes routines de vie
    const routinesList = document.getElementById("routinesList");
    const checks = isObj(state.routineChecksByDate[selectedDate]) ? state.routineChecksByDate[selectedDate] : {};
    routinesList.innerHTML = "";

    if (state.routines.length === 0) {
      routinesList.innerHTML = `<p class="muted">Ajoute une petite habitude douce ci-dessous.</p>`;
    } else {
      state.routines.forEach(function (r) {
        const checked = !!checks[r.id];
        const row = document.createElement("div");
        row.className = `list-item ${checked ? "routine-done" : ""}`;
        row.innerHTML = `
          <label>
            <input type="checkbox" ${checked ? "checked" : ""} />
            <span></span>
          </label>
          <button type="button" class="sm danger" data-del="1" aria-label="Supprimer">✕</button>
        `;
        row.querySelector("span").textContent = r.text;
        row.querySelector("input").onchange = function (e) {
          if (!isObj(state.routineChecksByDate[selectedDate])) {
            state.routineChecksByDate[selectedDate] = {};
          }
          state.routineChecksByDate[selectedDate][r.id] = e.target.checked;
          saveState();
          renderTasksAndRoutines();
        };
        row.querySelector("[data-del]").onclick = function () {
          const undoSnap = snapshotState();
          state.routines = state.routines.filter(function (x) { return x.id !== r.id; });
          saveState();
          renderTasksAndRoutines();
          offerUndo("Supprimé.", undoSnap);
        };
        routinesList.appendChild(row);
      });
    }
  }

  /* =========================================================
     8. PRENDRE SOIN DE MOI (ÉTAT, SOMMEIL, REPAS/EAU, SOINS)
     ========================================================= */
  function getOrCreateWellness(dateStr) {
    if (!isObj(state.wellnessByDate[dateStr])) {
      state.wellnessByDate[dateStr] = {
        moodId: null,
        moodSnapshot: null,
        sleepId: null,
        sleepSnapshot: null,
        mealsCount: 0,
        snack: false,
        waterGlasses: 0,
        careIds: []
      };
    }
    delete state.wellnessByDate[dateStr].isDemo;
    return state.wellnessByDate[dateStr];
  }

  function renderWellnessAndNotes() {
    const entry = isObj(state.wellnessByDate[selectedDate])
      ? state.wellnessByDate[selectedDate]
      : { moodId: null, sleepId: null, mealsCount: 0, snack: false, waterGlasses: 0, careIds: [] };

    // 1. État général
    const moodBox = document.getElementById("moodPillsContainer");
    moodBox.innerHTML = "";
    state.moodPills.forEach(function (p) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `pill-btn mood-pill ${entry.moodId === p.id ? "selected" : ""}`;
      btn.textContent = `${p.emoji} ${p.label}`;
      btn.onclick = function () {
        const w = getOrCreateWellness(selectedDate);
        if (w.moodId === p.id) {
          w.moodId = null;
          w.moodSnapshot = null;
        } else {
          w.moodId = p.id;
          w.moodSnapshot = { id: p.id, emoji: p.emoji, label: p.label, level: clampLevel(p.level) };
        }
        saveState();
        renderWellnessAndNotes();
      };
      moodBox.appendChild(btn);
    });

    // 2. Qualité du sommeil
    const sleepBox = document.getElementById("sleepPillsContainer");
    sleepBox.innerHTML = "";
    state.sleepPills.forEach(function (p) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `pill-btn sleep-pill ${entry.sleepId === p.id ? "selected" : ""}`;
      btn.textContent = `${p.emoji} ${p.label}`;
      btn.onclick = function () {
        const w = getOrCreateWellness(selectedDate);
        if (w.sleepId === p.id) {
          w.sleepId = null;
          w.sleepSnapshot = null;
        } else {
          w.sleepId = p.id;
          w.sleepSnapshot = { id: p.id, emoji: p.emoji, label: p.label, level: clampLevel(p.level) };
        }
        saveState();
        renderWellnessAndNotes();
      };
      sleepBox.appendChild(btn);
    });

    // 3. Repas & hydratation : Repas (1, 2, 3) + Collation
    const mealsBox = document.getElementById("mealsPillsContainer");
    mealsBox.innerHTML = "";
    const currentMeals = clampRange(entry.mealsCount || 0, 0, 3);

    [1, 2, 3].forEach(function (count) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `pill-btn meal-pill ${currentMeals === count ? "selected" : ""}`;
      btn.textContent = `🍽️ ${count} repas`;
      btn.onclick = function () {
        const w = getOrCreateWellness(selectedDate);
        w.mealsCount = w.mealsCount === count ? 0 : count;
        saveState();
        renderWellnessAndNotes();
      };
      mealsBox.appendChild(btn);
    });

    const snackBtn = document.createElement("button");
    snackBtn.type = "button";
    snackBtn.className = `pill-btn meal-pill ${entry.snack ? "selected" : ""}`;
    snackBtn.textContent = "🍎 Collation";
    snackBtn.onclick = function () {
      const w = getOrCreateWellness(selectedDate);
      w.snack = !w.snack;
      saveState();
      renderWellnessAndNotes();
    };
    mealsBox.appendChild(snackBtn);

    // 4. Verres d'eau (1 à 8 cumulatif)
    const waterBox = document.getElementById("waterPillsContainer");
    const waterCount = clampRange(entry.waterGlasses || 0, 0, 8);
    document.getElementById("waterCounterBadge").textContent = `${waterCount} / 8`;
    waterBox.innerHTML = "";

    for (let n = 1; n <= 8; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `pill-btn water-pill ${n <= waterCount ? "selected" : ""}`;
      btn.textContent = `💧 ${n}`;
      btn.setAttribute("aria-label", `${n} verre${n > 1 ? "s" : ""} d'eau`);
      btn.onclick = function () {
        const w = getOrCreateWellness(selectedDate);
        const cur = clampRange(w.waterGlasses || 0, 0, 8);
        w.waterGlasses = cur === n ? n - 1 : n;
        saveState();
        renderWellnessAndNotes();
      };
      waterBox.appendChild(btn);
    }

    // 5. Petits gestes de soin & hygiène
    const careBox = document.getElementById("carePillsContainer");
    careBox.innerHTML = "";
    const activeCare = Array.isArray(entry.careIds) ? entry.careIds : [];
    state.careGestures.forEach(function (c) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `pill-btn care-pill ${activeCare.includes(c.id) ? "selected" : ""}`;
      btn.textContent = c.label;
      btn.onclick = function () {
        const w = getOrCreateWellness(selectedDate);
        if (!Array.isArray(w.careIds)) w.careIds = [];
        if (w.careIds.includes(c.id)) {
          w.careIds = w.careIds.filter(function (id) { return id !== c.id; });
        } else {
          w.careIds.push(c.id);
        }
        saveState();
        renderWellnessAndNotes();
      };
      careBox.appendChild(btn);
    });

    // 6. Bloc-notes libre (Texte & Dessin)
    document.getElementById("dayNoteInput").value = state.notesByDate[selectedDate] || "";
    if (typeof loadDayDrawing === "function") loadDayDrawing();
  }

  /* =========================================================
     9. VUE SEMAINE (LUNDI À DIMANCHE)
     ========================================================= */
  function renderWeekView() {
    const grid = document.getElementById("weekGrid");
    grid.innerHTML = "";

    const base = parseDateStr(selectedDate);
    const mondayOffset = (base.getDay() + 6) % 7;
    const startOfWeek = addDays(selectedDate, -mondayOffset);
    const todayStr = toDateStr(new Date());

    for (let i = 0; i < 7; i++) {
      const dStr = addDays(startOfWeek, i);
      const moments = getMomentsForDate(dStr);
      const tasks = Array.isArray(state.tasksByDate[dStr]) ? state.tasksByDate[dStr] : [];
      const wEntry = state.wellnessByDate[dStr];
      const mood = resolvePill("mood", wEntry);
      const sleep = resolvePill("sleep", wEntry);
      const meals = isObj(wEntry) ? clampRange(wEntry.mealsCount || 0, 0, 3) : 0;
      const snack = isObj(wEntry) ? Boolean(wEntry.snack) : false;
      const water = isObj(wEntry) ? clampRange(wEntry.waterGlasses || 0, 0, 8) : 0;

      const col = document.createElement("div");
      col.className = `week-day-col ${dStr === selectedDate ? "is-selected" : ""} ${dStr === todayStr ? "is-today" : ""}`;
      col.innerHTML = `<div class="week-day-header">${escapeHtml(formatDateShort(dStr))}</div>`;

      if (moments.length === 0 && tasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.style.fontSize = "0.82rem";
        empty.textContent = "Journée libre";
        col.appendChild(empty);
      } else {
        moments.forEach(function (m) {
          const cat = state.categories.find(function (c) { return c.id === m.categoryId; });
          const mini = document.createElement("div");
          mini.className = "week-mini-moment";
          mini.style.borderLeftColor = cat ? cat.color : "var(--accent)";
          mini.textContent = `${m.startTime} ${m.title}`;
          col.appendChild(mini);
        });
        if (tasks.length > 0) {
          const doneCount = tasks.filter(function (t) { return t.done; }).length;
          const tInfo = document.createElement("div");
          tInfo.className = "muted";
          tInfo.style.fontSize = "0.78rem";
          tInfo.textContent = `✓ ${doneCount}/${tasks.length} tâche(s)`;
          col.appendChild(tInfo);
        }
      }

      const hasNutrition = meals > 0 || water > 0 || snack;
      if (mood || sleep || hasNutrition) {
        const pillsRow = document.createElement("div");
        pillsRow.className = "week-pills-row";
        if (mood) {
          const mp = document.createElement("span");
          mp.className = "week-mini-pill mood";
          mp.textContent = `${mood.emoji} ${mood.label}`;
          pillsRow.appendChild(mp);
        }
        if (sleep) {
          const sp = document.createElement("span");
          sp.className = "week-mini-pill sleep";
          sp.textContent = `${sleep.emoji} ${sleep.label}`;
          pillsRow.appendChild(sp);
        }
        if (hasNutrition) {
          const parts = [];
          if (meals > 0) parts.push(`🍽️ ${meals}${snack ? "+🍎" : ""}`);
          else if (snack) parts.push("🍎");
          if (water > 0) parts.push(`💧 ${water}/8`);
          const np = document.createElement("span");
          np.className = "week-mini-pill nutrition";
          np.textContent = parts.join(" · ");
          pillsRow.appendChild(np);
        }
        col.appendChild(pillsRow);
      }

      col.onclick = function () {
        selectedDate = dStr;
        currentView = "day";
        renderAll();
      };
      grid.appendChild(col);
    }
  }

  /* =========================================================
     10. VUE MOIS (CALENDRIER + APERÇU DU JOUR)
     ========================================================= */
  function renderMonthView() {
    const grid = document.getElementById("monthCalendarGrid");
    const legend = document.getElementById("monthLegend");
    grid.innerHTML = "";

    const cur = parseDateStr(selectedDate);
    const year = cur.getFullYear();
    const month = cur.getMonth();
    const todayStr = toDateStr(new Date());

    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const gridStartDate = new Date(year, month, 1 - startOffset);

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(
        gridStartDate.getFullYear(),
        gridStartDate.getMonth(),
        gridStartDate.getDate() + i
      );
      const dStr = toDateStr(cellDate);
      const isOutside = cellDate.getMonth() !== month;
      const isToday = dStr === todayStr;
      const isSelected = dStr === selectedDate;

      const moments = getMomentsForDate(dStr);
      const hasMeta = hasWellnessOrTasks(dStr);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `month-cell ${isOutside ? "is-outside" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`;
      btn.setAttribute("aria-label", formatDateLong(dStr));
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");

      let dotsHtml = "";
      const maxDots = 4;
      moments.slice(0, maxDots).forEach(function (m) {
        const cat = state.categories.find(function (c) { return c.id === m.categoryId; });
        const color = cat ? cat.color : "var(--accent)";
        dotsHtml += `<span class="month-cat-dot" style="background:${escapeHtml(color)};"></span>`;
      });
      if (moments.length > maxDots) {
        dotsHtml += `<span class="month-more-plus">+</span>`;
      }

      btn.innerHTML = `
        ${hasMeta ? `<span class="month-meta-dot" title="Tâches ou notes de bien-être"></span>` : ""}
        <span class="month-day-num">${cellDate.getDate()}</span>
        <span class="month-dots-row">${dotsHtml}</span>
      `;

      btn.onclick = function () {
        selectedDate = dStr;
        renderMonthView();
        document.getElementById("currentDateLabel").textContent = formatMonthYear(selectedDate);
        const previewCard = document.getElementById("monthPreviewCard");
        if (previewCard) {
          previewCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      };

      grid.appendChild(btn);
    }

    legend.innerHTML = "";
    state.categories.forEach(function (c) {
      const item = document.createElement("span");
      item.className = "month-legend-item";
      item.innerHTML = `<span class="cat-dot" style="background:${escapeHtml(c.color)};"></span><span></span>`;
      item.querySelector("span:last-child").textContent = c.name;
      legend.appendChild(item);
    });
    const metaLegend = document.createElement("span");
    metaLegend.className = "month-legend-item";
    metaLegend.innerHTML = `<span class="cat-dot" style="background:var(--cal-meta-dot); width:6px; height:6px;"></span><span>Tâches / soin</span>`;
    legend.appendChild(metaLegend);

    renderMonthDayPreview();
  }

  function renderMonthDayPreview() {
    document.getElementById("monthPreviewTitle").textContent = formatDateLong(selectedDate);
    const box = document.getElementById("monthPreviewContent");

    const moments = getMomentsForDate(selectedDate);
    const tasks = Array.isArray(state.tasksByDate[selectedDate]) ? state.tasksByDate[selectedDate] : [];
    const wEntry = state.wellnessByDate[selectedDate];
    const mood = resolvePill("mood", wEntry);
    const sleep = resolvePill("sleep", wEntry);
    const meals = isObj(wEntry) ? clampRange(wEntry.mealsCount || 0, 0, 3) : 0;
    const snack = isObj(wEntry) ? Boolean(wEntry.snack) : false;
    const water = isObj(wEntry) ? clampRange(wEntry.waterGlasses || 0, 0, 8) : 0;

    let momentsHtml = `<span class="sub-label">Horaire</span>`;
    if (moments.length === 0) {
      momentsHtml += `<p class="muted">Aucun événement prévu à l'horaire ce jour-là.</p>`;
    } else {
      moments.forEach(function (m) {
        const cat = state.categories.find(function (c) { return c.id === m.categoryId; });
        const color = cat ? cat.color : "var(--accent)";
        const timeTxt = m.endTime ? `${m.startTime}–${m.endTime}` : (m.startTime || "");
        momentsHtml += `
          <div class="preview-moment-line">
            <span class="cat-dot" style="background:${escapeHtml(color)};"></span>
            <span class="moment-time">${escapeHtml(timeTxt)}</span>
            <strong style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(m.title)}</strong>
          </div>
        `;
      });
    }

    let rightHtml = `<span class="sub-label">Tâches du jour</span>`;
    if (tasks.length === 0) {
      rightHtml += `<p class="muted">Aucune tâche inscrite pour cette journée.</p>`;
    } else {
      const doneCount = tasks.filter(function (t) { return t.done; }).length;
      rightHtml += `<p class="muted" style="font-size:0.82rem; font-weight:700;">✓ ${doneCount} / ${tasks.length} complétée(s)</p>`;
      tasks.forEach(function (t) {
        rightHtml += `<div class="preview-task-line ${t.done ? "is-done" : ""}"><span>${t.done ? "☑" : "☐"}</span><span style="flex:1;">${escapeHtml(t.text)}</span></div>`;
      });
    }

    const wellPills = [];
    if (mood) wellPills.push(`<span class="table-pill mood">${escapeHtml(mood.emoji)} ${escapeHtml(mood.label)}</span>`);
    if (sleep) wellPills.push(`<span class="table-pill sleep">${escapeHtml(sleep.emoji)} ${escapeHtml(sleep.label)}</span>`);
    if (meals > 0 || snack) {
      wellPills.push(`<span class="table-pill meal">${meals > 0 ? `🍽️ ${meals} repas` : ""}${snack ? (meals > 0 ? " + 🍎" : "🍎 Collation") : ""}</span>`);
    }
    if (water > 0) {
      wellPills.push(`<span class="table-pill water">💧 ${water} / 8</span>`);
    }

    if (wellPills.length > 0) {
      rightHtml += `<div class="row" style="margin-top:0.35rem;">${wellPills.join("")}</div>`;
    } else {
      rightHtml += `<p class="muted" style="margin-top:0.2rem;">Aucun suivi bien-être enregistré.</p>`;
    }

    box.innerHTML = `
      <div class="preview-box">${momentsHtml}</div>
      <div class="preview-box">${rightHtml}</div>
    `;
  }

  /* =========================================================
     11. VUE RÉCAP v30 : BARRES GROUPÉES (EAU + REPAS) & COURBES
     ========================================================= */
  function renderRecapView() {
    const endStr = selectedDate;
    const startStr = addDays(endStr, -(recapDays - 1));

    document.getElementById("recapPeriodSubtitle").textContent =
      `Du ${formatDateShort(startStr)} au ${formatDateShort(endStr)} (${recapDays} jours)`;

    document.getElementById("recap7Btn").classList.toggle("primary", recapDays === 7);
    document.getElementById("recap30Btn").classList.toggle("primary", recapDays === 30);

    document.querySelectorAll("#recapLegend .legend-toggle").forEach(function (btn) {
      const key = btn.dataset.series;
      btn.classList.toggle("is-hidden", !recapSeriesVisible[key]);
    });

    const points = [];
    for (let i = 0; i < recapDays; i++) {
      const dStr = addDays(startStr, i);
      const entry = state.wellnessByDate[dStr];
      points.push({
        date: dStr,
        mood: resolvePill("mood", entry),
        sleep: resolvePill("sleep", entry),
        mealsCount: isObj(entry) ? clampRange(entry.mealsCount || 0, 0, 3) : 0,
        snack: isObj(entry) ? Boolean(entry.snack) : false,
        waterGlasses: isObj(entry) ? clampRange(entry.waterGlasses || 0, 0, 8) : 0,
        careIds: isObj(entry) && Array.isArray(entry.careIds) ? entry.careIds : []
      });
    }

    lastRecapData = { points: points, startStr: startStr, endStr: endStr, days: recapDays, stats: null, insights: [] };

    const daysWithData = points.filter(function (p) {
      return Boolean(p.mood || p.sleep || p.waterGlasses > 0 || p.mealsCount > 0);
    }).length;
    const emptyEl = document.getElementById("recapEmptyState");
    const chartWrapEl = document.getElementById("recapChartWrapper");
    const legendEl = document.getElementById("recapLegend");
    const detailEl = document.getElementById("recapDetailBox");

    if (daysWithData < 2) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      if (chartWrapEl) chartWrapEl.classList.add("hidden");
      if (legendEl) legendEl.classList.add("hidden");
      if (detailEl) detailEl.classList.add("hidden");
    } else {
      if (emptyEl) emptyEl.classList.add("hidden");
      if (chartWrapEl) chartWrapEl.classList.remove("hidden");
      if (legendEl) legendEl.classList.remove("hidden");
      if (detailEl) detailEl.classList.remove("hidden");
      drawRecapChart(points);
    }
    renderRecapStatsTableAndInsights(points);
    renderRecapMonth();
  }

  /* ---------- Export du récap en image (look doux et propre) ---------- */
  let lastRecapData = null;

  function wrapLines(ctx, text, maxWidth) {
    const words = String(text).split(" ");
    const lines = [];
    let line = "";
    words.forEach(function (w) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    showToast("Image du récap enregistrée 📤");
  }

  async function exportRecapImage() {
    const data = lastRecapData;
    if (!data || !data.stats) { showToast("Ouvre d'abord l'onglet Récap."); return; }
    const hasData = data.points.some(function (p) { return p.mood || p.sleep || p.waterGlasses > 0 || p.mealsCount > 0; });
    if (!hasData) { showToast("Rien à exporter pour l'instant : note quelques journées d'abord 🌱"); return; }
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (err) {}

    const W = 1080, PAD = 56, CW = W - PAD * 2;
    const FONT = '"Quicksand","Nunito",-apple-system,BlinkMacSystemFont,sans-serif';
    const C = {
      bg: "#FBF6F4", card: "#FFFFFF", text: "#3A2F36", muted: "#8A7C84", grid: "#EFE6E3",
      mood: "#E27BA0", sleep: "#8D89DE", water: "#BFE3EE",
      tMood: "#FDE9F0", tSleep: "#ECEBFB", tWater: "#E3F4F9", tMeal: "#FFF1DC"
    };

    const measure = document.createElement("canvas").getContext("2d");
    measure.font = "600 27px " + FONT;
    const ins = data.insights.slice(0, 6).map(function (it) {
      return { icon: it.icon, lines: wrapLines(measure, it.text, CW - 150) };
    });

    const headerH = 170;
    const tilesH = 130 * 2 + 24;
    const chartH = 470;
    let insH = 110;
    ins.forEach(function (it) { insH += Math.max(72, it.lines.length * 38 + 30) + 14; });
    const footerH = 90;
    const H = PAD + headerH + tilesH + 32 + chartH + 32 + insH + footerH;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    function card(x, y, w, h) {
      ctx.save();
      ctx.shadowColor = "rgba(120, 90, 100, 0.14)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = C.card;
      roundRectPath(ctx, x, y, w, h, 32);
      ctx.fill();
      ctx.restore();
    }

    // En-tête
    let y = PAD;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.text;
    ctx.font = "700 56px " + FONT;
    ctx.fillText("Mon récap bienveillant", PAD, y + 62);
    ctx.fillStyle = C.muted;
    ctx.font = "600 30px " + FONT;
    ctx.fillText("Du " + formatDateShort(data.startStr) + " au " + formatDateShort(data.endStr) + " (" + data.days + " jours)", PAD, y + 112);
    y += headerH;

    // Tuiles de moyennes
    const tiles = [
      { label: "État général moyen", value: data.stats.mood, bg: C.tMood },
      { label: "Sommeil moyen", value: data.stats.sleep, bg: C.tSleep },
      { label: "Verres d'eau moyens", value: "💧 " + data.stats.water, bg: C.tWater },
      { label: "Repas moyens", value: "🍽️ " + data.stats.meals, bg: C.tMeal }
    ];
    const tw = (CW - 24) / 2;
    tiles.forEach(function (t, i) {
      const tx = PAD + (i % 2) * (tw + 24);
      const ty = y + Math.floor(i / 2) * (130 + 24);
      ctx.fillStyle = t.bg;
      roundRectPath(ctx, tx, ty, tw, 130, 28);
      ctx.fill();
      ctx.fillStyle = C.muted;
      ctx.font = "600 25px " + FONT;
      ctx.fillText(t.label, tx + 32, ty + 48);
      ctx.fillStyle = C.text;
      ctx.font = "700 44px " + FONT;
      ctx.fillText(t.value, tx + 32, ty + 100);
    });
    y += tilesH + 32;

    // Graphique
    card(PAD, y, CW, chartH);
    ctx.fillStyle = C.text;
    ctx.font = "700 32px " + FONT;
    ctx.fillText("Évolution sur la période", PAD + 36, y + 30 + 28);

    const legend = [
      { color: C.mood, text: "État général (/4)" },
      { color: C.sleep, text: "Sommeil (/4)" },
      { color: C.water, text: "Verres d'eau" }
    ];
    let lx = PAD + 36;
    ctx.font = "600 23px " + FONT;
    legend.forEach(function (l) {
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.arc(lx + 9, y + 100, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.muted;
      ctx.fillText(l.text, lx + 28, y + 108);
      lx += 28 + ctx.measureText(l.text).width + 34;
    });

    const px0 = PAD + 90, px1 = PAD + CW - 50;
    const py0 = y + 150, py1 = y + chartH - 80;
    const n = data.points.length;
    const xAt = function (i) { return n === 1 ? (px0 + px1) / 2 : px0 + (px1 - px0) * (i / (n - 1)); };
    const yAt = function (v) { return py1 - (v / 4) * (py1 - py0); };

    ctx.lineWidth = 2;
    ctx.font = "600 21px " + FONT;
    for (let g = 0; g <= 4; g++) {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(px0 - 10, yAt(g));
      ctx.lineTo(px1 + 10, yAt(g));
      ctx.stroke();
      ctx.fillStyle = C.muted;
      ctx.textAlign = "right";
      ctx.fillText(String(g), px0 - 24, yAt(g) + 7);
    }
    ctx.textAlign = "left";

    // barres d'eau (8 verres = niveau 4)
    const barW = Math.max(8, Math.min(30, ((px1 - px0) / Math.max(n, 1)) * 0.55));
    data.points.forEach(function (p, i) {
      if (!(p.waterGlasses > 0)) return;
      const top = yAt(p.waterGlasses / 2);
      ctx.fillStyle = C.water;
      roundRectPath(ctx, xAt(i) - barW / 2, top, barW, py1 - top, Math.min(10, barW / 2));
      ctx.fill();
    });

    // courbes
    function drawSeries(key, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      let open = false;
      ctx.beginPath();
      data.points.forEach(function (p, i) {
        if (!p[key]) { open = false; return; }
        const px = xAt(i), py = yAt(p[key].level);
        if (open) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        open = true;
      });
      ctx.stroke();
      data.points.forEach(function (p, i) {
        if (!p[key]) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(xAt(i), yAt(p[key].level), 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    }
    drawSeries("sleep", C.sleep);
    drawSeries("mood", C.mood);

    // étiquettes des jours
    const step = n > 10 ? 5 : 1;
    ctx.fillStyle = C.muted;
    ctx.font = "600 21px " + FONT;
    ctx.textAlign = "center";
    data.points.forEach(function (p, i) {
      if (i % step === 0 || (i === n - 1 && (n - 1) % step >= 3)) {
        ctx.fillText(String(parseDateStr(p.date).getDate()), xAt(i), py1 + 40);
      }
    });
    ctx.textAlign = "left";
    y += chartH + 32;

    // Observations
    card(PAD, y, CW, insH);
    ctx.fillStyle = C.text;
    ctx.font = "700 32px " + FONT;
    ctx.fillText("Petites observations", PAD + 36, y + 62);
    let iy = y + 96;
    ins.forEach(function (it) {
      const h = Math.max(72, it.lines.length * 38 + 30);
      ctx.fillStyle = "#FAF3F1";
      roundRectPath(ctx, PAD + 28, iy, CW - 56, h, 22);
      ctx.fill();
      ctx.fillStyle = C.text;
      ctx.font = "30px " + FONT;
      ctx.fillText(it.icon, PAD + 52, iy + 46);
      ctx.font = "600 27px " + FONT;
      it.lines.forEach(function (line, k) {
        ctx.fillText(line, PAD + 112, iy + 44 + k * 38);
      });
      iy += h + 14;
    });
    y += insH;

    // Pied de page
    ctx.fillStyle = C.muted;
    ctx.font = "600 22px " + FONT;
    ctx.textAlign = "center";
    ctx.fillText("Récap généré avec Mon agenda · " + formatDateShort(toDateStr(new Date())), W / 2, y + 56);
    ctx.textAlign = "left";

    const filename = "recap-agenda-" + data.startStr + "_" + data.endStr + ".png";
    canvas.toBlob(function (blob) {
      if (!blob) { showToast("Impossible de créer l'image."); return; }
      try {
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: "Mon récap bienveillant" }).catch(function (err) {
            if (!err || err.name !== "AbortError") downloadBlob(blob, filename);
          });
          return;
        }
      } catch (err) {}
      downloadBlob(blob, filename);
    }, "image/png");
  }

  document.getElementById("recapExportBtn").onclick = exportRecapImage;

  /* ---------- Le mois en un coup d'œil ---------- */
  let recapMonthOffset = 0;         // 0 = mois de la date sélectionnée
  let recapMonthMode = "mood";      // "mood" | "sleep"

  function renderRecapMonth() {
    const grid = document.getElementById("recapMonthGrid");
    if (!grid) return;
    grid.textContent = "";

    const anchor = parseDateStr(addMonths(selectedDate, recapMonthOffset));
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7; // semaine du lundi au dimanche
    const todayStr = toDateStr(new Date());

    let monthLabel = `${month + 1}/${year}`;
    try {
      monthLabel = first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      monthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    } catch (err) {}
    document.getElementById("recapMonthLabel").textContent = monthLabel;
    document.getElementById("recapMonthMoodBtn").classList.toggle("primary", recapMonthMode === "mood");
    document.getElementById("recapMonthSleepBtn").classList.toggle("primary", recapMonthMode === "sleep");

    ["L", "M", "M", "J", "V", "S", "D"].forEach(function (d) {
      const head = document.createElement("div");
      head.className = "recap-month-weekday";
      head.setAttribute("aria-hidden", "true");
      head.textContent = d;
      grid.appendChild(head);
    });

    for (let i = 0; i < offset; i++) {
      const blank = document.createElement("div");
      grid.appendChild(blank);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = toDateStr(new Date(year, month, day));
      const pill = resolvePill(recapMonthMode, state.wellnessByDate[dStr]);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "month-cell recap-month-cell" + (dStr === todayStr ? " is-today" : "");
      if (pill) cell.setAttribute("data-level", String(pill.level));

      const num = document.createElement("span");
      num.className = "month-day-num";
      num.textContent = String(day);
      const emo = document.createElement("span");
      emo.className = "recap-month-emoji";
      emo.setAttribute("aria-hidden", "true");
      emo.textContent = pill ? (pill.emoji || "•") : "·";
      cell.appendChild(num);
      cell.appendChild(emo);

      const label = pill
        ? `${formatDateShort(dStr)} : ${pill.label} (${pill.level}/4)`
        : `${formatDateShort(dStr)} : rien noté`;
      cell.setAttribute("aria-label", label);
      cell.title = label;
      cell.onclick = function () {
        selectedDate = dStr;
        currentView = "day";
        renderAll();
      };
      grid.appendChild(cell);
    }
  }

  document.getElementById("recapMonthPrevBtn").onclick = function () { recapMonthOffset -= 1; renderRecapMonth(); };
  document.getElementById("recapMonthNextBtn").onclick = function () { recapMonthOffset += 1; renderRecapMonth(); };
  document.getElementById("recapMonthMoodBtn").onclick = function () { recapMonthMode = "mood"; renderRecapMonth(); };
  document.getElementById("recapMonthSleepBtn").onclick = function () { recapMonthMode = "sleep"; renderRecapMonth(); };

  /* Moyennes d'une période, pour comparer avec la précédente */
  function periodAverages(startStr, nDays) {
    let moodSum = 0, moodN = 0, sleepSum = 0, sleepN = 0, waterSum = 0, waterN = 0;
    for (let i = 0; i < nDays; i++) {
      const entry = state.wellnessByDate[addDays(startStr, i)];
      const mood = resolvePill("mood", entry);
      const sleep = resolvePill("sleep", entry);
      const water = isObj(entry) ? clampRange(entry.waterGlasses || 0, 0, 8) : 0;
      if (mood) { moodSum += mood.level; moodN += 1; }
      if (sleep) { sleepSum += sleep.level; sleepN += 1; }
      if (water > 0) { waterSum += water; waterN += 1; }
    }
    return {
      mood: moodN ? moodSum / moodN : null, moodN: moodN,
      sleep: sleepN ? sleepSum / sleepN : null, sleepN: sleepN,
      water: waterN ? waterSum / waterN : null, waterN: waterN
    };
  }

  /* Repères de tendance, formulés sans jugement ni pression */
  function buildTrendInsights(points) {
    const out = [];
    if (!points.length) return out;
    const startStr = points[0].date;
    const cur = periodAverages(startStr, points.length);
    const prev = periodAverages(addDays(startStr, -points.length), points.length);
    const MIN_DAYS = 3;
    const fmt = function (x) { return Math.abs(x).toFixed(1).replace(".", ","); };

    if (cur.moodN >= MIN_DAYS && prev.moodN >= MIN_DAYS) {
      const diff = cur.mood - prev.mood;
      let text;
      if (diff >= 0.5) text = `Ton état général est un peu plus élevé que sur la période précédente (+${fmt(diff)}). Une petite éclaircie 🌤️`;
      else if (diff <= -0.5) text = `Ton état général est un peu plus bas que sur la période précédente (−${fmt(diff)}). Les hauts et les bas font partie du chemin : doucement avec toi 🤍`;
      else text = "Ton état général reste assez stable par rapport à la période précédente.";
      out.push({ cls: "insight-1", icon: "📈", text: text });
    }
    if (cur.sleepN >= MIN_DAYS && prev.sleepN >= MIN_DAYS) {
      const diff = cur.sleep - prev.sleep;
      let text;
      if (diff >= 0.5) text = `Ton sommeil est un peu meilleur que sur la période précédente (+${fmt(diff)}) 🌙`;
      else if (diff <= -0.5) text = `Ton sommeil est un peu plus agité que sur la période précédente (−${fmt(diff)}). Ça arrive : tu peux simplement l'observer, sans te juger 🌙`;
      else text = "Ton sommeil reste assez stable par rapport à la période précédente.";
      out.push({ cls: "insight-2", icon: "🌙", text: text });
    }
    if (cur.waterN >= MIN_DAYS && prev.waterN >= MIN_DAYS) {
      const diff = cur.water - prev.water;
      if (diff >= 1.5) out.push({ cls: "insight-3", icon: "💧", text: `Tu notes plus de verres d'eau que sur la période précédente (+${fmt(diff)} par jour en moyenne) 💧` });
      else if (diff <= -1.5) out.push({ cls: "insight-3", icon: "💧", text: `Tu notes un peu moins de verres d'eau que sur la période précédente (−${fmt(diff)} par jour en moyenne). Sans pression : une gorgée à la fois 💧` });
    }
    return out;
  }

  function drawRecapChart(points) {
    const svg = document.getElementById("recapChartSvg");
    const wrapper = document.getElementById("recapChartWrapper");
    const detailBox = document.getElementById("recapDetailBox");

    const containerWidth = wrapper ? Math.max(300, Math.floor(wrapper.clientWidth - 12)) : 600;
    const W = containerWidth;
    const H = 265;
    const padL = 48;
    const padR = 20;
    const padT = 26;
    const padB = 38;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    // Marges latérales internes pour que les barres du premier et dernier jour ne soient jamais coupées
    const slotW = plotW / Math.max(points.length, 1);
    const xFor = function (idx) {
      return padL + (idx + 0.5) * slotW;
    };
    const yFor = function (val) {
      return padT + ((4 - val) / 4) * plotH;
    };
    const baseY = yFor(0);

    let html = "";

    // Ligne de base 0
    html += `<line x1="${padL}" y1="${baseY}" x2="${W - padR}" y2="${baseY}" stroke="var(--border-subtle)" stroke-width="1.2" />`;

    // Lignes horizontales et repères 4/4, 3/4, 2/4, 1/4 en Nunito gras 13px
    for (let lvl = 1; lvl <= 4; lvl++) {
      const y = yFor(lvl);
      html += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--border-subtle)" stroke-dasharray="4 4" />`;
      html += `<text x="${padL - 10}" y="${y + 4}" text-anchor="end" font-family="Nunito, sans-serif" font-size="13" font-weight="700" fill="var(--text)">${lvl}/4</text>`;
    }

    // Placement intelligent des barres Eau et Repas :
    // - Si les 2 séries sont actives : côte à côte (Eau à gauche, Repas à droite du centre du jour)
    // - Si 1 seule série de barres est active : centrée sur l'axe du jour
    const showWater = recapSeriesVisible.water;
    const showMeals = recapSeriesVisible.meals;
    const bothBars = showWater && showMeals;
    const barGap = points.length > 10 ? 1.5 : 3;
    const maxSingleBarW = points.length > 10 ? 10 : 24;
    const maxGroupedBarW = points.length > 10 ? 5.5 : 16;

    const barW = bothBars
      ? Math.min(maxGroupedBarW, Math.max(3, (slotW * 0.72 - barGap) / 2))
      : Math.min(maxSingleBarW, Math.max(4, slotW * 0.48));
    const barRadius = barW >= 8 ? 4 : 2;

    // Dessin des barres Verres d'eau (0–8 ramené sur 0–4) et Repas (0–3 ramené sur 0–4)
    points.forEach(function (pt, idx) {
      const cx = xFor(idx);

      // 1. Barres Verres d'eau (eau / 2 -> 0..4)
      if (showWater && pt.waterGlasses > 0) {
        const scaledWater = pt.waterGlasses / 2;
        const yTop = yFor(scaledWater);
        const h = Math.max(3, baseY - yTop);
        const xBar = bothBars ? (cx - barGap / 2 - barW) : (cx - barW / 2);
        html += `<rect x="${xBar.toFixed(1)}" y="${yTop.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="${barRadius}" fill="var(--water-bar)" stroke="var(--water-bar-stroke)" stroke-width="1.2" />`;
      }

      // 2. Barres Repas (repas * 4/3 -> 0..4, pour que 3 repas = pleine hauteur 4/4)
      if (showMeals) {
        const xBar = bothBars ? (cx + barGap / 2) : (cx - barW / 2);
        const mealCenterX = xBar + barW / 2;

        if (pt.mealsCount > 0) {
          const scaledMeals = pt.mealsCount * (4 / 3);
          const yTop = yFor(scaledMeals);
          const h = Math.max(3, baseY - yTop);
          html += `<rect x="${xBar.toFixed(1)}" y="${yTop.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="${barRadius}" fill="var(--meal-bar)" stroke="var(--meal-bar-stroke)" stroke-width="1.2" />`;

          // Petit repère discret au-dessus de la barre Repas si une collation est cochée
          if (pt.snack) {
            const dotY = Math.max(8, yTop - 6);
            html += `<circle cx="${mealCenterX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="2.8" fill="var(--meal-bar-stroke)" stroke="var(--surface)" stroke-width="1.2" />`;
          }
        } else if (pt.snack) {
          // Si seule la collation a été cochée sans repas principal
          html += `<circle cx="${mealCenterX.toFixed(1)}" cy="${(baseY - 6).toFixed(1)}" r="3" fill="var(--meal-bar-stroke)" stroke="var(--surface)" stroke-width="1.2" />`;
        }
      }
    });

    function buildPath(getVal) {
      let d = "";
      let started = false;
      points.forEach(function (pt, idx) {
        const val = getVal(pt);
        if (val !== null && val !== undefined) {
          const x = xFor(idx);
          const y = yFor(val);
          d += `${started ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)} `;
          started = true;
        } else {
          started = false;
        }
      });
      return d;
    }

    // Courbe continue Sommeil
    if (recapSeriesVisible.sleep) {
      const sleepPath = buildPath(function (pt) { return pt.sleep ? pt.sleep.level : null; });
      if (sleepPath) {
        html += `<path d="${sleepPath}" fill="none" stroke="var(--sleep-line)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
      }
    }

    // Courbe continue État général
    if (recapSeriesVisible.mood) {
      const moodPath = buildPath(function (pt) { return pt.mood ? pt.mood.level : null; });
      if (moodPath) {
        html += `<path d="${moodPath}" fill="none" stroke="var(--mood-line)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
      }
    }

    // Points des courbes, étiquettes de dates et zones interactives
    const labelStep = points.length > 10 ? Math.max(5, Math.ceil(points.length / 6)) : 1;
    points.forEach(function (pt, idx) {
      const x = xFor(idx);

      if (idx % labelStep === 0 || idx === points.length - 1) {
        const shortLbl = pt.date.slice(5).split("-").reverse().join("/");
        html += `<text x="${x.toFixed(1)}" y="${H - 12}" text-anchor="middle" font-family="Nunito, sans-serif" font-size="11" font-weight="600" fill="var(--text-muted)">${shortLbl}</text>`;
      }

      if (recapSeriesVisible.sleep && pt.sleep) {
        const y = yFor(pt.sleep.level);
        html += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="var(--sleep-line)" stroke="var(--surface)" stroke-width="2" />`;
      }

      if (recapSeriesVisible.mood && pt.mood) {
        const y = yFor(pt.mood.level);
        html += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="var(--mood-line)" stroke="var(--surface)" stroke-width="2" />`;
      }

      const hitW = Math.max(16, slotW);
      html += `<rect x="${(x - hitW / 2).toFixed(1)}" y="${padT}" width="${hitW.toFixed(1)}" height="${plotH}" fill="transparent" style="cursor:pointer;" data-day-idx="${idx}" />`;
    });

    svg.innerHTML = html;

    function showDetail(idx) {
      const pt = points[idx];
      const moodTxt = pt.mood
        ? `${escapeHtml(pt.mood.emoji)} ${escapeHtml(pt.mood.label)} (${pt.mood.level}/4)`
        : "Non noté";
      const sleepTxt = pt.sleep
        ? `${escapeHtml(pt.sleep.emoji)} ${escapeHtml(pt.sleep.label)} (${pt.sleep.level}/4)`
        : "Non noté";
      const mealTxt = pt.mealsCount > 0 ? `🍽️ ${pt.mealsCount} repas` : "Non noté";
      const snackTxt = pt.snack ? " · 🍎 Collation" : "";
      const waterTxt = `💧 ${pt.waterGlasses} / 8`;

      const careLabels = pt.careIds
        .map(function (id) {
          const found = state.careGestures.find(function (c) { return c.id === id; });
          return found ? found.label : null;
        })
        .filter(Boolean);
      const careTxt = careLabels.length > 0 ? careLabels.map(escapeHtml).join(", ") : "Aucun geste coché";

      detailBox.innerHTML = `
        <strong>${escapeHtml(formatDateLong(pt.date))}</strong><br/>
        <strong>État général :</strong> ${moodTxt} &nbsp;|&nbsp; <strong>Sommeil :</strong> ${sleepTxt}<br/>
        <strong>Repas :</strong> ${mealTxt}${snackTxt} &nbsp;|&nbsp; <strong>Eau :</strong> ${waterTxt}<br/>
        <strong>Petits gestes de soin :</strong> ${careTxt}
      `;
    }

    svg.querySelectorAll("rect[data-day-idx]").forEach(function (rect) {
      const idx = Number(rect.dataset.dayIdx);
      rect.addEventListener("mouseenter", function () { showDetail(idx); });
      rect.addEventListener("click", function () { showDetail(idx); });
    });
  }

  function renderRecapStatsTableAndInsights(points) {
    const statsGrid = document.getElementById("recapStatsGrid");
    const tableBody = document.getElementById("recapTableBody");
    const list = document.getElementById("recapObservations");

    const moodPts = points.filter(function (p) { return !!p.mood; });
    const sleepPts = points.filter(function (p) { return !!p.sleep; });
    const waterPts = points.filter(function (p) { return p.waterGlasses > 0; });
    const mealPts = points.filter(function (p) { return p.mealsCount > 0; });
    const snackDays = points.filter(function (p) { return p.snack; }).length;

    const avgMood = moodPts.length > 0
      ? `${(moodPts.reduce(function (s, p) { return s + p.mood.level; }, 0) / moodPts.length).toFixed(1)} / 4`
      : "—";
    const avgSleep = sleepPts.length > 0
      ? `${(sleepPts.reduce(function (s, p) { return s + p.sleep.level; }, 0) / sleepPts.length).toFixed(1)} / 4`
      : "—";
    const avgWater = waterPts.length > 0
      ? `${(waterPts.reduce(function (s, p) { return s + p.waterGlasses; }, 0) / waterPts.length).toFixed(1)} / 8`
      : "—";
    const avgMeals = mealPts.length > 0
      ? `${(mealPts.reduce(function (s, p) { return s + p.mealsCount; }, 0) / mealPts.length).toFixed(1)} / jour`
      : "—";

    statsGrid.innerHTML = `
      <div class="stat-tile">
        <span class="stat-label">État général moyen</span>
        <span class="stat-value">${avgMood}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">Sommeil moyen</span>
        <span class="stat-value">${avgSleep}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">Verres d'eau moyens</span>
        <span class="stat-value">💧 ${avgWater}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">Repas moyens</span>
        <span class="stat-value">🍽️ ${avgMeals}</span>
      </div>
    `;

    tableBody.innerHTML = "";
    points.slice().reverse().forEach(function (pt) {
      const tr = document.createElement("tr");
      const moodCell = pt.mood
        ? `<span class="table-pill mood">${escapeHtml(pt.mood.emoji)} ${pt.mood.level}/4</span>`
        : `<span class="muted">—</span>`;
      const sleepCell = pt.sleep
        ? `<span class="table-pill sleep">${escapeHtml(pt.sleep.emoji)} ${pt.sleep.level}/4</span>`
        : `<span class="muted">—</span>`;
      const mealCell = (pt.mealsCount > 0 || pt.snack)
        ? `<span class="table-pill meal">${pt.mealsCount > 0 ? `🍽️ ${pt.mealsCount}` : ""}${pt.snack ? (pt.mealsCount > 0 ? " + 🍎" : "🍎") : ""}</span>`
        : `<span class="muted">—</span>`;
      const waterCell = pt.waterGlasses > 0
        ? `<span class="table-pill water">💧 ${pt.waterGlasses}/8</span>`
        : `<span class="muted">—</span>`;

      tr.innerHTML = `
        <td><strong>${escapeHtml(formatDateShort(pt.date))}</strong></td>
        <td>${moodCell}</td>
        <td>${sleepCell}</td>
        <td>${mealCell}</td>
        <td>${waterCell}</td>
      `;

      tr.onclick = function () {
        selectedDate = pt.date;
        currentView = "day";
        renderAll();
      };
      tableBody.appendChild(tr);
    });

    list.innerHTML = "";
    const insights = [];

    if (moodPts.length === 0 && sleepPts.length === 0 && waterPts.length === 0 && mealPts.length === 0) {
      insights.push({
        cls: "insight-1",
        icon: "🌱",
        text: "Aucune pastille n'a encore été cochée sur cette période. Dès que tu prendras un petit moment dans la vue Jour, tes statistiques et onglets colorés s'animeront en douceur."
      });
    } else {
      insights.push({
        cls: "insight-1",
        icon: "📊",
        text: `Sur cette période, tu as noté ton état général ${moodPts.length} jour(s), ton sommeil ${sleepPts.length} jour(s) et ton hydratation ${waterPts.length} jour(s).`
      });

      if (waterPts.length > 0) {
        insights.push({
          cls: "insight-2",
          icon: "💧",
          text: `Les jours où tu as suivi ton hydratation, tu as bu en moyenne ${avgWater} verres d'eau.`
        });
      } else {
        insights.push({
          cls: "insight-2",
          icon: "💧",
          text: "Aucun verre d'eau noté sur cette période : tu peux cocher les pastilles 💧 dans la vue Jour dès que tu en as envie."
        });
      }

      if (mealPts.length > 0 || snackDays > 0) {
        const snackInfo = snackDays > 0 ? ` (avec ${snackDays} jour(s) incluant une 🍎 collation)` : "";
        insights.push({
          cls: "insight-3",
          icon: "🍽️",
          text: `Tu as noté tes repas ${mealPts.length} jour(s)${mealPts.length > 0 ? `, pour une moyenne de ${avgMeals}` : ""}${snackInfo}.`
        });
      } else {
        insights.push({
          cls: "insight-3",
          icon: "🍽️",
          text: "Aucun repas enregistré sur cette période — les pastilles 🍽️ sont là sans pression quand tu souhaites les utiliser."
        });
      }

      const careCounts = new Map();
      let totalCareChecks = 0;
      points.forEach(function (pt) {
        pt.careIds.forEach(function (id) {
          totalCareChecks += 1;
          careCounts.set(id, (careCounts.get(id) || 0) + 1);
        });
      });

      if (totalCareChecks > 0) {
        let topId = null;
        let topCount = 0;
        careCounts.forEach(function (cnt, id) {
          if (cnt > topCount) {
            topCount = cnt;
            topId = id;
          }
        });
        const topGesture = state.careGestures.find(function (c) { return c.id === topId; });
        const favTxt = topGesture ? ` Ton geste préféré : ${topGesture.label} (${topCount} fois).` : "";
        insights.push({
          cls: "insight-4",
          icon: "🌿",
          text: `Tu t'es offert ${totalCareChecks} petit(s) geste(s) de soin et d'hygiène sur cette période.${favTxt}`
        });
      }
    }

    if (moodPts.length > 0 || sleepPts.length > 0 || waterPts.length > 0 || mealPts.length > 0) {
      buildTrendInsights(points).forEach(function (t) { insights.push(t); });
    }

    if (lastRecapData) {
      lastRecapData.stats = { mood: avgMood, sleep: avgSleep, water: avgWater, meals: avgMeals };
      lastRecapData.insights = insights.map(function (i) { return { icon: i.icon, text: i.text }; });
    }

    insights.forEach(function (item) {
      const li = document.createElement("li");
      li.className = `insight-card ${item.cls}`;
      li.innerHTML = `<span class="insight-icon" aria-hidden="true">${item.icon}</span><span></span>`;
      li.querySelector("span:last-child").textContent = item.text;
      list.appendChild(li);
    });
  }

  /* =========================================================
     12. PAGE PARAMÈTRES
     ========================================================= */
  function renderSettings() {
    applyTheme();
    document.getElementById("ownerNameInput").value = state.ownerName || "";
    const dvSel = document.getElementById("defaultViewSelect");
    if (dvSel) dvSel.value = state.defaultView === "month" ? "month" : "day";
    syncRemindersUi();
    if (typeof updateBackupReminder === "function") updateBackupReminder();

    const moodsList = document.getElementById("settingsMoodsList");
    moodsList.innerHTML = "";
    state.moodPills.forEach(function (p) {
      const row = document.createElement("div");
      row.className = "pill-setting-row";
      row.innerHTML = `
        <div class="row">
          <span>${escapeHtml(p.emoji)} ${escapeHtml(p.label)}</span>
          <span class="level-badge">${clampLevel(p.level)}/4</span>
        </div>
        <button type="button" class="sm danger" aria-label="Supprimer">✕</button>
      `;
      row.querySelector(".danger").onclick = function () {
        const undoSnap = snapshotState();
        state.moodPills = state.moodPills.filter(function (x) { return x.id !== p.id; });
        saveState();
        renderSettings();
        offerUndo("Supprimé.", undoSnap);
      };
      moodsList.appendChild(row);
    });

    const sleepsList = document.getElementById("settingsSleepsList");
    sleepsList.innerHTML = "";
    state.sleepPills.forEach(function (p) {
      const row = document.createElement("div");
      row.className = "pill-setting-row";
      row.innerHTML = `
        <div class="row">
          <span>${escapeHtml(p.emoji)} ${escapeHtml(p.label)}</span>
          <span class="level-badge">${clampLevel(p.level)}/4</span>
        </div>
        <button type="button" class="sm danger" aria-label="Supprimer">✕</button>
      `;
      row.querySelector(".danger").onclick = function () {
        const undoSnap = snapshotState();
        state.sleepPills = state.sleepPills.filter(function (x) { return x.id !== p.id; });
        saveState();
        renderSettings();
        offerUndo("Supprimé.", undoSnap);
      };
      sleepsList.appendChild(row);
    });

    const catList = document.getElementById("settingsCategoriesList");
    catList.innerHTML = "";
    state.categories.forEach(function (c) {
      const row = document.createElement("div");
      row.className = "pill-setting-row";
      row.innerHTML = `
        <div class="row">
          <span class="cat-dot" style="background:${escapeHtml(c.color)}; width:13px; height:13px;"></span>
          <span></span>
        </div>
        <button type="button" class="sm danger" aria-label="Supprimer">✕</button>
      `;
      row.querySelector("span:last-child").textContent = c.name;
      row.querySelector(".danger").onclick = function () {
        const undoSnap = snapshotState();
        if (state.categories.length <= 1) {
          showToast("Garde au moins une catégorie.");
          return;
        }
        state.categories = state.categories.filter(function (x) { return x.id !== c.id; });
        saveState();
        renderSettings();
        offerUndo("Supprimé.", undoSnap);
      };
      catList.appendChild(row);
    });

    const careList = document.getElementById("settingsCareList");
    careList.innerHTML = "";
    state.careGestures.forEach(function (c) {
      const row = document.createElement("div");
      row.className = "pill-setting-row";
      row.innerHTML = `
        <span>${escapeHtml(c.label)}</span>
        <button type="button" class="sm danger" aria-label="Supprimer">✕</button>
      `;
      row.querySelector(".danger").onclick = function () {
        const undoSnap = snapshotState();
        state.careGestures = state.careGestures.filter(function (x) { return x.id !== c.id; });
        saveState();
        renderSettings();
        offerUndo("Supprimé.", undoSnap);
      };
      careList.appendChild(row);
    });

    document.getElementById("quotesCountLabel").textContent = `${state.quotes.length} phrase(s)`;
    const quotesList = document.getElementById("settingsQuotesList");
    quotesList.innerHTML = "";
    state.quotes.forEach(function (q, idx) {
      const row = document.createElement("div");
      row.className = "pill-setting-row";
      row.innerHTML = `
        <span style="flex:1; font-size:0.88rem;"></span>
        <button type="button" class="sm danger" aria-label="Supprimer">✕</button>
      `;
      row.querySelector("span").textContent = q;
      row.querySelector(".danger").onclick = function () {
        const undoSnap = snapshotState();
        state.quotes.splice(idx, 1);
        saveState();
        renderSettings();
        renderQuote();
        offerUndo("Supprimé.", undoSnap);
      };
      quotesList.appendChild(row);
    });
  }

  /* =========================================================
     13. RENDU GLOBAL & ÉVÉNEMENTS
     ========================================================= */
  function renderDateHeader() {
    const label = document.getElementById("currentDateLabel");
    if (currentView === "month") {
      label.textContent = formatMonthYear(selectedDate);
    } else if (currentView === "week") {
      label.textContent = formatWeekRange(selectedDate);
    } else {
      label.textContent = formatDateLong(selectedDate);
    }
  }

  function renderAll() {
    renderOwnerTitle();
    applyTheme();
    renderQuote();

    document.getElementById("navAgendaBtn").classList.toggle("active", currentPage === "agenda");
    document.getElementById("navSettingsBtn").classList.toggle("active", currentPage === "settings");
    document.getElementById("agendaPage").classList.toggle("hidden", currentPage !== "agenda");
    document.getElementById("fabAddMomentBtn").classList.toggle("hidden", currentPage !== "agenda");
    document.getElementById("settingsPage").classList.toggle("hidden", currentPage !== "settings");

    if (currentPage === "settings") {
      renderSettings();
      return;
    }

    renderDateHeader();

    document.getElementById("viewDayBtn").classList.toggle("active", currentView === "day");
    document.getElementById("viewWeekBtn").classList.toggle("active", currentView === "week");
    document.getElementById("viewMonthBtn").classList.toggle("active", currentView === "month");
    document.getElementById("viewRecapBtn").classList.toggle("active", currentView === "recap");

    document.getElementById("dayView").classList.toggle("hidden", currentView !== "day");
    document.getElementById("weekView").classList.toggle("hidden", currentView !== "week");
    document.getElementById("monthView").classList.toggle("hidden", currentView !== "month");
    document.getElementById("recapView").classList.toggle("hidden", currentView !== "recap");

    if (currentView === "day") {
      renderMoments();
      renderTasksAndRoutines();
      renderWellnessAndNotes();
    } else if (currentView === "week") {
      renderWeekView();
    } else if (currentView === "month") {
      renderMonthView();
    } else if (currentView === "recap") {
      renderRecapView();
    }
  }

  // Navigation principale
  /* =========================================================
     RECHERCHE (moments, notes du jour, tâches)
     ========================================================= */
  // Version « sans accents, en minuscules » d'un texte, avec la correspondance
  // des positions pour pouvoir surligner le texte d'origine.
  function foldWithMap(str) {
    let folded = "";
    const map = [];
    for (let i = 0; i < str.length; i++) {
      const piece = str[i].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      for (let k = 0; k < piece.length; k++) {
        folded += piece[k];
        map.push(i);
      }
    }
    return { folded: folded, map: map };
  }

  function findMatch(text, foldedQuery) {
    const f = foldWithMap(text);
    const idx = f.folded.indexOf(foldedQuery);
    if (idx < 0) return null;
    const start = f.map[idx];
    const end = f.map[idx + foldedQuery.length - 1] + 1;
    return { start: start, end: end };
  }

  // Extrait autour du mot trouvé, avec le mot surligné (construit sans innerHTML).
  function buildSnippet(text, match) {
    const single = text.replace(/\s+/g, " ");
    // recalcul des positions sur le texte aux espaces normalisés
    const prefixLen = text.slice(0, match.start).replace(/\s+/g, " ").length;
    const matchLen = text.slice(match.start, match.end).replace(/\s+/g, " ").length;
    const from = Math.max(0, prefixLen - 40);
    const to = Math.min(single.length, prefixLen + matchLen + 60);
    const frag = document.createDocumentFragment();
    if (from > 0) frag.appendChild(document.createTextNode("… "));
    frag.appendChild(document.createTextNode(single.slice(from, prefixLen)));
    const mark = document.createElement("mark");
    mark.textContent = single.slice(prefixLen, prefixLen + matchLen);
    frag.appendChild(mark);
    frag.appendChild(document.createTextNode(single.slice(prefixLen + matchLen, to)));
    if (to < single.length) frag.appendChild(document.createTextNode(" …"));
    return frag;
  }

  function runSearch(rawQuery) {
    const resultsEl = document.getElementById("searchResults");
    const hintEl = document.getElementById("searchHint");
    resultsEl.textContent = "";
    const q = foldWithMap(rawQuery.trim()).folded;
    if (q.length < 2) {
      hintEl.textContent = "Tape au moins 2 lettres. La recherche ignore les accents et les majuscules.";
      return;
    }

    const found = [];
    (state.moments || []).forEach(function (m) {
      const title = m.title || "";
      const note = m.note || "";
      const inTitle = findMatch(title, q);
      const inNote = inTitle ? null : findMatch(note, q);
      if (!inTitle && !inNote) return;
      const when = m.endTime ? `${m.startTime}–${m.endTime}` : (m.startTime || "");
      const repeat = m.recurrence && m.recurrence !== "none" ? " · répété" : "";
      found.push({
        icon: "🗓️", date: m.date, text: inTitle ? title : note, match: inTitle || inNote,
        sub: when + repeat
      });
    });
    Object.keys(state.notesByDate || {}).forEach(function (d) {
      const text = state.notesByDate[d] || "";
      const mt = findMatch(text, q);
      if (mt) found.push({ icon: "📝", date: d, text: text, match: mt, sub: "Note du jour" });
    });
    Object.keys(state.tasksByDate || {}).forEach(function (d) {
      (state.tasksByDate[d] || []).forEach(function (t) {
        const mt = findMatch(t.text || "", q);
        if (mt) found.push({ icon: t.done ? "✅" : "☑️", date: d, text: t.text, match: mt, sub: t.done ? "Tâche faite" : "Tâche" });
      });
    });

    found.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });

    if (found.length === 0) {
      hintEl.textContent = "Aucun résultat. Essaie un autre mot ✨";
      return;
    }
    const LIMIT = 50;
    hintEl.textContent = found.length === 1 ? "1 résultat" : `${found.length} résultats` + (found.length > LIMIT ? ` (les ${LIMIT} plus récents affichés)` : "");

    found.slice(0, LIMIT).forEach(function (r) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result";
      btn.setAttribute("role", "listitem");

      const head = document.createElement("div");
      head.className = "search-result-head";
      let dateLabel = r.date;
      try {
        dateLabel = parseDateStr(r.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      } catch (err) {}
      head.textContent = `${r.icon} ${dateLabel}` + (r.sub ? ` · ${r.sub}` : "");

      const body = document.createElement("div");
      body.className = "search-result-body";
      body.appendChild(buildSnippet(r.text, r.match));

      btn.appendChild(head);
      btn.appendChild(body);
      btn.onclick = function () {
        closeSearchModal();
        selectedDate = r.date;
        currentView = "day";
        currentPage = "agenda";
        renderAll();
      };
      resultsEl.appendChild(btn);
    });
  }

  function openSearchModal() {
    document.getElementById("searchModal").classList.remove("hidden");
    const input = document.getElementById("searchInput");
    setTimeout(function () { input.focus(); input.select(); }, 50);
    runSearch(input.value);
  }
  function closeSearchModal() {
    document.getElementById("searchModal").classList.add("hidden");
  }
  let searchTimer = null;
  document.getElementById("searchInput").addEventListener("input", function (e) {
    clearTimeout(searchTimer);
    const value = e.target.value;
    searchTimer = setTimeout(function () { runSearch(value); }, 150);
  });
  document.getElementById("navSearchBtn").onclick = openSearchModal;
  document.getElementById("closeSearchModalBtn").onclick = closeSearchModal;
  document.getElementById("searchModal").addEventListener("click", function (e) {
    if (e.target === this) closeSearchModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSearchModal();
  });

  document.getElementById("navAgendaBtn").onclick = function () { currentPage = "agenda"; renderAll(); };
  document.getElementById("navSettingsBtn").onclick = function () { currentPage = "settings"; renderAll(); };

  // Citation
  document.getElementById("nextQuoteBtn").onclick = function () {
    const len = state.quotes.length;
    if (len <= 1) return;
    const baseIdx = manualQuoteIndex !== null ? manualQuoteIndex : (parseDateStr(selectedDate).getDate() - 1) % len;
    manualQuoteIndex = (baseIdx + 1) % len;
    renderQuote();
  };

  // Date & Vues (Jour / Semaine / Mois / Récap)
  document.getElementById("todayBtn").onclick = function () {
    selectedDate = toDateStr(new Date());
    manualQuoteIndex = null;
    renderAll();
  };
  document.getElementById("prevDateBtn").onclick = function () {
    if (currentView === "month") {
      selectedDate = addMonths(selectedDate, -1);
    } else if (currentView === "week") {
      selectedDate = addDays(selectedDate, -7);
    } else {
      selectedDate = addDays(selectedDate, -1);
    }
    manualQuoteIndex = null;
    renderAll();
  };
  document.getElementById("nextDateBtn").onclick = function () {
    if (currentView === "month") {
      selectedDate = addMonths(selectedDate, 1);
    } else if (currentView === "week") {
      selectedDate = addDays(selectedDate, 7);
    } else {
      selectedDate = addDays(selectedDate, 1);
    }
    manualQuoteIndex = null;
    renderAll();
  };

  document.getElementById("viewDayBtn").onclick = function () { currentView = "day"; renderAll(); };
  document.getElementById("viewWeekBtn").onclick = function () { currentView = "week"; renderAll(); };
  document.getElementById("viewMonthBtn").onclick = function () { currentView = "month"; renderAll(); };
  document.getElementById("viewRecapBtn").onclick = function () { currentView = "recap"; renderAll(); };

  document.getElementById("recap7Btn").onclick = function () { recapDays = 7; renderRecapView(); };
  document.getElementById("recap30Btn").onclick = function () { recapDays = 30; renderRecapView(); };

  // Boutons de la carte d'aperçu en vue Mois
  document.getElementById("monthOpenDayBtn").onclick = function () {
    currentView = "day";
    renderAll();
  };
  document.getElementById("monthAddMomentBtn").onclick = function () {
    openMomentModal(null, selectedDate);
  };

  // Légende interactive du graphique Récap
  document.querySelectorAll("#recapLegend .legend-toggle").forEach(function (btn) {
    btn.onclick = function () {
      const key = btn.dataset.series;
      recapSeriesVisible[key] = !recapSeriesVisible[key];
      renderRecapView();
    };
  });

  // Modale Horaire
  document.getElementById("openAddMomentBtn").onclick = function () { openMomentModal(null, selectedDate); };
  document.getElementById("closeMomentModalBtn").onclick = function () {
    document.getElementById("momentModal").classList.add("hidden");
  };
  document.getElementById("cancelMomentBtn").onclick = function () {
    document.getElementById("momentModal").classList.add("hidden");
  };
  document.getElementById("momentModal").addEventListener("click", function (e) {
    if (e.target === this) this.classList.add("hidden");
  });
  document.getElementById("momentForm").onsubmit = function (e) {
    e.preventDefault();
    const id = document.getElementById("momentIdInput").value;
    const existing = id ? state.moments.find(function (m) { return m.id === id; }) : null;
    const payload = {
      id: id || uid("mom"),
      title: document.getElementById("momentTitleInput").value.trim(),
      date: document.getElementById("momentDateInput").value,
      startTime: document.getElementById("momentStartInput").value,
      endTime: document.getElementById("momentEndInput").value,
      categoryId: document.getElementById("momentCategoryInput").value,
      recurrence: document.getElementById("momentRecurrenceInput").value,
      recurrenceEnd: existing && existing.recurrenceEnd ? existing.recurrenceEnd : "",
      excludedDates: existing && Array.isArray(existing.excludedDates) ? existing.excludedDates : [],
      note: document.getElementById("momentNoteInput").value.trim()
    };
    if (id) {
      state.moments = state.moments.map(function (m) { return m.id === id ? payload : m; });
      showToast("Moment modifié.");
    } else {
      state.moments.push(payload);
      showToast("Moment ajouté à l'horaire.");
    }
    saveState();
    document.getElementById("momentModal").classList.add("hidden");
    renderAll();
  };

  // Formulaires Jour
  document.getElementById("todayTaskForm").onsubmit = function (e) {
    e.preventDefault();
    const input = document.getElementById("todayTaskInput");
    const text = input.value.trim();
    if (!text) return;
    if (!Array.isArray(state.tasksByDate[selectedDate])) state.tasksByDate[selectedDate] = [];
    state.tasksByDate[selectedDate].push({ id: uid("task"), text: text, done: false });
    input.value = "";
    saveState();
    renderTasksAndRoutines();
  };

  document.getElementById("dumpForm").onsubmit = function (e) {
    e.preventDefault();
    const input = document.getElementById("dumpInput");
    const text = input.value.trim();
    if (!text) return;
    state.dumpItems.unshift({ id: uid("dump"), text: text });
    input.value = "";
    saveState();
    renderTasksAndRoutines();
  };

  document.getElementById("routineForm").onsubmit = function (e) {
    e.preventDefault();
    const input = document.getElementById("routineInput");
    const text = input.value.trim();
    if (!text) return;
    state.routines.push({ id: uid("rout"), text: text });
    input.value = "";
    saveState();
    renderTasksAndRoutines();
  };

  // Sauvegarde auto : Bloc-notes libre
  document.getElementById("dayNoteInput").addEventListener("input", function (e) {
    state.notesByDate[selectedDate] = e.target.value;
    saveState();
    const badge = document.getElementById("noteSavedBadge");
    badge.classList.add("visible");
    clearTimeout(noteSavedTimer);
    noteSavedTimer = setTimeout(function () { badge.classList.remove("visible"); }, 1500);
  });

  // Paramètres : Nom
  document.getElementById("ownerNameInput").addEventListener("input", function (e) {
    state.ownerName = e.target.value;
    saveState();
    renderOwnerTitle();
  });
  document.getElementById("clearOwnerNameBtn").onclick = function () {
    state.ownerName = "";
    document.getElementById("ownerNameInput").value = "";
    saveState();
    renderOwnerTitle();
  };

  // Paramètres : Thèmes
  document.querySelectorAll(".theme-btn").forEach(function (btn) {
    btn.onclick = function () {
      state.theme = btn.dataset.themeChoice;
      saveState();
      applyTheme();
    };
  });

  // Paramètres : Pastilles, Catégories & Phrases
  document.getElementById("addMoodForm").onsubmit = function (e) {
    e.preventDefault();
    state.moodPills.push({
      id: uid("mood"),
      emoji: document.getElementById("newMoodEmoji").value.trim() || "✨",
      label: document.getElementById("newMoodLabel").value.trim(),
      level: clampLevel(document.getElementById("newMoodLevel").value)
    });
    e.target.reset();
    saveState();
    renderSettings();
    showToast("Pastille d'état ajoutée.");
  };

  document.getElementById("addSleepForm").onsubmit = function (e) {
    e.preventDefault();
    state.sleepPills.push({
      id: uid("sleep"),
      emoji: document.getElementById("newSleepEmoji").value.trim() || "🌙",
      label: document.getElementById("newSleepLabel").value.trim(),
      level: clampLevel(document.getElementById("newSleepLevel").value)
    });
    e.target.reset();
    saveState();
    renderSettings();
    showToast("Pastille de sommeil ajoutée.");
  };

  document.getElementById("addCategoryForm").onsubmit = function (e) {
    e.preventDefault();
    const nameInput = document.getElementById("newCatName");
    const colorInput = document.getElementById("newCatColor");
    const name = nameInput.value.trim();
    if (!name) return;
    state.categories.push({ id: uid("cat"), name: name, color: colorInput.value });
    nameInput.value = "";
    saveState();
    renderSettings();
    showToast("Catégorie ajoutée.");
  };

  document.getElementById("addCareForm").onsubmit = function (e) {
    e.preventDefault();
    const input = document.getElementById("newCareInput");
    const text = input.value.trim();
    if (!text) return;
    state.careGestures.push({ id: uid("care"), label: text });
    input.value = "";
    saveState();
    renderSettings();
  };

  document.getElementById("addQuoteForm").onsubmit = function (e) {
    e.preventDefault();
    const input = document.getElementById("newQuoteInput");
    const text = input.value.trim();
    if (!text) return;
    state.quotes.push(text);
    input.value = "";
    saveState();
    renderSettings();
    renderQuote();
    showToast("Phrase ajoutée.");
  };

  // Export / Import / Réinitialisation démo
  document.getElementById("exportJsonBtn").onclick = function () {
    const exportData = Object.assign(
      { appName: "Mon agenda", exportVersion: DATA_VERSION, exportedAt: new Date().toISOString() },
      state
    );
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agenda-sauvegarde-${toDateStr(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    state.lastExportAt = Date.now();
    saveState();
    if (typeof updateBackupReminder === "function") updateBackupReminder();
    showToast("Sauvegarde JSON exportée.");
  };

  document.getElementById("importJsonBtn").onclick = function () {
    askConfirm("Importer un fichier JSON ? Tout ton agenda actuel sera remplacé par le contenu du fichier. Pense à exporter une sauvegarde avant.", function () {
      document.getElementById("importJsonInput").click();
    });
  };

  /* Un vrai fichier de sauvegarde contient au moins une de ces rubriques. */
  function looksLikeAgendaBackup(obj) {
    return ["moments", "tasksByDate", "wellnessByDate", "notesByDate", "moodPills", "theme"].some(function (k) {
      return Object.prototype.hasOwnProperty.call(obj, k);
    });
  }

  /* Point d'entrée pour convertir d'anciens fichiers quand le format évoluera.
     Version 0 (fichiers sans numéro) et 1 : rien à convertir pour l'instant. */
  function migrateImportedData(data, fromVersion) {
    return data;
  }

  document.getElementById("importJsonInput").onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(reader.result);
        if (!isObj(parsed)) throw new Error("Format invalide");
        if (!looksLikeAgendaBackup(parsed)) {
          showToast("Ce fichier ne ressemble pas à une sauvegarde de l'agenda.");
          return;
        }
        const fileVersion = typeof parsed.exportVersion === "number" ? parsed.exportVersion : 0;
        const applyImport = function () {
          const undoSnap = snapshotState();
          state = mergeWithDefaults(migrateImportedData(parsed, fileVersion));
          saveState();
          renderAll();
          offerUndo("Données importées avec succès.", undoSnap);
        };
        if (fileVersion > DATA_VERSION) {
          askConfirm(
            "Cette sauvegarde vient d'une version plus récente de l'agenda. Certaines données pourraient être ignorées. Importer quand même ?",
            applyImport
          );
        } else {
          applyImport();
        }
      } catch (err) {
        showToast("Fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  let demoBannerDismissed = false;

  function isDemoWellnessEntry(entry) {
    if (!isObj(entry)) return false;
    if (entry.isDemo) return true;
    const cares = Array.isArray(entry.careIds) ? entry.careIds.join(",") : "";
    return (
      (entry.moodId === "mood_2" && entry.sleepId === "sleep_2" && entry.mealsCount === 2 && entry.snack === true && entry.waterGlasses === 4 && cares === "care_4") ||
      (entry.moodId === "mood_3" && entry.sleepId === "sleep_3" && entry.mealsCount === 3 && entry.snack === false && entry.waterGlasses === 6 && cares === "care_1,care_4,care_5") ||
      (entry.moodId === "mood_4" && entry.sleepId === "sleep_3" && entry.mealsCount === 3 && entry.snack === true && entry.waterGlasses === 5 && cares === "care_2,care_4")
    );
  }

  function hasDemoData() {
    const hasDemoMoments = Array.isArray(state.moments) && state.moments.some(function (m) {
      return m && typeof m.id === "string" && m.id.startsWith("demo_");
    });
    if (hasDemoMoments) return true;

    if (isObj(state.tasksByDate)) {
      for (const d of Object.keys(state.tasksByDate)) {
        const list = state.tasksByDate[d];
        if (Array.isArray(list) && list.some(function (t) { return t && typeof t.id === "string" && t.id.startsWith("demo_"); })) {
          return true;
        }
      }
    }

    const hasDemoDump = Array.isArray(state.dumpItems) && state.dumpItems.some(function (item) {
      return item && typeof item.id === "string" && item.id.startsWith("demo_");
    });
    if (hasDemoDump) return true;

    if (isObj(state.wellnessByDate)) {
      for (const d of Object.keys(state.wellnessByDate)) {
        if (isDemoWellnessEntry(state.wellnessByDate[d])) return true;
      }
    }
    return false;
  }

  function updateDemoBanner() {
    const banner = document.getElementById("demoDataBanner");
    if (!banner) return;
    if (!demoBannerDismissed && hasDemoData()) {
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
  }

  function promptClearDemoData() {
    if (!hasDemoData()) {
      showToast("Aucun exemple à effacer.");
      return;
    }
    askConfirm(
      "Effacer uniquement les exemples ? Tes propres événements, tâches, notes, thème et réglages seront conservés.",
      function () {
        const demoDates = new Set();

        if (Array.isArray(state.moments)) {
          state.moments = state.moments.filter(function (m) {
            if (m && typeof m.id === "string" && m.id.startsWith("demo_")) {
              if (m.date) demoDates.add(m.date);
              return false;
            }
            return true;
          });
        }

        if (isObj(state.tasksByDate)) {
          Object.keys(state.tasksByDate).forEach(function (d) {
            const list = state.tasksByDate[d];
            if (!Array.isArray(list)) return;
            const hadDemo = list.some(function (t) { return t && typeof t.id === "string" && t.id.startsWith("demo_"); });
            if (hadDemo) {
              demoDates.add(d);
              const remaining = list.filter(function (t) { return !(t && typeof t.id === "string" && t.id.startsWith("demo_")); });
              if (remaining.length > 0) {
                state.tasksByDate[d] = remaining;
              } else {
                delete state.tasksByDate[d];
              }
            }
          });
        }

        if (Array.isArray(state.dumpItems)) {
          state.dumpItems = state.dumpItems.filter(function (item) {
            return !(item && typeof item.id === "string" && item.id.startsWith("demo_"));
          });
        }

        if (isObj(state.wellnessByDate)) {
          Object.keys(state.wellnessByDate).forEach(function (d) {
            if (isDemoWellnessEntry(state.wellnessByDate[d])) {
              demoDates.add(d);
              delete state.wellnessByDate[d];
            }
          });
        }

        if (isObj(state.routineChecksByDate)) {
          demoDates.forEach(function (d) {
            const rc = state.routineChecksByDate[d];
            if (isObj(rc)) {
              const keys = Object.keys(rc).filter(function (k) { return rc[k]; });
              if (keys.length === 1 && keys[0] === "rout_1") {
                delete state.routineChecksByDate[d];
              }
            }
          });
        }

        saveState();
        renderAll();
        updateDemoBanner();
        showToast("Exemples effacés ✨");
      }
    );
  }

  document.getElementById("clearDemoBtn").onclick = promptClearDemoData;
  document.getElementById("bannerClearDemoBtn").onclick = promptClearDemoData;
  document.getElementById("bannerDismissDemoBtn").onclick = function () {
    demoBannerDismissed = true;
    document.getElementById("demoDataBanner").classList.add("hidden");
  };

  document.getElementById("resetDataBtn").onclick = function () {
    askConfirm("Réinitialiser tout l'agenda ? TOUTES tes données (événements, tâches, notes, réglages) seront supprimées et remplacées par les exemples. Pense à exporter un JSON avant.", function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (err) {}
      state = createDemoState();
      demoBannerDismissed = false;
      saveState();
      manualQuoteIndex = null;
      selectedDate = toDateStr(new Date());
      renderAll();
      updateDemoBanner();
      showToast("Agenda réinitialisé.");
    });
  };

  // Redessiner le graphique Récap au redimensionnement
  window.addEventListener("resize", function () {
    if (currentPage === "agenda" && currentView === "recap") {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderRecapView, 150);
    }
  });

  /* =========================================================
     15. IMPORTATION GOOGLE AGENDA (.ICS) & MINI-FAQ (v32)
     ========================================================= */
  function unfoldIcsLines(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n[ \t]/g, "")
      .split("\n");
  }

  function unescapeIcsText(str) {
    return String(str || "")
      .replace(/\\n/gi, "\n")
      .replace(/\\,/g, ",")
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\")
      .trim();
  }

  function parseIcsDateValue(rawVal) {
    const val = String(rawVal || "").trim();
    // Format date seule (journée entière) : YYYYMMDD
    const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(val);
    if (dateOnly) {
      return {
        date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`,
        time: "00:00",
        isAllDay: true
      };
    }

    // Format date + heure : YYYYMMDDTHHMMSS(Z)?
    const dtMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/i.exec(val);
    if (!dtMatch) return null;

    const y = Number(dtMatch[1]);
    const mo = Number(dtMatch[2]) - 1;
    const d = Number(dtMatch[3]);
    const hh = Number(dtMatch[4]);
    const mm = Number(dtMatch[5]);
    const ss = Number(dtMatch[6] || 0);
    const isUtc = Boolean(dtMatch[7]);

    const dtObj = isUtc
      ? new Date(Date.UTC(y, mo, d, hh, mm, ss))
      : new Date(y, mo, d, hh, mm, ss);

    if (Number.isNaN(dtObj.getTime())) return null;

    return {
      date: toDateStr(dtObj),
      time: `${String(dtObj.getHours()).padStart(2, "0")}:${String(dtObj.getMinutes()).padStart(2, "0")}`,
      isAllDay: false
    };
  }

  function parseIcsRrule(rruleVal, startDateStr) {
    const upper = String(rruleVal || "").toUpperCase();
    if (!upper) return { recurrence: "none", recurrenceEnd: "" };

    const intervalMatch = /INTERVAL=(\d+)/.exec(upper);
    const interval = intervalMatch ? Number(intervalMatch[1]) : 1;

    let recurrence = "none";
    if (upper.includes("FREQ=DAILY") && interval === 1) {
      recurrence = "daily";
    } else if (upper.includes("FREQ=WEEKLY")) {
      if (interval === 2) {
        recurrence = "biweekly";
      } else if (interval === 1) {
        const bydayMatch = /BYDAY=([^;]+)/.exec(upper);
        if (bydayMatch) {
          const days = bydayMatch[1].split(",").map(function (s) { return s.trim(); }).sort().join(",");
          if (days === "FR,MO,TH,TU,WE") recurrence = "weekdays";
          else recurrence = "weekly";
        } else {
          recurrence = "weekly";
        }
      }
    } else if (upper.includes("FREQ=YEARLY") && interval === 1) {
      recurrence = "yearly";
    }

    if (recurrence === "none") return { recurrence: "none", recurrenceEnd: "" };

    let recurrenceEnd = "";
    const untilMatch = /UNTIL=([^;]+)/.exec(upper);
    if (untilMatch) {
      const parsedUntil = parseIcsDateValue(untilMatch[1]);
      if (parsedUntil && parsedUntil.date) recurrenceEnd = parsedUntil.date;
    } else {
      const countMatch = /COUNT=(\d+)/.exec(upper);
      if (countMatch && startDateStr) {
        const count = Math.max(1, Number(countMatch[1]));
        const mult = recurrence === "yearly" ? 366 : (recurrence === "biweekly" ? 14 : (recurrence === "weekly" ? 7 : (recurrence === "weekdays" ? 2 : 1)));
        recurrenceEnd = addDays(startDateStr, (count - 1) * mult);
      }
    }

    return { recurrence: recurrence, recurrenceEnd: recurrenceEnd };
  }

  function parseIcsEvents(icsText) {
    const lines = unfoldIcsLines(icsText);
    const events = [];
    let current = null;
    let inAlarm = false;

    lines.forEach(function (line) {
      const trimmed = line.trim();
      if (trimmed === "BEGIN:VEVENT") {
        current = {};
        inAlarm = false;
        return;
      }
      if (trimmed === "END:VEVENT") {
        if (current && current.dtstart && current.status !== "CANCELLED") {
          events.push(current);
        }
        current = null;
        inAlarm = false;
        return;
      }
      if (!current) return;
      if (trimmed === "BEGIN:VALARM") { inAlarm = true; return; }
      if (trimmed === "END:VALARM") { inAlarm = false; return; }
      if (inAlarm || !line.includes(":")) return;

      const colonIdx = line.indexOf(":");
      const propPart = line.slice(0, colonIdx);
      const valPart = line.slice(colonIdx + 1);
      const propName = propPart.split(";")[0].toUpperCase();

      if (propName === "SUMMARY") current.summary = unescapeIcsText(valPart);
      else if (propName === "DTSTART") current.dtstart = parseIcsDateValue(valPart);
      else if (propName === "DTEND") current.dtend = parseIcsDateValue(valPart);
      else if (propName === "DESCRIPTION") current.description = unescapeIcsText(valPart);
      else if (propName === "LOCATION") current.location = unescapeIcsText(valPart);
      else if (propName === "RRULE") current.rrule = valPart.trim();
      else if (propName === "STATUS") current.status = valPart.trim().toUpperCase();
    });

    return events;
  }

  document.getElementById("importIcsBtn").onclick = function () {
    document.getElementById("importIcsInput").click();
  };

  document.getElementById("clearIcsBtn").onclick = function () {
    const icsCount = state.moments.filter(function (m) {
      return typeof m.id === "string" && m.id.startsWith("ics_");
    }).length;
    if (icsCount === 0) {
      showToast("Aucun événement Google importé à retirer.");
      return;
    }
    askConfirm(`Retirer les ${icsCount} événement(s) importés depuis Google Agenda ? Tes autres moments, tâches et notes seront conservés.`, function () {
      state.moments = state.moments.filter(function (m) {
        return !(typeof m.id === "string" && m.id.startsWith("ics_"));
      });
      saveState();
      renderAll();
      showToast(`${icsCount} événement(s) importé(s) retiré(s).`);
    });
  };

  document.getElementById("importIcsInput").onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsedEvents = parseIcsEvents(reader.result);
        if (parsedEvents.length === 0) {
          showToast("Aucun événement valide trouvé dans ce fichier .ics.");
          return;
        }

        const defaultCatId = state.categories[0] ? state.categories[0].id : "cat_perso";
        const cutoffDate = addDays(toDateStr(new Date()), -365);
        const existingKeys = new Set(
          state.moments.map(function (m) {
            return `${(m.title || "").trim().toLowerCase()}|${m.date}|${m.startTime || ""}`;
          })
        );

        let added = 0;
        let skipped = 0;

        parsedEvents.forEach(function (ev) {
          const title = (ev.summary || "Événement Google").slice(0, 140);
          const date = ev.dtstart.date;
          const startTime = ev.dtstart.time;
          const endTime = (!ev.dtstart.isAllDay && ev.dtend && ev.dtend.date === date && ev.dtend.time !== startTime)
            ? ev.dtend.time
            : "";

          const recInfo = parseIcsRrule(ev.rrule, date);

          // Ignorer les anciens événements terminés depuis plus d'un an pour garder l'agenda rapide
          if (recInfo.recurrence === "none" && date < cutoffDate) {
            skipped += 1;
            return;
          }
          if (recInfo.recurrence !== "none" && recInfo.recurrenceEnd && recInfo.recurrenceEnd < cutoffDate) {
            skipped += 1;
            return;
          }

          const key = `${title.trim().toLowerCase()}|${date}|${startTime}`;
          if (existingKeys.has(key)) {
            skipped += 1;
            return;
          }

          const noteParts = [];
          if (ev.dtstart.isAllDay) noteParts.push("Journée entière");
          if (ev.location) noteParts.push(`Lieu : ${ev.location.slice(0, 160)}`);
          if (ev.description) {
            const cleanDesc = ev.description.replace(/\n{3,}/g, "\n\n").trim();
            noteParts.push(cleanDesc.length > 400 ? cleanDesc.slice(0, 397) + "..." : cleanDesc);
          }

          state.moments.push({
            id: uid("ics"),
            title: title,
            date: date,
            startTime: startTime,
            endTime: endTime,
            categoryId: defaultCatId,
            recurrence: recInfo.recurrence,
            recurrenceEnd: recInfo.recurrenceEnd,
            note: noteParts.join("\n")
          });
          existingKeys.add(key);
          added += 1;
        });

        saveState();
        renderAll();

        if (added > 0 && skipped > 0) {
          showToast(`${added} événement(s) importé(s), ${skipped} ancien(s)/doublon(s) ignoré(s).`);
        } else if (added > 0) {
          showToast(`${added} événement(s) importé(s) depuis Google Agenda !`);
        } else {
          showToast("Aucun nouvel événement récent à importer.");
        }
      } catch (err) {
        showToast("Impossible de lire ce fichier .ics.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Mini-FAQ Modale
  function openFaqModal(targetSection) {
    const modal = document.getElementById("faqModal");
    const sectionId = targetSection === true ? "faqItemIcs" : (typeof targetSection === "string" ? targetSection : "");
    if (sectionId) {
      const detailsEl = document.getElementById(sectionId);
      if (detailsEl) {
        detailsEl.open = true;
        setTimeout(function () {
          detailsEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 30);
      }
    }
    modal.classList.remove("hidden");
  }

  function closeFaqModal() {
    document.getElementById("faqModal").classList.add("hidden");
  }

  document.getElementById("navFaqBtn").onclick = function () { openFaqModal(false); };
  document.getElementById("openFaqFromBackupBtn").onclick = function () { openFaqModal("faqItemIcs"); };
  const openFaqInstallBtn = document.getElementById("openFaqInstallFromSettingsBtn");
  if (openFaqInstallBtn) {
    openFaqInstallBtn.onclick = function () { openFaqModal("faqItemInstall"); };
  }

  // Installation PWA (Android natif + guide iOS/Android)
  let deferredInstallPrompt = null;
  const installAppBtn = document.getElementById("installAppBtn");
  const faqNativeInstallWrap = document.getElementById("faqNativeInstallWrap");
  const faqTriggerInstallBtn = document.getElementById("faqTriggerInstallBtn");

  function isRunningStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function updateInstallUi() {
    if (!installAppBtn) return;
    if (isRunningStandalone()) {
      installAppBtn.classList.add("hidden");
      if (faqNativeInstallWrap) faqNativeInstallWrap.classList.add("hidden");
      return;
    }
    installAppBtn.classList.remove("hidden");
    if (faqNativeInstallWrap) {
      faqNativeInstallWrap.classList.toggle("hidden", !deferredInstallPrompt);
    }
  }

  function triggerNativeInstallOrGuide() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(function (choice) {
        if (choice && choice.outcome === "accepted") {
          showToast("Installation en cours 📲");
        }
        deferredInstallPrompt = null;
        updateInstallUi();
      }).catch(function () {
        openFaqModal("faqItemInstall");
      });
    } else {
      openFaqModal("faqItemInstall");
    }
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    updateInstallUi();
  });

  window.addEventListener("appinstalled", function () {
    deferredInstallPrompt = null;
    if (installAppBtn) installAppBtn.classList.add("hidden");
    if (faqNativeInstallWrap) faqNativeInstallWrap.classList.add("hidden");
    showToast("Agenda installé sur ton appareil ✨");
  });

  if (installAppBtn) installAppBtn.onclick = triggerNativeInstallOrGuide;
  if (faqTriggerInstallBtn) {
    faqTriggerInstallBtn.onclick = function () {
      closeFaqModal();
      triggerNativeInstallOrGuide();
    };
  }
  updateInstallUi();
  document.getElementById("closeFaqModalBtn").onclick = closeFaqModal;
  document.getElementById("faqDoneBtn").onclick = closeFaqModal;
  document.getElementById("faqModal").addEventListener("click", function (e) {
    if (e.target === this) closeFaqModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeFaqModal();
    }
  });

  /* =========================================================
     16. CARTES REPLIABLES, MODE JOUR DOUX, RAPPEL SAUVEGARDE (v39)
     ========================================================= */
  let backupBannerDismissed = false;

  function initCollapsibleCards() {
    document.querySelectorAll("#dayView article.card[data-card-id]").forEach(function (card) {
      const cardId = card.dataset.cardId;
      const header = card.querySelector(".card-header");
      if (!header || header.querySelector(".card-collapse-btn")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-collapse-btn";
      btn.title = "Replier ou déplier cette section";
      btn.setAttribute("aria-label", "Replier ou déplier cette section");

      function syncCardCollapse() {
        const isCollapsed = Boolean(state.collapsedCards && state.collapsedCards[cardId]);
        card.classList.toggle("is-collapsed", isCollapsed);
        btn.textContent = isCollapsed ? "▸" : "▾";
        btn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      }

      btn.onclick = function () {
        if (!isObj(state.collapsedCards)) state.collapsedCards = {};
        state.collapsedCards[cardId] = !state.collapsedCards[cardId];
        saveState();
        syncCardCollapse();
      };

      header.appendChild(btn);
      syncCardCollapse();
    });
  }

  function applyGentleMode() {
    const active = Boolean(state.gentleMode);
    document.body.classList.toggle("gentle-day-mode", active);
    const btn = document.getElementById("gentleModeToggleBtn");
    if (btn) {
      btn.classList.toggle("active", active);
      btn.textContent = active ? "🌿 Jour difficile : Actif" : "🌿 Jour difficile";
    }
  }

  document.getElementById("gentleModeToggleBtn").onclick = function () {
    state.gentleMode = !state.gentleMode;
    saveState();
    applyGentleMode();
    showToast(state.gentleMode ? "Mode Jour difficile activé 🌿" : "Affichage complet rétabli.");
  };

  const defaultViewSelectEl = document.getElementById("defaultViewSelect");
  if (defaultViewSelectEl) {
    defaultViewSelectEl.onchange = function (e) {
      state.defaultView = e.target.value === "month" ? "month" : "day";
      saveState();
      showToast(state.defaultView === "month" ? "L'agenda s'ouvrira sur la vue Mois." : "L'agenda s'ouvrira sur la vue Jour.");
    };
  }

  function updateBackupReminder() {
    const statusEl = document.getElementById("lastExportStatus");
    const bannerEl = document.getElementById("backupReminderBanner");
    const bannerText = document.getElementById("backupReminderText");

    const last = state.lastExportAt;
    const daysAgo = last ? Math.floor((Date.now() - last) / 86400000) : null;

    if (statusEl) {
      if (daysAgo === null) {
        statusEl.textContent = "💾 Dernière sauvegarde JSON : aucune enregistrée";
      } else if (daysAgo === 0) {
        statusEl.textContent = "💾 Dernière sauvegarde JSON : aujourd'hui";
      } else {
        statusEl.textContent = `💾 Dernière sauvegarde JSON : il y a ${daysAgo} jour(s)`;
      }
    }

    const isCloudConnected = Boolean(typeof currentUser !== "undefined" && currentUser);
    if (bannerEl) {
      if (!isCloudConnected && !backupBannerDismissed && !isBackupSnoozed() && hasRealUserData() && (daysAgo === null || daysAgo >= 14)) {
        bannerText.textContent = daysAgo === null
          ? "💾 Tu es en mode local : pense à faire une sauvegarde JSON ou à te connecter au cloud (☁️)."
          : `💾 Dernière sauvegarde JSON il y a ${daysAgo} jours — pense à exporter une copie.`;
        bannerEl.classList.remove("hidden");
      } else {
        bannerEl.classList.add("hidden");
      }
    }
  }

  document.getElementById("bannerExportBtn").onclick = function () {
    document.getElementById("exportJsonBtn").click();
  };
  const BACKUP_SNOOZE_KEY = "ziigi_agenda_backup_snooze_until";
  function isBackupSnoozed() {
    try {
      const until = Number(localStorage.getItem(BACKUP_SNOOZE_KEY));
      return Boolean(until) && Date.now() < until;
    } catch (err) {
      return false;
    }
  }
  function snoozeBackupReminder(days) {
    try {
      localStorage.setItem(BACKUP_SNOOZE_KEY, String(Date.now() + days * 86400000));
    } catch (err) {}
  }
  document.getElementById("bannerDismissBtn").onclick = function () {
    snoozeBackupReminder(3);
    backupBannerDismissed = true;
    document.getElementById("backupReminderBanner").classList.add("hidden");
  };

  /* =========================================================
     17. MODE CRAYON DANS LE BLOC-NOTES LIBRE (v39)
     ========================================================= */
  let noteMode = "text";
  let drawColor = "#202938";
  let drawSize = 2.5;
  let drawEraser = false;
  let drawPalmReject = false;
  const drawPapers = [
    { cls: "paper-lined", label: "📄 Ligné" },
    { cls: "paper-dotted", label: "📄 Pointillé" },
    { cls: "", label: "📄 Uni" }
  ];
  let drawPaperIdx = 0;
  let isDrawing = false;
  let activePointerId = null;
  let lastDrawPt = null;
  let drawHistory = [];

  const drawCanvas = document.getElementById("dayDrawCanvas");
  const drawCtx = drawCanvas ? drawCanvas.getContext("2d") : null;
  const drawWrap = document.getElementById("drawCanvasWrap");

  function resizeDrawCanvas(preserveContent) {
    if (!drawCanvas || !drawCtx || !drawWrap) return;
    const rect = drawWrap.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;

    let snapshot = null;
    if (preserveContent && drawCanvas.width > 0 && drawCanvas.height > 0) {
      snapshot = drawCanvas.toDataURL("image/png");
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    drawCanvas.width = Math.round(rect.width * dpr);
    drawCanvas.height = Math.round(rect.height * dpr);
    drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";

    if (snapshot) {
      const img = new Image();
      img.onload = function () {
        drawCtx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = snapshot;
    }
  }

  function loadDayDrawing() {
    if (!drawCanvas || !drawCtx || !drawWrap) return;
    drawHistory = [];
    if (noteMode !== "draw") return;
    resizeDrawCanvas(false);
    const rect = drawWrap.getBoundingClientRect();
    drawCtx.clearRect(0, 0, rect.width, rect.height);

    const saved = state.drawingsByDate && state.drawingsByDate[selectedDate];
    if (saved && typeof saved === "string" && saved.startsWith("data:image/")) {
      const img = new Image();
      img.onload = function () {
        drawCtx.clearRect(0, 0, rect.width, rect.height);
        drawCtx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = saved;
    }
  }

  function saveDayDrawing() {
    if (!drawCanvas) return;
    if (!isObj(state.drawingsByDate)) state.drawingsByDate = {};
    let dataUrl = "";
    try {
      dataUrl = drawCanvas.toDataURL("image/webp", 0.65);
      if (!dataUrl.startsWith("data:image/webp")) {
        dataUrl = drawCanvas.toDataURL("image/png");
      }
    } catch (err) {
      dataUrl = drawCanvas.toDataURL("image/png");
    }
    state.drawingsByDate[selectedDate] = dataUrl;
    saveState();
    const badge = document.getElementById("noteSavedBadge");
    badge.classList.add("visible");
    clearTimeout(noteSavedTimer);
    noteSavedTimer = setTimeout(function () { badge.classList.remove("visible"); }, 1500);
  }

  function setNoteMode(mode) {
    noteMode = mode;
    document.getElementById("noteModeTextBtn").classList.toggle("active", mode === "text");
    document.getElementById("noteModeDrawBtn").classList.toggle("active", mode === "draw");
    document.getElementById("dayNoteInput").classList.toggle("hidden", mode !== "text");
    document.getElementById("dayDrawSection").classList.toggle("hidden", mode !== "draw");
    if (mode === "draw") setTimeout(loadDayDrawing, 20);
  }

  document.getElementById("noteModeTextBtn").onclick = function () { setNoteMode("text"); };
  document.getElementById("noteModeDrawBtn").onclick = function () { setNoteMode("draw"); };

  document.querySelectorAll(".draw-color-btn").forEach(function (btn) {
    btn.onclick = function () {
      drawColor = btn.dataset.drawColor;
      drawEraser = false;
      document.getElementById("drawEraserBtn").classList.remove("active");
      document.querySelectorAll(".draw-color-btn").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
    };
  });

  document.querySelectorAll("[data-draw-size]").forEach(function (btn) {
    btn.onclick = function () {
      drawSize = Number(btn.dataset.drawSize) || 2.5;
      document.querySelectorAll("[data-draw-size]").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
    };
  });

  document.getElementById("drawEraserBtn").onclick = function () {
    drawEraser = !drawEraser;
    this.classList.toggle("active", drawEraser);
  };

  document.getElementById("drawPalmBtn").onclick = function () {
    drawPalmReject = !drawPalmReject;
    this.classList.toggle("active", drawPalmReject);
    showToast(drawPalmReject ? "Rejet de paume activé (stylet uniquement)." : "Stylet, doigt et souris activés.");
  };

  document.getElementById("drawPaperBtn").onclick = function () {
    drawPaperIdx = (drawPaperIdx + 1) % drawPapers.length;
    drawWrap.classList.remove("paper-lined", "paper-dotted");
    if (drawPapers[drawPaperIdx].cls) {
      drawWrap.classList.add(drawPapers[drawPaperIdx].cls);
    }
    this.textContent = drawPapers[drawPaperIdx].label;
  };

  document.getElementById("drawUndoBtn").onclick = function () {
    if (!drawCanvas || !drawCtx || !drawWrap || drawHistory.length === 0) return;
    const prev = drawHistory.pop();
    const rect = drawWrap.getBoundingClientRect();
    const img = new Image();
    img.onload = function () {
      drawCtx.clearRect(0, 0, rect.width, rect.height);
      drawCtx.drawImage(img, 0, 0, rect.width, rect.height);
      saveDayDrawing();
    };
    img.src = prev;
  };

  document.getElementById("drawClearBtn").onclick = function () {
    if (!drawCanvas || !drawCtx || !drawWrap) return;
    askConfirm("Effacer le dessin de cette journée ?", function () {
      const rect = drawWrap.getBoundingClientRect();
      drawHistory.push(drawCanvas.toDataURL("image/png"));
      drawCtx.clearRect(0, 0, rect.width, rect.height);
      if (isObj(state.drawingsByDate)) delete state.drawingsByDate[selectedDate];
      saveState();
      showToast("Dessin effacé.");
    });
  };

  if (drawCanvas && drawCtx) {
    function getCanvasPos(e) {
      const rect = drawCanvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    drawCanvas.addEventListener("pointerdown", function (e) {
      if (drawPalmReject && e.pointerType === "touch") return;
      if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      drawCanvas.setPointerCapture(e.pointerId);
      isDrawing = true;
      activePointerId = e.pointerId;
      lastDrawPt = getCanvasPos(e);

      drawHistory.push(drawCanvas.toDataURL("image/png"));
      if (drawHistory.length > 15) drawHistory.shift();

      const pressure = e.pointerType === "pen" && e.pressure > 0 ? (0.5 + e.pressure) : 1;
      drawCtx.globalCompositeOperation = drawEraser ? "destination-out" : "source-over";
      drawCtx.strokeStyle = drawColor;
      drawCtx.fillStyle = drawColor;
      drawCtx.lineWidth = (drawEraser ? drawSize * 3.5 : drawSize) * pressure;
      drawCtx.beginPath();
      drawCtx.arc(lastDrawPt.x, lastDrawPt.y, drawCtx.lineWidth / 2, 0, Math.PI * 2);
      drawCtx.fill();
    });

    drawCanvas.addEventListener("pointermove", function (e) {
      if (!isDrawing || e.pointerId !== activePointerId) return;
      e.preventDefault();
      const pt = getCanvasPos(e);
      const pressure = e.pointerType === "pen" && e.pressure > 0 ? (0.5 + e.pressure) : 1;
      drawCtx.globalCompositeOperation = drawEraser ? "destination-out" : "source-over";
      drawCtx.strokeStyle = drawColor;
      drawCtx.lineWidth = (drawEraser ? drawSize * 3.5 : drawSize) * pressure;
      drawCtx.beginPath();
      drawCtx.moveTo(lastDrawPt.x, lastDrawPt.y);
      drawCtx.lineTo(pt.x, pt.y);
      drawCtx.stroke();
      lastDrawPt = pt;
    });

    function endStroke(e) {
      if (!isDrawing || e.pointerId !== activePointerId) return;
      isDrawing = false;
      activePointerId = null;
      lastDrawPt = null;
      drawCtx.globalCompositeOperation = "source-over";
      saveDayDrawing();
    }

    drawCanvas.addEventListener("pointerup", endStroke);
    drawCanvas.addEventListener("pointercancel", endStroke);
  }

  /* =========================================================
     18. CONNEXION FIREBASE, SYNCHRO CLOUD & PWA (v39)
     ========================================================= */
  const firebaseConfig = {
    apiKey: "AIzaSyBy9IQWE_oMsOxpQEODFXqkAzDheJrfXtQ",
    authDomain: "agenda-ziigiarts.firebaseapp.com",
    projectId: "agenda-ziigiarts",
    storageBucket: "agenda-ziigiarts.firebasestorage.app",
    messagingSenderId: "935788826845",
    appId: "1:935788826845:web:4a1ad9100278d4ea8c0b34",
    measurementId: "G-GEHRP1STQD"
  };

  let fbAuth = null;
  let fbDb = null;
  let currentUser = null;
  let unsubscribeSnapshot = null;
  let cloudSaveTimer = null;
  let isApplyingCloudUpdate = false;
  const clientSessionId = uid("dev");

  function updateCloudUi(statusText, isConnected) {
    const pill = document.getElementById("cloudStatusPill");
    const navBtn = document.getElementById("navCloudBtn");
    const loggedOutView = document.getElementById("cloudLoggedOutView");
    const loggedInView = document.getElementById("cloudLoggedInView");
    const emailEl = document.getElementById("cloudUserEmail");
    const detailEl = document.getElementById("cloudSyncDetail");

    if (pill) {
      pill.textContent = statusText;
      pill.classList.toggle("is-connected", Boolean(isConnected));
    }
    if (navBtn) {
      navBtn.textContent = isConnected ? "🟢" : "☁️";
    }
    if (currentUser) {
      loggedOutView.classList.add("hidden");
      loggedInView.classList.remove("hidden");
      emailEl.textContent = currentUser.email || currentUser.displayName || "Compte connecté";
      if (detailEl) detailEl.textContent = statusText;
    } else {
      loggedOutView.classList.remove("hidden");
      loggedInView.classList.add("hidden");
    }
    updateBackupReminder();
  }

  function setCloudError(msg) {
    const el = document.getElementById("cloudAuthError");
    if (el) el.textContent = msg || "";
  }

  const CLOUD_LINK_KEY = "ziigi_agenda_cloud_link";
  let cloudConflictPending = false;

  function readCloudLink() {
    try { return JSON.parse(localStorage.getItem(CLOUD_LINK_KEY) || "null"); } catch (err) { return null; }
  }
  function writeCloudLink(uid, updatedAt) {
    try { localStorage.setItem(CLOUD_LINK_KEY, JSON.stringify({ uid: uid, updatedAt: updatedAt || 0 })); } catch (err) {}
  }
  function readDirtyStamp() {
    try { return Number(localStorage.getItem(CLOUD_DIRTY_KEY) || 0) || 0; } catch (err) { return 0; }
  }
  function clearDirtyIfOlder(stamp) {
    try {
      if (readDirtyStamp() <= stamp) localStorage.removeItem(CLOUD_DIRTY_KEY);
    } catch (err) {}
  }

  function stableStringify(v) {
    if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
    if (v && typeof v === "object") {
      return "{" + Object.keys(v).sort().map(function (k) {
        return JSON.stringify(k) + ":" + stableStringify(v[k]);
      }).join(",") + "}";
    }
    return JSON.stringify(v === undefined ? null : v);
  }
  function stateFingerprint(st) {
    const c = Object.assign({}, st);
    delete c.lastExportAt;
    return stableStringify(c);
  }

  // Vrai si l'appareil contient autre chose que les exemples de démo / valeurs par défaut
  function hasRealUserData() {
    const notDemo = function (x) { return !(x && typeof x.id === "string" && x.id.startsWith("demo_")); };
    if (Array.isArray(state.moments) && state.moments.some(notDemo)) return true;
    if (isObj(state.tasksByDate)) {
      for (const d of Object.keys(state.tasksByDate)) {
        const list = state.tasksByDate[d];
        if (Array.isArray(list) && list.some(notDemo)) return true;
      }
    }
    if (Array.isArray(state.dumpItems) && state.dumpItems.some(notDemo)) return true;
    if (isObj(state.wellnessByDate) && Object.keys(state.wellnessByDate).some(function (d) {
      return !isDemoWellnessEntry(state.wellnessByDate[d]);
    })) return true;
    if (isObj(state.notesByDate) && Object.keys(state.notesByDate).some(function (d) {
      const v = state.notesByDate[d];
      return typeof v === "string" ? v.trim() !== "" : Boolean(v && Object.keys(v).length);
    })) return true;
    if (isObj(state.drawingsByDate) && Object.keys(state.drawingsByDate).length > 0) return true;
    if (isObj(state.routineChecksByDate)) {
      // La démo coche une seule routine (rout_1) : on ne la compte pas comme une vraie donnée
      const days = Object.keys(state.routineChecksByDate);
      if (days.length > 1) return true;
      if (days.length === 1) {
        const checks = state.routineChecksByDate[days[0]];
        const keys = isObj(checks) ? Object.keys(checks).filter(function (k) { return checks[k]; }) : [];
        if (!(keys.length === 1 && keys[0] === "rout_1")) return keys.length > 0;
      }
    }
    return false;
  }

  function downloadJsonBackup(obj, prefix) {
    try {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${prefix}-${toDateStr(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      return true;
    } catch (err) {
      return false;
    }
  }

  function pushStateToCloud() {
    if (!fbDb || !currentUser || isApplyingCloudUpdate || cloudConflictPending) return;
    const startedAt = Date.now();
    const uid = currentUser.uid;

    // Firestore refuse les documents de plus de 1 Mo : on prévient au lieu d'échouer en silence
    let approxBytes = 0;
    try { approxBytes = new Blob([JSON.stringify(state)]).size; } catch (err) {}
    if (approxBytes > 950000) {
      updateCloudUi("⚠️ Agenda trop volumineux pour le cloud", true);
      if (!pushStateToCloud.warned) {
        pushStateToCloud.warned = true;
        showToast("Ton agenda dépasse la taille permise pour la synchro cloud (surtout les dessins). Exporte une sauvegarde JSON et supprime d'anciens dessins.");
      }
      return;
    }
    updateCloudUi("⏳ Synchronisation...", true);
    fbDb.collection("agendas").doc(uid).set({
      data: Object.assign({}, state, { pinConfig: firebase.firestore.FieldValue.delete() }),
      updatedAt: startedAt,
      updatedBy: clientSessionId
    }, { merge: true }).then(function () {
      writeCloudLink(uid, startedAt);
      clearDirtyIfOlder(startedAt);
      updateCloudUi("☁️ Synchronisé", true);
    }).catch(function (err) {
      console.warn("Erreur synchro Firestore :", err);
      updateCloudUi("⚠️ Erreur synchro", true);
    });
  }

  scheduleCloudSave = function () {
    if (!fbDb || !currentUser || isApplyingCloudUpdate || cloudConflictPending) return;
    clearTimeout(cloudSaveTimer);
    updateCloudUi("⏳ Enregistrement...", true);
    cloudSaveTimer = setTimeout(pushStateToCloud, 700);
  };

  function applyCloudPayload(uid, payload) {
    isApplyingCloudUpdate = true;
    state = mergeWithDefaults(payload.data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {}
    writeCloudLink(uid, payload.updatedAt);
    clearDirtyIfOlder(Date.now());
    applyGentleMode();
    initCollapsibleCards();
    renderAll();
    updateDemoBanner();
    isApplyingCloudUpdate = false;
    updateCloudUi("☁️ Synchronisé", true);
  }

  function hideCloudConflict() {
    document.getElementById("cloudConflictModal").classList.add("hidden");
  }

  function showCloudConflict(uid, payload) {
    cloudConflictPending = true;
    clearTimeout(cloudSaveTimer);
    updateCloudUi("⚠️ En attente de ton choix", true);
    document.getElementById("cloudConflictModal").classList.remove("hidden");

    document.getElementById("cloudKeepCloudBtn").onclick = function () {
      const saved = downloadJsonBackup(state, "agenda-appareil-avant-cloud");
      hideCloudConflict();
      cloudConflictPending = false;
      applyCloudPayload(uid, payload);
      showToast(saved ? "Données du cloud appliquées. Sauvegarde de l'appareil téléchargée." : "Données du cloud appliquées.");
    };
    document.getElementById("cloudKeepLocalBtn").onclick = function () {
      const saved = downloadJsonBackup(mergeWithDefaults(payload.data), "agenda-cloud-avant-remplacement");
      hideCloudConflict();
      cloudConflictPending = false;
      pushStateToCloud();
      showToast(saved ? "Données de l'appareil envoyées au cloud. Sauvegarde du cloud téléchargée." : "Données de l'appareil envoyées au cloud.");
    };
    document.getElementById("cloudLaterBtn").onclick = function () {
      hideCloudConflict();
      updateCloudUi("⏸️ Synchro en pause (choix à faire)", true);
    };
  }

  function startCloudListener(user) {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }
    if (!fbDb || !user) return;

    let firstSnapshotHandled = false;
    const docRef = fbDb.collection("agendas").doc(user.uid);
    unsubscribeSnapshot = docRef.onSnapshot(function (doc) {
      if (cloudConflictPending) return;
      if (!doc.exists) {
        firstSnapshotHandled = true;
        pushStateToCloud();
        return;
      }
      const payload = doc.data();
      if (payload && payload.updatedBy === clientSessionId) {
        updateCloudUi("☁️ Synchronisé", true);
        firstSnapshotHandled = true;
        return;
      }
      if (!payload || !isObj(payload.data)) return;

      // Première lecture de cette session : on protège les données locales
      if (!firstSnapshotHandled) {
        firstSnapshotHandled = true;
        const link = readCloudLink();
        const sameAccount = Boolean(link && link.uid === user.uid);
        const dirty = readDirtyStamp() > 0;
        const cloudUpdatedAt = Number(payload.updatedAt) || 0;
        const cloudIsNewer = !sameAccount || cloudUpdatedAt > (Number(link.updatedAt) || 0);
        const differs = stateFingerprint(state) !== stateFingerprint(mergeWithDefaults(payload.data));

        if (differs && hasRealUserData() && (!sameAccount || dirty)) {
          if (sameAccount && !cloudIsNewer) {
            // Modifs locales pas encore envoyées, le cloud n'a pas bougé : on envoie simplement.
            pushStateToCloud();
            return;
          }
          showCloudConflict(user.uid, payload);
          return;
        }
      }
      applyCloudPayload(user.uid, payload);
    }, function (err) {
      console.warn("Erreur lecture Firestore :", err);
      updateCloudUi("⚠️ Hors ligne", true);
    });
  }

  function initFirebaseCloud() {
    if (typeof window.firebase === "undefined") {
      updateCloudUi("☁️ Mode local", false);
      return;
    }
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      fbAuth = firebase.auth();
      fbDb = firebase.firestore();

      fbAuth.onAuthStateChanged(function (user) {
        currentUser = user;
        if (user) {
          updateCloudUi("☁️ Connexion...", true);
          startCloudListener(user);
        } else {
          if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
          }
          cloudConflictPending = false;
          hideCloudConflict();
          updateCloudUi("☁️ Hors ligne (local)", false);
        }
      });
    } catch (err) {
      console.warn("Initialisation Firebase impossible :", err);
      updateCloudUi("☁️ Mode local", false);
    }
  }

  function openCloudModal() {
    setCloudError("");
    document.getElementById("cloudModal").classList.remove("hidden");
  }

  function closeCloudModal() {
    document.getElementById("cloudModal").classList.add("hidden");
  }

  document.getElementById("navCloudBtn").onclick = openCloudModal;
  document.getElementById("cloudStatusPill").onclick = openCloudModal;
  document.getElementById("closeCloudModalBtn").onclick = closeCloudModal;
  document.getElementById("cloudModal").addEventListener("click", function (e) {
    if (e.target === this) closeCloudModal();
  });

  document.getElementById("googleSignInBtn").onclick = function () {
    if (!fbAuth) {
      setCloudError("Service cloud indisponible hors ligne.");
      return;
    }
    setCloudError("");
    const provider = new firebase.auth.GoogleAuthProvider();
    fbAuth.signInWithPopup(provider).then(function () {
      closeCloudModal();
      showToast("Connectée avec Google ☁️");
    }).catch(function (err) {
      if (err && (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment")) {
        fbAuth.signInWithRedirect(provider);
      } else {
        setCloudError("Connexion Google impossible : " + (err.message || err.code));
      }
    });
  };

  document.getElementById("emailAuthForm").onsubmit = function (e) {
    e.preventDefault();
    if (!fbAuth) return;
    const email = document.getElementById("authEmailInput").value.trim();
    const pass = document.getElementById("authPasswordInput").value;
    setCloudError("");
    fbAuth.signInWithEmailAndPassword(email, pass).then(function () {
      closeCloudModal();
      showToast("Connectée à ton compte ☁️");
    }).catch(function () {
      setCloudError("Courriel ou mot de passe incorrect.");
    });
  };

  document.getElementById("emailSignUpBtn").onclick = function () {
    if (!fbAuth) return;
    const email = document.getElementById("authEmailInput").value.trim();
    const pass = document.getElementById("authPasswordInput").value;
    if (!email || pass.length < 6) {
      setCloudError("Entre un courriel valide et un mot de passe d'au moins 6 caractères.");
      return;
    }
    setCloudError("");
    fbAuth.createUserWithEmailAndPassword(email, pass).then(function () {
      closeCloudModal();
      showToast("Compte créé et synchronisé ☁️");
    }).catch(function (err) {
      if (err && err.code === "auth/email-already-in-use") {
        setCloudError("Ce courriel a déjà un compte. Clique sur « Se connecter ».");
      } else {
        setCloudError("Impossible de créer le compte : " + (err.message || err.code));
      }
    });
  };

  document.getElementById("forgotPasswordBtn").onclick = function () {
    if (!fbAuth) return;
    const email = document.getElementById("authEmailInput").value.trim();
    if (!email) {
      setCloudError("Entre d'abord ton courriel ci-dessus pour recevoir le lien.");
      return;
    }
    fbAuth.sendPasswordResetEmail(email).then(function () {
      setCloudError("");
      showToast("Courriel de réinitialisation envoyé !");
    }).catch(function () {
      setCloudError("Impossible d'envoyer le courriel à cette adresse.");
    });
  };

  document.getElementById("cloudForceSyncBtn").onclick = function () {
    pushStateToCloud();
    showToast("Synchronisation lancée ☁️");
  };

  document.getElementById("cloudSignOutBtn").onclick = function () {
    if (!fbAuth) return;
    fbAuth.signOut().then(function () {
      closeCloudModal();
      showToast("Déconnectée (tes données restent en local).");
    });
  };

  // Enregistrement PWA (Service Worker)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./service-worker.js").catch(function () {});
  }

  initCollapsibleCards();
  applyGentleMode();
  updateBackupReminder();
  updateDemoBanner();
  initFirebaseCloud();

  document.getElementById("fabAddMomentBtn").onclick = function () {
    openMomentModal(null, selectedDate);
  };

  /* =========================================================
     RAPPELS DOUX (notifications locales, propres à chaque appareil)
     ========================================================= */
  const REMINDERS_KEY = "ziigi_agenda_reminders";
  const NOTIFIED_KEY = "ziigi_agenda_notified";

  function loadReminderSettings() {
    const def = { enabled: false, lead: 10, dailyEnabled: false, dailyTime: "20:00", lastDaily: "" };
    try {
      const raw = JSON.parse(localStorage.getItem(REMINDERS_KEY) || "null");
      if (!raw || typeof raw !== "object") return def;
      return {
        enabled: raw.enabled === true,
        lead: [0, 5, 10, 30, 60].includes(Number(raw.lead)) ? Number(raw.lead) : 10,
        dailyEnabled: raw.dailyEnabled === true,
        dailyTime: /^\d{2}:\d{2}$/.test(raw.dailyTime || "") ? raw.dailyTime : "20:00",
        lastDaily: typeof raw.lastDaily === "string" ? raw.lastDaily : ""
      };
    } catch (err) {
      return def;
    }
  }
  function saveReminderSettings(s) {
    try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(s)); } catch (err) {}
  }

  function notificationsSupported() {
    return typeof Notification !== "undefined";
  }

  function syncRemindersUi() {
    const chk = document.getElementById("remindersEnabledCheck");
    if (!chk) return;
    const s = loadReminderSettings();
    const supported = notificationsSupported();
    const perm = supported ? Notification.permission : "unsupported";
    const active = s.enabled && perm === "granted";

    chk.checked = active;
    chk.disabled = !supported || perm === "denied";
    document.getElementById("remindersOptions").classList.toggle("hidden", !active);
    document.getElementById("reminderLeadSelect").value = String(s.lead);
    document.getElementById("reminderDailyCheck").checked = s.dailyEnabled;
    document.getElementById("reminderDailyTime").value = s.dailyTime;

    let msg = "Rappels désactivés.";
    if (!supported) msg = "Les notifications ne sont pas disponibles ici. Sur iPhone ou iPad, installe d'abord l'app sur l'écran d'accueil (iOS 16.4 ou plus).";
    else if (perm === "denied") msg = "Les notifications sont bloquées pour ce site. Autorise-les dans les réglages de ton appareil, puis reviens ici.";
    else if (active) msg = "Rappels activés ✨";
    document.getElementById("remindersStatus").textContent = msg;
  }

  function showSoftNotification(title, body, tag) {
    const opts = { body: body, tag: tag, icon: "./icon-192.png", badge: "./icon-192.png", lang: "fr" };
    if ("serviceWorker" in navigator) {
      return navigator.serviceWorker.ready
        .then(function (reg) { return reg.showNotification(title, opts); })
        .catch(function () { try { new Notification(title, opts); } catch (err) {} });
    }
    try { new Notification(title, opts); } catch (err) {}
    return Promise.resolve();
  }

  function loadNotifiedMap() {
    try {
      const raw = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (err) {
      return {};
    }
  }
  function saveNotifiedMap(map) {
    const limit = Date.now() - 3 * 86400000;
    Object.keys(map).forEach(function (k) { if (map[k] < limit) delete map[k]; });
    try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map)); } catch (err) {}
  }

  function checkReminders() {
    if (!notificationsSupported() || Notification.permission !== "granted") return;
    const s = loadReminderSettings();
    if (!s.enabled) return;

    const now = new Date();
    const today = toDateStr(now);
    const notified = loadNotifiedMap();
    let changed = false;

    // 1) Moments de l'horaire
    getMomentsForDate(today).forEach(function (m) {
      if (!m || !/^\d{2}:\d{2}$/.test(m.startTime || "")) return;
      const parts = m.startTime.split(":");
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(parts[0]), Number(parts[1]), 0);
      const diffMin = (start.getTime() - now.getTime()) / 60000;
      if (diffMin > s.lead || diffMin <= -1) return;
      const key = ["m", today, m.id, m.startTime, s.lead].join("|");
      if (notified[key]) return;
      notified[key] = Date.now();
      changed = true;
      const body = s.lead === 0
        ? `C'est l'heure : « ${m.title} » (${m.startTime}).`
        : `Petit rappel doux : « ${m.title} » commence à ${m.startTime}.`;
      showSoftNotification("🗓️ " + (m.title || "Moment"), body, key);
    });

    // 2) Rappel quotidien « Prendre soin de moi »
    if (s.dailyEnabled && s.lastDaily !== today) {
      const p = s.dailyTime.split(":");
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(p[0]), Number(p[1]), 0);
      const sinceMin = (now.getTime() - at.getTime()) / 60000;
      if (sinceMin >= 0 && sinceMin <= 120) {
        const w = state.wellnessByDate[today];
        const alreadyNoted = Boolean(w && (resolvePill("mood", w) || resolvePill("sleep", w) || w.waterGlasses > 0 || w.mealsCount > 0));
        s.lastDaily = today;
        saveReminderSettings(s);
        if (!alreadyNoted) {
          showSoftNotification("🌿 Un petit moment pour toi", "Comment te sens-tu aujourd'hui ? Tu peux noter ta journée quand tu veux.", "daily|" + today);
        }
      }
    }

    if (changed) saveNotifiedMap(notified);
  }

  document.getElementById("remindersEnabledCheck").onchange = function (e) {
    const wanted = e.target.checked;
    const s = loadReminderSettings();
    if (!wanted) {
      s.enabled = false;
      saveReminderSettings(s);
      syncRemindersUi();
      showToast("Rappels désactivés.");
      return;
    }
    if (!notificationsSupported()) { syncRemindersUi(); return; }
    Promise.resolve(Notification.requestPermission()).then(function (perm) {
      if (perm === "granted") {
        s.enabled = true;
        saveReminderSettings(s);
        showToast("Rappels activés ✨");
        checkReminders();
      } else {
        s.enabled = false;
        saveReminderSettings(s);
        showToast("Les notifications n'ont pas été autorisées.");
      }
      syncRemindersUi();
    });
  };
  document.getElementById("reminderLeadSelect").onchange = function (e) {
    const s = loadReminderSettings();
    s.lead = Number(e.target.value);
    saveReminderSettings(s);
    showToast("Réglage enregistré.");
  };
  document.getElementById("reminderDailyCheck").onchange = function (e) {
    const s = loadReminderSettings();
    s.dailyEnabled = e.target.checked;
    s.lastDaily = "";
    saveReminderSettings(s);
    showToast(s.dailyEnabled ? "Rappel quotidien activé." : "Rappel quotidien désactivé.");
  };
  document.getElementById("reminderDailyTime").onchange = function (e) {
    const s = loadReminderSettings();
    if (/^\d{2}:\d{2}$/.test(e.target.value)) s.dailyTime = e.target.value;
    s.lastDaily = "";
    saveReminderSettings(s);
    showToast("Heure enregistrée.");
  };

  setInterval(checkReminders, 30000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") checkReminders();
  });
  window.addEventListener("focus", checkReminders);
  setTimeout(checkReminders, 1500);

  /* Glisser vers la gauche / la droite pour changer de jour (vue Jour, écrans tactiles) */
  (function initDaySwipe() {
    const dayViewEl = document.getElementById("dayView");
    if (!dayViewEl) return;
    const MIN_DISTANCE = 80;   // px horizontaux minimum
    const MAX_DURATION = 600;  // ms
    let start = null;

    function isInteractiveOrScrollable(el) {
      while (el && el !== dayViewEl) {
        const tag = el.tagName;
        if (tag === "CANVAS" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
        if (el.isContentEditable) return true;
        const ox = getComputedStyle(el).overflowX;
        if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 2) return true;
        el = el.parentElement;
      }
      return false;
    }

    dayViewEl.addEventListener("touchstart", function (e) {
      start = null;
      if (e.touches.length !== 1) return;
      if (currentPage !== "agenda" || currentView !== "day") return;
      if (document.querySelector(".modal-backdrop:not(.hidden)")) return;
      if (isInteractiveOrScrollable(e.target)) return;
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY, time: Date.now() };
    }, { passive: true });

    dayViewEl.addEventListener("touchend", function (e) {
      if (!start) return;
      const s = start;
      start = null;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Date.now() - s.time > MAX_DURATION) return;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 2) return;
      const sel = window.getSelection && window.getSelection().toString();
      if (sel) return;
      document.getElementById(dx < 0 ? "nextDateBtn" : "prevDateBtn").click();
    }, { passive: true });

    dayViewEl.addEventListener("touchcancel", function () { start = null; }, { passive: true });
  })();

  // Actions de lancement (raccourcis de l'icône : ?action=new-moment | search | today)
  function handleLaunchAction() {
    let action = "";
    try {
      action = new URLSearchParams(location.search).get("action") || "";
    } catch (err) {
      return;
    }
    if (!action) return;
    if (action === "today" || action === "new-moment") {
      selectedDate = toDateStr(new Date());
      currentView = "day";
      currentPage = "agenda";
      renderAll();
    }
    if (action === "new-moment") {
      openMomentModal(null, selectedDate);
    } else if (action === "search") {
      openSearchModal();
    }
    // On retire le paramètre pour ne pas relancer l'action au rechargement.
    try {
      history.replaceState(null, "", location.pathname + location.hash);
    } catch (err) {}
  }

  // Lancement initial
  renderOwnerTitle();
  applyTheme();
  renderAll();
  handleLaunchAction();
});
