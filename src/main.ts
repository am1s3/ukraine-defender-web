// ============================================================
// Ukraine Defender — main.ts
// FULL FILE
//
// - карта / тривоги / події / звіт;
// - loader;
// - auth UI;
// - theme / i18n;
// - support / admin / donate;
// - user menu;
// - polling;
// - лента цілей КОНКРЕТНО по області;
// - XSS-fix (textContent);
// - race condition fix у pollEvents;
// - service worker.
// ============================================================

import "./style.css";

import {
  fetchAlerts,
  fetchEvents,
  fetchNight
} from "./api";

import { ThreatMap } from "./map";
import { Drawer } from "./panel";
import { SummaryOverlay } from "./summary";

import type {
  AlertResponse,
  ThreatEvent,
  NightResponse
} from "./types";

import {
  initLoader,
  markLoaderReady
} from "./loader";

import {
  initTheme,
  cycleTheme,
  currentThemePreference,
  setTheme,
  getStoredTheme
} from "./theme";

import {
  initI18n,
  toggleLanguage,
  applyI18n,
  translate as t,
  translateStatusStrip,
  getLocale,
  getStoredLanguage,
  setLanguage
} from "./i18n";

import {
  initAuth,
  login,
  register,
  logout,
  getCurrentUser,
  onAuthChanged,
  isAuthenticated,
  canAccessAdminPanel,
  updateProfile,
  requestPasswordReset,
  confirmPasswordReset
} from "./auth";

import {
  initSupport,
  openSupport,
  closeSupport
} from "./support";

import {
  initAdmin,
  openAdmin,
  closeAdmin
} from "./admin";

import {
  initDonate,
  openDonate,
  closeDonate
} from "./donate";

// ============================================================
// DOM HELPERS
// ============================================================

function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// ============================================================
// TOAST
// ============================================================

function showToast(
  text: string,
  kind: "info" | "warn" | "ok" = "info",
  icon = "ℹ️"
): void {
  const host = $<HTMLDivElement>("toastHost");

  const toast = document.createElement("div");

  toast.className =
    "toast" +
    (kind === "warn" ? " toast--warn" : kind === "ok" ? " toast--ok" : "");

  // XSS-safe: textContent замість innerHTML.
  toast.textContent = `${icon} ${text}`;

  host.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--out");

    toast.addEventListener(
      "animationend",
      () => {
        toast.remove();
      },
      { once: true }
    );
  }, 3200);
}

// ============================================================
// REGION FILTER FOR EVENT FEED
// ============================================================

const REGION_FOR_TOPONYM: Record<string, string> = {
  // KYIV CITY
  kyiv: "kyiv_city",
  troieshchyna: "kyiv_city",
  solomianka: "kyiv_city",
  podil: "kyiv_city",
  darnytsia: "kyiv_city",
  sviatoshyn: "kyiv_city",
  holosiiv: "kyiv_city",
  obolon: "kyiv_city",
  pechersk: "kyiv_city",
  pozniaky: "kyiv_city",
  desna: "kyiv_city",

  // KYIV OBLAST
  brovary: "kyiv_oblast",
  irpin: "kyiv_oblast",
  bucha: "kyiv_oblast",
  hostomel: "kyiv_oblast",
  vyshhorod: "kyiv_oblast",
  obukhiv: "kyiv_oblast",
  boryspil: "kyiv_oblast",
  knyazhychi: "kyiv_oblast",
  vplyka_dymerska: "kyiv_oblast",
  slavutych: "kyiv_oblast",

  // DNIPRO
  dnipro: "dnipro",
  kryvyi_rih: "dnipro",
  nikopol: "dnipro",
  pavlohrad: "dnipro",

  // KHARKIV
  kharkiv: "kharkiv",
  izium: "kharkiv",
  lozova: "kharkiv",

  odesa: "odesa",

  sumy: "sumy",
  okhtyrka: "sumy",
  konotop: "sumy",
  shostka: "sumy",

  zaporizhzhia: "zaporizhzhia",
  melitopol: "zaporizhzhia",
  berdyansk: "zaporizhzhia",

  mykolaiv: "mykolaiv",
  kherson: "kherson",

  poltava: "poltava",
  kremenchuk: "poltava",

  cherkasy: "cherkasy",
  chernihiv: "chernihiv",
  zhytomyr: "zhytomyr",
  vinnytsia: "vinnytsia",
  khmelnytskyi: "khmelnytskyi",
  rivne: "rivne",
  ternopil: "ternopil",
  lviv: "lviv",
  ivano_frankivsk: "ivano_frankivsk",

  uzhhorod: "zakarpattia",
  lutsk: "volyn",

  donetsk: "donetsk",
  luhansk: "luhansk",

  kropyvnytskyi: "kirovohrad",
  chernivtsi: "chernivtsi",

  // Крим
  crimea: "crimea"
};

function eventBelongsToRegion(
  e: ThreatEvent,
  region: string
): boolean {
  const toponymRegion = e.toponym_key
    ? REGION_FOR_TOPONYM[e.toponym_key]
    : null;

  if (region === "kyiv") {
    return (
      toponymRegion === "kyiv_city" ||
      toponymRegion === "kyiv_oblast"
    );
  }

  if (region === "kyiv_city") {
    return toponymRegion === "kyiv_city";
  }

  if (region === "kyiv_oblast") {
    return toponymRegion === "kyiv_oblast";
  }

  return toponymRegion === region;
}

function filterEventsByRegion(
  events: ThreatEvent[],
  region: string
): ThreatEvent[] {
  return events.filter((e) => eventBelongsToRegion(e, region));
}

// ============================================================
// CORE STATE
// ============================================================

let lastData: AlertResponse | null = null;
let lastEvents: ThreatEvent[] = [];
let lastNight: NightResponse | null = null;

let map: ThreatMap | undefined;

// ============================================================
// DRAWER / SUMMARY
// ============================================================

const drawer = new Drawer({
  onHoverToponym: (key) => {
    map?.setHighlight(key);
  },

  onFlyToponym: (key) => {
    map?.flyToponym(key);
  },

  onRetry: () => {
    void pollEvents();
  }
});

const summary = new SummaryOverlay();

// ============================================================
// AUTH UI ELEMENTS
// ============================================================

const authOverlay = $<HTMLDivElement>("authOverlay");

const loginOpenBtn = $<HTMLButtonElement>("loginOpenBtn");

const userArea = $<HTMLDivElement>("userArea");
const userMenuBtn = $<HTMLButtonElement>("userMenuBtn");
const userNickname = $<HTMLSpanElement>("userNickname");
const adminPanelBtn = $<HTMLButtonElement>("adminPanelBtn");

const loginForm = $<HTMLFormElement>("loginForm");
const loginIdentifier = $<HTMLInputElement>("loginIdentifier");
const loginPassword = $<HTMLInputElement>("loginPassword");
const loginMessage = $<HTMLDivElement>("loginMessage");

const registerForm = $<HTMLFormElement>("registerForm");
const registerNickname = $<HTMLInputElement>("registerNickname");
const registerEmail = $<HTMLInputElement>("registerEmail");
const registerPassword = $<HTMLInputElement>("registerPassword");
const registerPasswordRepeat = $<HTMLInputElement>(
  "registerPasswordRepeat"
);
const registerMessage = $<HTMLDivElement>("registerMessage");

const forgotForm = $<HTMLFormElement>("forgotForm");
const forgotEmail = $<HTMLInputElement>("forgotEmail");
const forgotMessage = $<HTMLDivElement>("forgotMessage");

const resetForm = $<HTMLFormElement>("resetForm");
const resetToken = $<HTMLInputElement>("resetToken");
const resetPassword = $<HTMLInputElement>("resetPassword");
const resetPasswordRepeat = $<HTMLInputElement>(
  "resetPasswordRepeat"
);
const resetMessage = $<HTMLDivElement>("resetMessage");

// ============================================================
// AUTH MESSAGE HELPERS
// ============================================================

function showMessage(
  el: HTMLElement,
  text: string,
  ok = false
): void {
  el.hidden = false;
  el.textContent = text;

  el.className = `ud-message ${
    ok ? "ud-message--ok" : "ud-message--error"
  }`;
}

function hideMessage(el: HTMLElement): void {
  el.hidden = true;
  el.textContent = "";
}

function hideAuthMessages(): void {
  hideMessage(loginMessage);
  hideMessage(registerMessage);
  hideMessage(forgotMessage);
  hideMessage(resetMessage);
}

// ============================================================
// AUTH VIEWS
// ============================================================

let registerStep = 1;

function setRegisterStep(step: number): void {
  registerStep = step;

  registerForm.dataset.step = String(step);

  document
    .querySelectorAll<HTMLElement>("[data-register-step]")
    .forEach((node) => {
      node.hidden =
        node.getAttribute("data-register-step") !== String(step);
    });
}

function showAuthView(name: string): void {
  document
    .querySelectorAll<HTMLElement>("[data-auth-view]")
    .forEach((node) => {
      node.hidden =
        node.getAttribute("data-auth-view") !== name;
    });

  hideAuthMessages();

  if (name === "register") {
    setRegisterStep(1);
  }
}

function openAuthOverlay(view: string = "login"): void {
  showAuthView(view);

  authOverlay.dataset.open = "true";
}

function closeAuthOverlay(): void {
  authOverlay.dataset.open = "false";
}

// ============================================================
// AUTH STATE RENDER
// ============================================================

function applyUserPrefsIfNoLocal(): void {
  const user = getCurrentUser();

  if (!user) return;

  if (!getStoredTheme() && user.theme) {
    setTheme(user.theme, false);
  }

  if (!getStoredLanguage() && user.lang) {
    setLanguage(user.lang);
  }
}

function renderAuthState(): void {
  const user = getCurrentUser();

  if (user) {
    loginOpenBtn.hidden = true;

    userArea.hidden = false;

    userNickname.textContent = user.nickname;

    adminPanelBtn.hidden = !canAccessAdminPanel();
  } else {
    loginOpenBtn.hidden = false;

    userArea.hidden = true;
    userArea.dataset.open = "false";

    adminPanelBtn.hidden = true;
  }

  applyUserPrefsIfNoLocal();
  applyI18n();
}

// ============================================================
// AUTH BINDINGS
// ============================================================

loginOpenBtn.addEventListener("click", () => {
  openAuthOverlay("login");
});

document.querySelectorAll("[data-auth-close]").forEach((node) => {
  node.addEventListener("click", () => {
    closeAuthOverlay();
  });
});

document.querySelectorAll("[data-auth-switch]").forEach((node) => {
  node.addEventListener("click", () => {
    const view =
      (node as HTMLElement).dataset.authSwitch || "login";

    showAuthView(view);
  });
});

document.querySelectorAll("[data-register-next]").forEach((node) => {
  node.addEventListener("click", () => {
    if (registerStep === 1) {
      const nickname = registerNickname.value.trim();

      if (nickname.length < 3) {
        showMessage(registerMessage, "Нік занадто короткий.");
        return;
      }

      setRegisterStep(2);

      return;
    }

    if (registerStep === 2) {
      const email = registerEmail.value.trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage(registerMessage, "Некоректний email.");
        return;
      }

      setRegisterStep(3);

      return;
    }
  });
});

document.querySelectorAll("[data-register-back]").forEach((node) => {
  node.addEventListener("click", () => {
    if (registerStep > 1) {
      setRegisterStep(registerStep - 1);
    }
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  hideMessage(loginMessage);

  try {
    const user = await login({
      login: loginIdentifier.value.trim(),
      password: loginPassword.value
    });

    closeAuthOverlay();

    showToast(
      t("toast.welcome", { name: user.nickname }),
      "ok",
      "🛡️"
    );
  } catch (error) {
    showMessage(
      loginMessage,
      String((error as Error).message || error)
    );
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  hideMessage(registerMessage);

  const password = registerPassword.value;
  const passwordRepeat = registerPasswordRepeat.value;

  if (password.length < 8) {
    showMessage(
      registerMessage,
      "Пароль мінімум 8 символів."
    );
    return;
  }

  if (password !== passwordRepeat) {
    showMessage(registerMessage, "Паролі не співпадають.");
    return;
  }

  try {
    const user = await register({
      nickname: registerNickname.value.trim(),
      email: registerEmail.value.trim(),
      password,
      password_repeat: passwordRepeat
    });

    closeAuthOverlay();

    showToast(
      t("toast.registered", { name: user.nickname }),
      "ok",
      "✅"
    );
  } catch (error) {
    showMessage(
      registerMessage,
      String((error as Error).message || error)
    );
  }
});

forgotForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  hideMessage(forgotMessage);

  try {
    const data = await requestPasswordReset({
      email: forgotEmail.value.trim()
    });

    if (data?.debug_token) {
      showAuthView("reset");

      resetToken.value = data.debug_token;

      showMessage(resetMessage, "Debug token заповнено.", true);

      return;
    }

    showMessage(
      forgotMessage,
      "Якщо email існує, відновлення надіслано.",
      true
    );
  } catch (error) {
    showMessage(
      forgotMessage,
      String((error as Error).message || error)
    );
  }
});

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  hideMessage(resetMessage);

  const password = resetPassword.value;
  const passwordRepeat = resetPasswordRepeat.value;

  if (password.length < 8) {
    showMessage(
      resetMessage,
      "Пароль мінімум 8 символів."
    );
    return;
  }

  if (password !== passwordRepeat) {
    showMessage(resetMessage, "Паролі не співпадають.");
    return;
  }

  try {
    await confirmPasswordReset({
      token: resetToken.value.trim(),
      password,
      password_repeat: passwordRepeat
    });

    showAuthView("login");

    showMessage(
      loginMessage,
      "Пароль змінено. Увійдіть знову.",
      true
    );
  } catch (error) {
    showMessage(
      resetMessage,
      String((error as Error).message || error)
    );
  }
});

// ============================================================
// USER MENU
// ============================================================

userMenuBtn.addEventListener("click", (event) => {
  event.stopPropagation();

  userArea.dataset.open =
    userArea.dataset.open === "true" ? "false" : "true";
});

document.addEventListener("click", () => {
  userArea.dataset.open = "false";
});

document
  .getElementById("userMenu")
  ?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

document
  .querySelectorAll<HTMLElement>("[data-user-action]")
  .forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.userAction;

      userArea.dataset.open = "false";

      if (!action) return;

      if (action === "theme") {
        cycleTheme();

        if (isAuthenticated()) {
          void updateProfile({
            theme: currentThemePreference()
          }).catch(() => {});
        }

        return;
      }

      if (action === "lang") {
        const next = toggleLanguage();

        if (isAuthenticated()) {
          void updateProfile({
            lang: next
          }).catch(() => {});
        }

        return;
      }

      if (action === "support") {
        openSupport();
        return;
      }

      if (action === "donate") {
        openDonate();
        return;
      }

      if (action === "admin") {
        openAdmin();
        return;
      }

      if (action === "logout") {
        await logout();

        showToast(t("toast.loggedOut"), "ok", "🚪");
      }
    });
  });

onAuthChanged(() => {
  renderAuthState();
});

// ============================================================
// ABOUT
// ============================================================

const aboutOverlay = $<HTMLDivElement>("aboutOverlay");

function openAbout(): void {
  aboutOverlay.dataset.open = "true";
}

function closeAbout(): void {
  aboutOverlay.dataset.open = "false";
}

document
  .querySelectorAll("[data-nav-close='about']")
  .forEach((node) => {
    node.addEventListener("click", () => {
      closeAbout();
    });
  });

// ============================================================
// REPORT
// ============================================================

async function openSummary(): Promise<void> {
  try {
    lastNight = await fetchNight(12);
  } catch (error) {
    console.warn("night failed", error);
  }

  summary.open(lastEvents, lastData, lastNight);
}

// ============================================================
// NAVIGATION
// ============================================================

document
  .querySelectorAll<HTMLElement>("[data-nav]")
  .forEach((b) => {
    b.addEventListener("click", () => {
      const btn = b as HTMLElement;
      const nav = btn.dataset.nav;

      if (nav === "report") {
        void openSummary();
        return;
      }

      if (nav === "about") {
        openAbout();
        return;
      }

      if (nav === "support") {
        openSupport();
        return;
      }
    });
  });

// ============================================================
// ESCAPE CLOSE
// ============================================================

const adminOverlay = $<HTMLDivElement>("adminOverlay");
const supportOverlay = $<HTMLDivElement>("supportOverlay");
const donateOverlay = $<HTMLDivElement>("donateOverlay");

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (adminOverlay.dataset.open === "true") {
    closeAdmin();
    return;
  }

  if (supportOverlay.dataset.open === "true") {
    closeSupport();
    return;
  }

  if (donateOverlay.dataset.open === "true") {
    closeDonate();
    return;
  }

  if (authOverlay.dataset.open === "true") {
    closeAuthOverlay();
    return;
  }

  if (aboutOverlay.dataset.open === "true") {
    closeAbout();
    return;
  }
});

// ============================================================
// CLOCK / STATUS
// ============================================================

function tickClock(): void {
  const clock = $<HTMLElement>("clock");

  clock.textContent = new Intl.DateTimeFormat(getLocale(), {
    timeZone: "Europe/Kyiv",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

setInterval(tickClock, 1000);

tickClock();

function updateStatusStrip(data: AlertResponse): void {
  const strip = $<HTMLElement>("statusStrip");
  const text = $<HTMLElement>("statusText");

  const kyiv = data.regions.find(
    (r) => r.key === "kyiv_city" || r.key === "kyiv_oblast"
  );

  const kyivAlert = kyiv?.alert ?? false;

  strip.dataset.state = kyivAlert ? "alert" : "calm";

  text.textContent = translateStatusStrip({
    kyivAlert,
    activeAlerts: data.active_alerts
  });
}

// ============================================================
// POLLING
// ============================================================

async function pollEvents(): Promise<void> {
  // Race condition fix: зберегти стан drawer ПЕРЕД fetch.
  const drawerWasOpen = drawer.isOpen();
  const currentRegionKey = drawer.currentKey();

  try {
    const region = currentRegionKey || "kyiv";

    const data = await fetchEvents(region);

    lastEvents = data.events;

    map?.setTrajectories(lastEvents);

    // Перевірити стан drawer ПІСЛЯ fetch.
    if (drawerWasOpen && drawer.isOpen()) {
      const newRegionKey = drawer.currentKey();

      if (currentRegionKey === newRegionKey) {
        drawer.setEvents(
          filterEventsByRegion(lastEvents, region)
        );
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("events failed", message);

    if (drawer.isOpen()) {
      drawer.setError(message);
    }

    showToast("Не вдалося отримати події", "warn", "⚠️");
  }
}

async function poll(): Promise<void> {
  try {
    const data = await fetchAlerts();

    lastData = data;

    map?.render(data.regions);

    updateStatusStrip(data);

    const openKey = drawer.currentKey();

    if (openKey) {
      const region = data.regions.find((x) => x.key === openKey);

      if (region) {
        drawer.updateRegion(region);
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("poll failed", message);

    showToast("Не вдалося отримати тривоги", "warn", "⚠️");
  }
}

// ============================================================
// MAP INIT
// ============================================================

map = new ThreatMap("map", (key) => {
  const region = lastData?.regions.find((x) => x.key === key);

  if (region) {
    drawer.open(region);

    void pollEvents();
  } else {
    showToast("Дані ще не завантажилися", "warn", "⏳");
  }
});

const originalDrawerOpen = drawer.open.bind(drawer);

drawer.open = (region) => {
  originalDrawerOpen(region);

  map?.clearPin();

  void pollEvents();
};

const originalDrawerClose = drawer.close.bind(drawer);

drawer.close = () => {
  originalDrawerClose();

  map?.clearPin();
};

// ============================================================
// INIT MODULES
// ============================================================

initLoader();

initI18n();

initTheme();

initSupport();

initAdmin();

initDonate();

void initAuth().then(() => {
  renderAuthState();
});

renderAuthState();

void poll();

void pollEvents();

setInterval(() => {
  void poll();
}, 5000);

setInterval(() => {
  void pollEvents();
}, 12000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("sw register failed", error);
    });
  });
}

markLoaderReady();
