// ============================================================
// Ukraine Defender — main.ts
// FULL FILE
//
// Что делает:
// - запускает карту, панель, отчёт;
// - прячет лоадер через 2 секунды;
// - подключает аккаунты;
// - подключает техподдержку;
// - подключает донаты;
// - подключает тему и язык;
// - подключает админку;
// - ходит в auth/support/admin API;
// - сохраняет token в localStorage.
// ============================================================

import "./style.css";

import { fetchAlerts, fetchEvents, fetchNight } from "./api";
import { ThreatMap } from "./map";
import { Drawer } from "./panel";
import { SummaryOverlay } from "./summary";

import type {
  AlertResponse,
  ThreatEvent,
  NightResponse
} from "./types";

// ============================================================
// CONFIG / STATE
// ============================================================

const API_BASE = "";
const TOKEN_KEY = "ud_token";
const THEME_KEY = "ud_theme";
const LANG_KEY = "ud_lang";

type AuthUser = {
  id: number;
  nickname: string;
  email: string;
  role: string;
  theme: string;
  lang: string;
  is_active: number;
};

type PublicSettings = Record<string, string>;

const state = {
  user: null as AuthUser | null,
  publicSettings: {} as PublicSettings,
  supportTicketId: null as number | null,
  adminTab: "tickets" as string
};

// ============================================================
// DOM HELPERS
// ============================================================

function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("uk-UA", {
      timeZone: "Europe/Kyiv",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

// ============================================================
// CORE ELEMENTS
// ============================================================

const loader = $<HTMLDivElement>("loader");

const loginOpenBtn = $<HTMLButtonElement>("loginOpenBtn");
const userArea = $<HTMLDivElement>("userArea");
const userMenuBtn = $<HTMLButtonElement>("userMenuBtn");
const userNickname = $<HTMLSpanElement>("userNickname");
const adminPanelBtn = $<HTMLButtonElement>("adminPanelBtn");

const authOverlay = $<HTMLDivElement>("authOverlay");
const loginForm = $<HTMLFormElement>("loginForm");
const loginIdentifier = $<HTMLInputElement>("loginIdentifier");
const loginPassword = $<HTMLInputElement>("loginPassword");
const loginMessage = $<HTMLDivElement>("loginMessage");

const registerForm = $<HTMLFormElement>("registerForm");
const registerNickname = $<HTMLInputElement>("registerNickname");
const registerEmail = $<HTMLInputElement>("registerEmail");
const registerPassword = $<HTMLInputElement>("registerPassword");
const registerPasswordRepeat = $<HTMLInputElement>("registerPasswordRepeat");
const registerMessage = $<HTMLDivElement>("registerMessage");

const forgotForm = $<HTMLFormElement>("forgotForm");
const forgotEmail = $<HTMLInputElement>("forgotEmail");
const forgotMessage = $<HTMLDivElement>("forgotMessage");

const resetForm = $<HTMLFormElement>("resetForm");
const resetToken = $<HTMLInputElement>("resetToken");
const resetPassword = $<HTMLInputElement>("resetPassword");
const resetPasswordRepeat = $<HTMLInputElement>("resetPasswordRepeat");
const resetMessage = $<HTMLDivElement>("resetMessage");

const supportOverlay = $<HTMLDivElement>("supportOverlay");
const supportAuthRequired = $<HTMLDivElement>("supportAuthRequired");
const supportApp = $<HTMLDivElement>("supportApp");
const supportGoLoginBtn = $<HTMLButtonElement>("supportGoLoginBtn");
const supportNewTicketBtn = $<HTMLButtonElement>("supportNewTicketBtn");
const supportRefreshBtn = $<HTMLButtonElement>("supportRefreshBtn");
const supportTicketsList = $<HTMLDivElement>("supportTicketsList");

const supportTicketView = $<HTMLDivElement>("supportTicketView");
const supportBackBtn = $<HTMLButtonElement>("supportBackBtn");
const supportTicketStatus = $<HTMLSpanElement>("supportTicketStatus");
const supportTicketSubject = $<HTMLHeadingElement>("supportTicketSubject");
const supportMessages = $<HTMLDivElement>("supportMessages");
const supportMessageForm = $<HTMLFormElement>("supportMessageForm");
const supportMessageText = $<HTMLTextAreaElement>("supportMessageText");

const supportNewForm = $<HTMLFormElement>("supportNewForm");
const supportCategory = $<HTMLSelectElement>("supportCategory");
const supportSubject = $<HTMLInputElement>("supportSubject");
const supportBody = $<HTMLTextAreaElement>("supportBody");
const supportCancelNewBtn = $<HTMLButtonElement>("supportCancelNewBtn");

const donateOverlay = $<HTMLDivElement>("donateOverlay");
const donateLink = $<HTMLAnchorElement>("donateLink");
const donateCopyBtn = $<HTMLButtonElement>("donateCopyBtn");
const donateMessage = $<HTMLDivElement>("donateMessage");

const adminOverlay = $<HTMLDivElement>("adminOverlay");

const adminTickets = $<HTMLDivElement>("adminTickets");
const adminTicketFilter = $<HTMLSelectElement>("adminTicketFilter");
const adminTicketsRefreshBtn = $<HTMLButtonElement>("adminTicketsRefreshBtn");

const adminUsers = $<HTMLDivElement>("adminUsers");
const adminUsersRefreshBtn = $<HTMLButtonElement>("adminUsersRefreshBtn");

const adminSources = $<HTMLDivElement>("adminSources");
const adminSourcesRefreshBtn = $<HTMLButtonElement>("adminSourcesRefreshBtn");

const adminReports = $<HTMLDivElement>("adminReports");
const adminReportsRefreshBtn = $<HTMLButtonElement>("adminReportsRefreshBtn");

const adminLogs = $<HTMLDivElement>("adminLogs");
const adminLogsRefreshBtn = $<HTMLButtonElement>("adminLogsRefreshBtn");

const adminSettingsList = $<HTMLDivElement>("adminSettingsList");
const adminSettingForm = $<HTMLFormElement>("adminSettingForm");
const adminSettingKey = $<HTMLInputElement>("adminSettingKey");
const adminSettingValue = $<HTMLInputElement>("adminSettingValue");
const adminSettingsRefreshBtn = $<HTMLButtonElement>("adminSettingsRefreshBtn");

const adminAnalyticsSummary = $<HTMLDivElement>("adminAnalyticsSummary");
const adminAnalyticsRefreshBtn = $<HTMLButtonElement>("adminAnalyticsRefreshBtn");

const toastHost = $<HTMLDivElement>("toastHost");

// ============================================================
// MAP / PANEL / SUMMARY
// ============================================================

let lastData: AlertResponse | null = null;
let lastEvents: ThreatEvent[] = [];
let lastNight: NightResponse | null = null;

let map: ThreatMap | undefined;

const drawer = new Drawer({
  onHoverToponym: (key) => map?.setHighlight(key),
  onFlyToponym: (key) => map?.flyToponym(key),
  onRetry: () => {
    void pollEvents();
  }
});

const summary = new SummaryOverlay();

// ============================================================
// API
// ============================================================

async function api(path: string, method: string = "GET", body?: unknown): Promise<any> {
  const headers = new Headers();

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    if (state.user && !path.startsWith("/api/auth")) {
      clearSession();
      renderAuthState();
    }
  }

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data;
}

// ============================================================
// TOAST
// ============================================================

function showToast(
  text: string,
  kind: "info" | "warn" | "ok" = "info",
  icon = "ℹ️"
): void {
  const el = document.createElement("div");

  el.className =
    "toast" +
    (kind === "warn" ? " toast--warn" : kind === "ok" ? " toast--ok" : "");

  el.textContent = `${icon} ${text}`;

  toastHost.appendChild(el);

  setTimeout(() => {
    el.classList.add("toast--out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, 3200);
}

// ============================================================
// LOADER
// ============================================================

const bootAt = performance.now();

function hideLoader(): void {
  if (!loader) return;

  const elapsed = performance.now() - bootAt;
  const wait = Math.max(0, 2000 - elapsed);

  setTimeout(() => {
    loader.dataset.hidden = "true";

    setTimeout(() => {
      loader.remove();
    }, 600);
  }, wait);
}

// ============================================================
// THEME / LANG
// ============================================================

const I18N: Record<string, Record<string, string>> = {
  uk: {
    login: "Увійти",
    report: "📊 Звіт",
    reportLbl: "Звіт",
    about: "Про нас",
    donate: "Донат",
    support: "Підтримка",
    theme: "🎨 Змінити тему",
    lang: "🌐 Укр / Eng",
    supportMenu: "🛠 Техпідтримка",
    donateMenu: "💛 Підтримати",
    admin: "🧠 Адмін-панель",
    logout: "🚪 Вийти"
  },
  en: {
    login: "Sign in",
    report: "📊 Report",
    reportLbl: "Report",
    about: "About",
    donate: "Donate",
    support: "Support",
    theme: "🎨 Change theme",
    lang: "🌐 Ua / En",
    supportMenu: "🛠 Technical support",
    donateMenu: "💛 Donate",
    admin: "🧠 Admin panel",
    logout: "🚪 Log out"
  }
};

function currentTheme(): string {
  return (
    localStorage.getItem(THEME_KEY) ||
    state.user?.theme ||
    state.publicSettings?.default_theme ||
    "dark"
  );
}

function applyTheme(theme: string): void {
  const root = document.documentElement;

  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = prefersDark ? "dark" : "light";
  } else {
    root.dataset.theme = theme;
  }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (meta) {
    meta.content = root.dataset.theme === "light" ? "#e9eef7" : "#000000";
  }
}

async function patchProfile(patch: Record<string, unknown>): Promise<void> {
  if (!state.user) return;

  try {
    const data = await api("/api/auth/profile", "PATCH", patch);
    if (data?.user) state.user = data.user;
  } catch {
    // profile patch is not critical
  }
}

function cycleTheme(): void {
  const order = ["dark", "light", "system"];
  const current = currentTheme();
  const idx = order.indexOf(current);
  const next = order[(idx + 1 + order.length) % order.length];

  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);

  void patchProfile({ theme: next });

  showToast(
    next === "dark"
      ? "Тема: темна"
      : next === "light"
        ? "Тема: світла"
        : "Тема: системна",
    "ok",
    "🎨"
  );
}

function currentLang(): string {
  return (
    localStorage.getItem(LANG_KEY) ||
    state.user?.lang ||
    state.publicSettings?.default_lang ||
    "uk"
  );
}

function applyLang(lang: string): void {
  document.documentElement.lang = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyI18n();
}

function toggleLang(): void {
  const next = currentLang() === "uk" ? "en" : "uk";

  applyLang(next);
  void patchProfile({ lang: next });

  showToast(next === "uk" ? "Мова: українська" : "Language: English", "ok", "🌐");
}

function setText(selector: string, text: string): void {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = text;
  });
}

function applyI18n(): void {
  const lang = currentLang();
  const d = I18N[lang] || I18N.uk;

  setText('.topbar__nav [data-nav="report"]', d.report);
  setText('.topbar__nav [data-nav="about"]', d.about);
  setText('.topbar__nav [data-nav="donate"]', d.donate);
  setText('.topbar__nav [data-nav="support"]', d.support);

  setText('.tabbar [data-nav="report"] .tabbar__lbl', d.reportLbl);
  setText('.tabbar [data-nav="about"] .tabbar__lbl', d.about);
  setText('.tabbar [data-nav="donate"] .tabbar__lbl', d.donate);
  setText('.tabbar [data-nav="support"] .tabbar__lbl', d.support);

  if (!state.user) {
    loginOpenBtn.textContent = d.login;
  }

  setText('[data-user-action="theme"]', d.theme);
  setText('[data-user-action="lang"]', d.lang);
  setText('[data-user-action="support"]', d.supportMenu);
  setText('[data-user-action="donate"]', d.donateMenu);
  setText('[data-user-action="admin"]', d.admin);
  setText('[data-user-action="logout"]', d.logout);
}

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (currentTheme() === "system") {
      applyTheme("system");
    }
  });

// ============================================================
// AUTH UI
// ============================================================

function openOverlay(el: HTMLElement): void {
  el.dataset.open = "true";
}

function closeOverlay(el: HTMLElement): void {
  el.dataset.open = "false";
}

function openAuth(view: string = "login"): void {
  showAuthView(view);
  openOverlay(authOverlay);
}

function closeAuth(): void {
  closeOverlay(authOverlay);
}

function showAuthView(name: string): void {
  document.querySelectorAll<HTMLElement>("[data-auth-view]").forEach((el) => {
    el.hidden = el.getAttribute("data-auth-view") !== name;
  });

  if (name === "register") {
    setRegisterStep(1);
  }
}

function showMessage(el: HTMLElement, text: string, ok = false): void {
  el.hidden = false;
  el.textContent = text;
  el.className = `ud-message ${ok ? "ud-message--ok" : "ud-message--error"}`;
}

function hideMessage(el: HTMLElement): void {
  el.hidden = true;
  el.textContent = "";
}

function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  state.user = user;

  if (user.theme) {
    localStorage.setItem(THEME_KEY, user.theme);
  }

  if (user.lang) {
    localStorage.setItem(LANG_KEY, user.lang);
  }

  applyTheme(currentTheme());
  applyLang(currentLang());
  renderAuthState();
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  state.user = null;
  renderAuthState();
}

function renderAuthState(): void {
  if (state.user) {
    loginOpenBtn.hidden = true;
    userArea.hidden = false;
    userNickname.textContent = state.user.nickname;

    const isAdmin = ["admin", "owner"].includes(state.user.role);
    adminPanelBtn.hidden = !isAdmin;
  } else {
    loginOpenBtn.hidden = false;
    userArea.hidden = true;
    userArea.dataset.open = "false";
    adminPanelBtn.hidden = true;
  }

  applyI18n();
}

async function initAuthAndSettings(): Promise<void> {
  try {
    const data = await api("/api/settings/public", "GET");
    state.publicSettings = data?.settings || {};

    const donationUrl = state.publicSettings.donation_url;

    if (donationUrl) {
      donateLink.href = donationUrl;
    }
  } catch {
    // settings are optional
  }

  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    renderAuthState();
    return;
  }

  try {
    const data = await api("/api/auth/me", "GET");
    state.user = data.user;

    if (data.user?.theme) {
      localStorage.setItem(THEME_KEY, data.user.theme);
    }

    if (data.user?.lang) {
      localStorage.setItem(LANG_KEY, data.user.lang);
    }

    applyTheme(currentTheme());
    applyLang(currentLang());
    renderAuthState();
  } catch {
    clearSession();
  }
}

// ============================================================
// REGISTER STEPS
// ============================================================

let registerStep = 1;

function setRegisterStep(step: number): void {
  registerStep = step;
  registerForm.dataset.step = String(step);

  document.querySelectorAll<HTMLElement>("[data-register-step]").forEach((el) => {
    el.hidden = el.getAttribute("data-register-step") !== String(step);
  });

  hideMessage(registerMessage);
}

document.querySelectorAll("[data-auth-switch]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = (btn as HTMLElement).dataset.authSwitch || "login";
    showAuthView(view);
  });
});

document.querySelectorAll("[data-auth-close]").forEach((el) => {
  el.addEventListener("click", closeAuth);
});

document.querySelectorAll("[data-register-next]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (registerStep === 1) {
      const nick = registerNickname.value.trim();

      if (nick.length < 3) {
        showMessage(registerMessage, "Нік закороткий. Мінімум 3 символи.");
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

document.querySelectorAll("[data-register-back]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (registerStep > 1) {
      setRegisterStep(registerStep - 1);
    }
  });
});

// ============================================================
// AUTH FORMS
// ============================================================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  hideMessage(loginMessage);

  try {
    const data = await api("/api/auth/login", "POST", {
      login: loginIdentifier.value.trim(),
      password: loginPassword.value
    });

    saveSession(data.token, data.user);
    closeAuth();
    showToast(`Вітаємо, ${data.user.nickname}`, "ok", "🛡️");
  } catch (err) {
    showMessage(loginMessage, String((err as Error).message || err));
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  hideMessage(registerMessage);

  const password = registerPassword.value;
  const passwordRepeat = registerPasswordRepeat.value;

  if (password.length < 8) {
    showMessage(registerMessage, "Пароль має бути мінімум 8 символів.");
    return;
  }

  if (password !== passwordRepeat) {
    showMessage(registerMessage, "Паролі не співпадають.");
    return;
  }

  try {
    const data = await api("/api/auth/register", "POST", {
      nickname: registerNickname.value.trim(),
      email: registerEmail.value.trim(),
      password,
      password_repeat: passwordRepeat
    });

    saveSession(data.token, data.user);
    closeAuth();
    showToast(`Акаунт створено. Вітаємо, ${data.user.nickname}`, "ok", "✅");
  } catch (err) {
    showMessage(registerMessage, String((err as Error).message || err));
  }
});

forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  hideMessage(forgotMessage);

  try {
    const data = await api("/api/auth/password/forgot", "POST", {
      email: forgotEmail.value.trim()
    });

    if (data?.debug_token) {
      showAuthView("reset");
      resetToken.value = data.debug_token;
      showMessage(resetMessage, "Debug token підставлено автоматично.", true);
      return;
    }

    showMessage(forgotMessage, "Якщо email існує, відновлення надіслано.", true);
  } catch (err) {
    showMessage(forgotMessage, String((err as Error).message || err));
  }
});

resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  hideMessage(resetMessage);

  const password = resetPassword.value;
  const passwordRepeat = resetPasswordRepeat.value;

  if (password.length < 8) {
    showMessage(resetMessage, "Пароль має бути мінімум 8 символів.");
    return;
  }

  if (password !== passwordRepeat) {
    showMessage(resetMessage, "Паролі не співпадають.");
    return;
  }

  try {
    await api("/api/auth/password/reset", "POST", {
      token: resetToken.value.trim(),
      password,
      password_repeat: passwordRepeat
    });

    showAuthView("login");
    showMessage(loginMessage, "Пароль змінено. Тепер увійдіть.", true);
  } catch (err) {
    showMessage(resetMessage, String((err as Error).message || err));
  }
});

loginOpenBtn.addEventListener("click", () => {
  openAuth("login");
});

// ============================================================
// USER MENU
// ============================================================

userMenuBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  userArea.dataset.open =
    userArea.dataset.open === "true" ? "false" : "true";
});

document.addEventListener("click", () => {
  userArea.dataset.open = "false";
});

document
  .getElementById("userMenu")
  ?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

document.querySelectorAll<HTMLElement>("[data-user-action]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const action = btn.dataset.userAction;

    userArea.dataset.open = "false";

    if (!state.user) {
      openAuth("login");
      return;
    }

    if (action === "theme") {
      cycleTheme();
      return;
    }

    if (action === "lang") {
      toggleLang();
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
      try {
        await api("/api/auth/logout", "POST");
      } catch {
        // ignore
      }

      clearSession();
      showToast("Ви вийшли з акаунта", "ok", "🚪");
    }
  });
});

// ============================================================
// DONATE
// ============================================================

function openDonate(): void {
  hideMessage(donateMessage);
  openOverlay(donateOverlay);
}

function closeDonate(): void {
  closeOverlay(donateOverlay);
}

document.querySelectorAll("[data-donate-close]").forEach((el) => {
  el.addEventListener("click", closeDonate);
});

donateCopyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(donateLink.href);
    showMessage(donateMessage, "Посилання скопійовано.", true);
  } catch {
    showMessage(donateMessage, "Не вдалося скопіювати посилання.");
  }
});

// ============================================================
// SUPPORT
// ============================================================

function openSupport(): void {
  openOverlay(supportOverlay);

  if (!state.user) {
    supportAuthRequired.hidden = false;
    supportApp.hidden = true;
    return;
  }

  supportAuthRequired.hidden = true;
  supportApp.hidden = false;

  void showSupportList();
}

function closeSupport(): void {
  closeOverlay(supportOverlay);
}

document.querySelectorAll("[data-support-close]").forEach((el) => {
  el.addEventListener("click", closeSupport);
});

supportGoLoginBtn.addEventListener("click", () => {
  closeSupport();
  openAuth("login");
});

async function showSupportList(): Promise<void> {
  supportTicketsList.hidden = false;
  supportTicketView.hidden = true;
  supportNewForm.hidden = true;

  await loadSupportTickets();
}

async function loadSupportTickets(): Promise<void> {
  if (!state.user) return;

  try {
    const data = await api("/api/support/tickets", "GET");

    const tickets = Array.isArray(data?.tickets) ? data.tickets : [];

    if (!tickets.length) {
      supportTicketsList.innerHTML = `
        <div class="admin__empty">
          Поки що немає звернень.
        </div>
      `;
      return;
    }

    supportTicketsList.innerHTML = tickets
      .map((t: any) => {
        const status = escapeHtml(t.status || "open");
        const badge =
          status === "open"
            ? "ud-badge--open"
            : status === "answered"
              ? "ud-badge--answered"
              : "ud-badge--closed";

        return `
          <div class="support-ticket" data-ticket-id="${Number(t.id)}">
            <div class="support-ticket__top">
              <div class="support-ticket__title">${escapeHtml(t.subject)}</div>
              <span class="ud-badge ${badge}">${status}</span>
            </div>
            <div class="support-ticket__meta">
              ${escapeHtml(t.category || "other")} · ${fmtDateTime(t.updated_at || t.created_at)}
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    supportTicketsList.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((err as Error).message || err))}
      </div>
    `;
  }
}

supportTicketsList.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest("[data-ticket-id]");

  if (!target) return;

  const ticketId = Number(target.getAttribute("data-ticket-id"));

  if (Number.isFinite(ticketId)) {
    void openSupportTicket(ticketId);
  }
});

async function openSupportTicket(ticketId: number): Promise<void> {
  if (!state.user) {
    openAuth("login");
    return;
  }

  closeOverlay(adminOverlay);

  state.supportTicketId = ticketId;

  supportAuthRequired.hidden = true;
  supportApp.hidden = false;

  supportTicketsList.hidden = true;
  supportNewForm.hidden = true;
  supportTicketView.hidden = false;

  await loadSupportTicket();

  openOverlay(supportOverlay);
}

async function loadSupportTicket(): Promise<void> {
  if (!state.user || !state.supportTicketId) return;

  try {
    const data = await api(`/api/support/tickets/${state.supportTicketId}`, "GET");

    const ticket = data?.ticket;
    const messages = Array.isArray(data?.messages) ? data.messages : [];

    if (!ticket) {
      throw new Error("ticket not found");
    }

    supportTicketSubject.textContent = ticket.subject;
    supportTicketStatus.textContent = ticket.status;

    supportTicketStatus.className =
      "ud-badge " +
      (ticket.status === "open"
        ? "ud-badge--open"
        : ticket.status === "answered"
          ? "ud-badge--answered"
          : "ud-badge--closed");

    const isStaff = ["support", "admin", "owner"].includes(state.user.role);

    supportMessageText.disabled =
      ticket.status === "closed" && !isStaff;

    supportMessages.innerHTML = messages
      .map((m: any) => {
        const admin = !!m.is_admin;

        return `
          <div class="support-message ${admin ? "support-message--admin" : ""}">
            <div class="support-message__head">
              <span>${admin ? "Підтримка" : escapeHtml(m.nickname || "Користувач")}</span>
              <span>${fmtDateTime(m.created_at)}</span>
            </div>
            <div class="support-message__body">${escapeHtml(m.body)}</div>
          </div>
        `;
      })
      .join("");

    supportMessages.scrollTop = supportMessages.scrollHeight;
  } catch (err) {
    supportMessages.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((err as Error).message || err))}
      </div>
    `;
  }
}

supportBackBtn.addEventListener("click", () => {
  void showSupportList();
});

supportRefreshBtn.addEventListener("click", () => {
  if (supportTicketView.hidden) {
    void loadSupportTickets();
  } else {
    void loadSupportTicket();
  }
});

supportNewTicketBtn.addEventListener("click", () => {
  supportTicketsList.hidden = true;
  supportTicketView.hidden = true;
  supportNewForm.hidden = false;
});

supportCancelNewBtn.addEventListener("click", () => {
  void showSupportList();
});

supportNewForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await api("/api/support/tickets", "POST", {
      category: supportCategory.value,
      subject: supportSubject.value.trim(),
      body: supportBody.value.trim()
    });

    supportSubject.value = "";
    supportBody.value = "";

    showToast("Звернення створено", "ok", "🛠");

    await showSupportList();
  } catch (err) {
    showToast(String((err as Error).message || err), "warn", "⚠️");
  }
});

supportMessageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!state.supportTicketId) return;

  const body = supportMessageText.value.trim();

  if (!body) return;

  try {
    await api(`/api/support/tickets/${state.supportTicketId}/messages`, "POST", {
      body
    });

    supportMessageText.value = "";

    await loadSupportTicket();
  } catch (err) {
    showToast(String((err as Error).message || err), "warn", "⚠️");
  }
});

// ============================================================
// ADMIN
// ============================================================

function openAdmin(): void {
  if (!state.user || !["admin", "owner"].includes(state.user.role)) {
    showToast("Недостатньо прав", "warn", "⛔");
    return;
  }

  openOverlay(adminOverlay);
  void loadAdminTab(state.adminTab);
}

function closeAdmin(): void {
  closeOverlay(adminOverlay);
}

document.querySelectorAll("[data-admin-close]").forEach((el) => {
  el.addEventListener("click", closeAdmin);
});

document.querySelectorAll<HTMLElement>(".admin__tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const name = tab.dataset.adminTab || "tickets";

    state.adminTab = name;

    document.querySelectorAll(".admin__tab").forEach((el) => {
      el.classList.toggle("admin__tab--on", el === tab);
    });

    document.querySelectorAll<HTMLElement>(".admin__pane").forEach((pane) => {
      pane.hidden = pane.getAttribute("data-admin-pane") !== name;
    });

    void loadAdminTab(name);
  });
});

async function loadAdminTab(tab: string): Promise<void> {
  if (tab === "tickets") {
    await loadAdminTickets();
    return;
  }

  if (tab === "users") {
    await loadAdminUsers();
    return;
  }

  if (tab === "sources") {
    await loadAdminSources();
    return;
  }

  if (tab === "reports") {
    await loadAdminReports();
    return;
  }

  if (tab === "logs") {
    await loadAdminLogs();
    return;
  }

  if (tab === "settings") {
    await loadAdminSettings();
    return;
  }

  if (tab === "analytics") {
    await loadAdminAnalytics();
    return;
  }
}

async function loadAdminTickets(): Promise<void> {
  try {
    const status = adminTicketFilter.value;
    const path = status
      ? `/api/admin/tickets?status=${encodeURIComponent(status)}`
      : "/api/admin/tickets";

    const data = await api(path, "GET");
    const tickets = Array.isArray(data?.tickets) ? data.tickets : [];

    if (!tickets.length) {
      adminTickets.innerHTML = `
        <div class="admin__empty">
          Тикетів немає.
        </div>
      `;
      return;
    }

    adminTickets.innerHTML = tickets
      .map((t: any) => {
        const status = escapeHtml(t.status || "open");

        const badge =
          status === "open"
            ? "ud-badge--open"
            : status === "answered"
              ? "ud-badge--answered"
              : "ud-badge--closed";

        const closeBtn =
          status === "closed"
            ? `<button class="ud-btn ud-btn--ghost" style="padding:6px 9px;font-size:11px;" data-action="reopen" data-id="${Number(t.id)}">Reopen</button>`
            : `<button class="ud-btn ud-btn--ghost" style="padding:6px 9px;font-size:11px;" data-action="close" data-id="${Number(t.id)}">Close</button>`;

        return `
          <div class="admin-row">
            <div class="admin-row__top">
              <div class="admin-row__title">${escapeHtml(t.subject)}</div>
              <span class="ud-badge ${badge}">${status}</span>
            </div>
            <div class="admin-row__meta">
              #${Number(t.id)} · ${escapeHtml(t.user_nickname || "unknown")} · ${escapeHtml(t.category || "other")} · ${fmtDateTime(t.updated_at)}
            </div>
            <div class="ud-row" style="margin-top:10px;">
              <button class="ud-btn" style="padding:6px 9px;font-size:11px;" data-action="open" data-id="${Number(t.id)}">
                Відкрити
              </button>
              ${closeBtn}
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    adminTickets.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((err as Error).message || err))}
      </div>
    `;
  }
}

adminTickets.addEventListener("click", async (e) => {
  const target = (e.target as HTMLElement).closest("[data-action]");

  if (!target) return;

  const action = target.getAttribute("data-action");
  const id = Number(target.getAttribute("data-id"));

  if (!Number.isFinite(id)) return;

  if (action === "open") {
    void openSupportTicket(id);
    return;
  }

  try {
    if (action === "close") {
      await api(`/api/admin/tickets/${id}/close`, "POST");
      showToast("Тикет закрито", "ok", "✅");
    }

    if (action === "reopen") {
      await api(`/api/admin/tickets/${id}/reopen`, "POST");
      showToast("Тикет відкрито знову", "ok", "🔁");
    }

    await loadAdminTickets();
  } catch (err) {
    showToast(String((err as Error).message || err), "warn", "⚠️");
  }
});

adminTicketFilter.addEventListener("change", () => {
  void loadAdminTickets();
});

adminTicketsRefreshBtn.addEventListener("click", () => {
  void loadAdminTickets();
});

async function loadAdminUsers(): Promise<void> {
  try {
    const data = await api("/api/admin/users", "GET");
    const users = Array.isArray(data?.users) ? data.users : [];

    if (!users.length) {
      adminUsers.innerHTML = `
        <div class="admin__empty">
          Користувачів немає.
        </div>
      `;
      return;
    }

    adminUsers.innerHTML = users
      .map((u: any) => {
        const active = !!u.is_active;

        return `
          <div class="admin-row">
            <div class="admin-row__top">
              <div class="admin-row__title">${escapeHtml(u.nickname)}</div>
              <span class="ud-badge">${escapeHtml(u.role)}</span>
            </div>

            <div class="admin-row__meta">
              ${escapeHtml(u.email)} · ${active ? "active" : "disabled"} · ${fmtDateTime(u.created_at)}
            </div>

            <div class="ud-row" style="margin-top:10px; flex-wrap:wrap;">
              <button class="ud-btn ud-btn--ghost" style="padding:6px 9px;font-size:11px;" data-action="role" data-role="user" data-id="${Number(u.id)}">
                user
              </button>

              <button class="ud-btn ud-btn--ghost" style="padding:6px 9px;font-size:11px;" data-action="role" data-role="support" data-id="${Number(u.id)}">
                support
              </button>

              <button class="ud-btn ud-btn--ghost" style="padding:6px 9px;font-size:11px;" data-action="role" data-role="admin" data-id="${Number(u.id)}">
                admin
              </button>

              <button class="ud-btn" style="padding:6px 9px;font-size:11px;" data-action="toggle-active" data-id="${Number(u.id)}">
                ${active ? "Ban" : "Unban"}
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    adminUsers.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((err as Error).message || err))}
      </div>
    `;
  }
}

adminUsers.addEventListener("click", async (e) => {
  const target = (e.target as HTMLElement).closest("[data-action]");

  if (!target) return;

  const action = target.getAttribute("data-action");
  const id = Number(target.getAttribute("data-id"));
  const role = target.getAttribute("data-role");

  if (!Number.isFinite(id)) return;

  try {
    if (action === "role" && role) {
      await api(`/api/admin/users/${id}/role`, "POST", { role });
      showToast("Роль оновлено", "ok", "🧠");
    }

    if (action === "toggle-active") {
      const row = target.closest(".admin-row");
      const meta = row?.querySelector(".admin-row__meta")?.textContent || "";
      const isActive = meta.includes("active") && !meta.includes("disabled");

      await api(`/api/admin/users/${id}/active`, "POST", {
        is_active: !isActive
      });

      showToast(isActive ? "Акаунт заблоковано" : "Акаунт розблоковано", "ok", "🛡️");
    }

    await loadAdminUsers();
  } catch (err) {
    showToast(String((err as Error).message || err), "warn", "⚠️");
  }
});

adminUsersRefreshBtn.addEventListener("click", () => {
  void loadAdminUsers();
});

async function loadAdminSources(): Promise<void> {
  try {
    const data = await api("/api/admin/source-status", "GET");
    const sources = Array.isArray(data?.sources) ? data.sources : [];

    if (!sources.length) {
      adminSources.innerHTML = `
        <div class="admin__empty">
          Джерел немає.
        </div>
      `;
      return;
    }

    adminSources.innerHTML = sources
      .map((s: any) => {
        return `
          <div class="admin-row">
            <div class="admin-row__top">
              <div class="admin-row__title">@${escapeHtml(s.handle)}</div>
              <span class="ud-badge ${s.active ? "ud-badge--answered" : "ud-badge--closed"}">
                ${s.active ? "active" : "inactive"}
              </span>
            </div>

            <div class="admin-row__meta">
              ${escapeHtml(s.kind || "universal")} · weight ${Number(s.weight ?? 1).toFixed(2)}
              <br />
              last success: ${fmtDateTime(s.last_success_at)}
              <br />
              last error: ${escapeHtml(s.last_error || "—")}
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    adminSources.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((err as Error).message || err))}
      </div>
    `;
  }
}

adminSourcesRefreshBtn.addEventListener("click", () => {
  void loadAdminSources();
});

async function loadAdminReports(): Promise<void> {
  try {
    const data = await api("/api/admin/event-reports", "GET");
    const reports = Array.isArray(data?.reports) ? data.reports : [];

    if (!reports.length) {
      adminReports.innerHTML = `
        <div class="admin__empty">
          Скарг немає.
        </div>
      `;
      return;
    }

    adminReports.innerHTML = reports
      .map((r: any) => {
        return `
          <div class="admin-row">
            <div class="admin-row__top">
              <div class="admin-row__title">${escapeHtml(r.event_hash || "event")}</div>
              <span class="ud-badge">${escapeHtml(r.status || "new")}</span>
            </div>

            <div class="admin-row__meta">
              ${escapeHtml(r.reporter_nickname || "unknown")} · ${fmtDateTime(r.created_at)}
              <br />
              ${escapeHtml(r.comment || "")}
            </div>

            <div class="ud-row" style="margin-top:10px;">
              <button class="ud-btn ud-btn--ghost" style="padding:6px 9px;font-size:11px;" data-action="report-false" data-id="${Number(r.id)}">
                False
              </button>

              <button class="ud-btn" style="padding:6px 9px;font-size:11px;" data-action="report-resolved" data-id="${Number(r.id)}">
                Resolved
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    adminReports.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((err as Error).message || err))}
      </div>
    `;
  }
}

adminReports.addEventListener("click", async (e) => {
  const target = (e.target as HTMLElement).closest("[data-action]");

  if (!target) return;

  const action = target.getAttribute("data-action");
  const id = Number(target.getAttribute("data-id"));

  if (!Number.isFinite(id)) return;

  try {
    if (action === "report-false") {
      await api(`/api/admin/event-reports/${id}/status`, "POST", {
        status: "false"
      });

      showToast("Скаргу позначено як false", "ok", "🚫");
    }

    if (action === "report-resolved") {
      await api(`/api/admin/event-reports/${id}/status`, "POST", {
        status: "resolved"
      });

      showToast("Скаргу закрито", "ok", "✅");
    }

    await loadAdminReports();
  } catch (err) {
    showToast(String((err as Error).message || err), "warn", "⚠️");
  }
});

adminReportsRefreshBtn.addEventListener("click", () => {
  void loadAdminReports();
});

async function loadAdminLogs(): Promise<void> {
  try {
    const data = await api("/api/admin/logs", "GET");
    const logs = Array.isArray(data?.logs) ? data.logs : [];

    if (!logs.length) {
      adminLogs.innerHTML = `
        <div class="admin__empty">
          Логів немає.
        </div>
      `;
      return;
    }

    adminLogs.innerHTML = logs
      .map((l: any) => {
        return `
          <div class="admin-row">
            <div class="admin-row__top">
              <div class="admin-row__title">${escapeHtml(l.action)}</div>
              <span class="ud-badge">${escapeHtml(l.admin_nickname || "system")}</span>
            </div>

            <div class="admin-row__meta">
              target: ${escapeHtml(l.target || "—")}
              <br />
              ${fmtDateTime(l.created_at)}
              <br />
              ${escapeHtml(l.details || "")}
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    adminLogs.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((err as Error).message || err))}
      </div>
    `;
  }
}

adminLogsRefreshBtn.addEventListener("click", () => {
  void loadAdminLogs();
});

async function loadAdminSettings(): Promise<void> {
  try {
    const data = await api("/api/admin/settings", "GET");
    const settings = Array.isArray(data?.settings) ? data.settings : [];

    if (!settings.length) {
      adminSettingsList.innerHTML = `
        <div class="admin__empty">
          Налаштувань немає.
        </div>
      `;
      return;
    }

    adminSettingsList.innerHTML = settings
      .map((s: any) => {
        return `
          <div class="admin-row">
            <div class="admin-row__top">
              <div class="admin-row__title">${escapeHtml(s.key)}</div>
            </div>

            <div class="admin-row__meta">
              ${escapeHtml(s.value)}
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    adminSettingsList.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((err as Error).message || err))}
      </div>
    `;
  }
}

adminSettingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await api("/api/admin/settings", "POST", {
      key: adminSettingKey.value.trim(),
      value: adminSettingValue.value.trim()
    });

    showToast("Налаштування збережено", "ok", "⚙️");

    adminSettingValue.value = "";

    await loadAdminSettings();
  } catch (err) {
    showToast(String((err as Error).message || err), "warn", "⚠️");
  }
});

adminSettingsRefreshBtn.addEventListener("click", () => {
  void loadAdminSettings();
});

async function loadAdminAnalytics(): Promise<void> {
  try {
    const data = await api("/api/admin/analytics/summary", "GET");
    const s = data?.summary || {};

    adminAnalyticsSummary.innerHTML = `
      <div class="admin__stat">
        <b>${Number(s.users_total ?? 0)}</b>
        <span>users</span>
      </div>

      <div class="admin__stat">
        <b>${Number(s.tickets_open ?? 0)}</b>
        <span>open tickets</span>
      </div>

      <div class="admin__stat">
        <b>${Number(s.events_24h ?? 0)}</b>
        <span>events 24h</span>
      </div>

      <div class="admin__stat">
        <b>${Number(s.alerts_24h ?? 0)}</b>
        <span>alerts 24h</span>
      </div>
    `;

    adminAnalyticsExtra.innerHTML = `
      <div class="admin__empty">
        Розширена аналітика буде додана наступним етапом.
      </div>
    `;
  } catch (err) {
    adminAnalyticsSummary.innerHTML = "";

    adminAnalyticsExtra.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((err as Error).message || err))}
      </div>
    `;
  }
}

adminAnalyticsRefreshBtn.addEventListener("click", () => {
  void loadAdminAnalytics();
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

document.querySelectorAll("[data-nav-close='about']").forEach((el) => {
  el.addEventListener("click", closeAbout);
});

// ============================================================
// NAVIGATION
// ============================================================

async function openSummary(): Promise<void> {
  try {
    lastNight = await fetchNight(12);
  } catch (e) {
    console.warn("night failed", e);
  }

  summary.open(lastEvents, lastData, lastNight);
}

document.querySelectorAll<HTMLElement>("[data-nav]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const nav = btn.dataset.nav;

    if (nav === "report") {
      void openSummary();
      return;
    }

    if (nav === "about") {
      openAbout();
      return;
    }

    if (nav === "donate") {
      openDonate();
      return;
    }

    if (nav === "support") {
      openSupport();
      return;
    }
  });
});

// ============================================================
// CLOCK / STATUS / POLLING
// ============================================================

function tickClock(): void {
  const el = document.getElementById("clock")!;

  el.textContent = new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

setInterval(tickClock, 1000);
tickClock();

function updateStatusStrip(data: AlertResponse): void {
  const strip = document.getElementById("statusStrip")!;
  const text = document.getElementById("statusText")!;

  const kyiv = data.regions.find(
    (r) => r.key === "kyiv_city" || r.key === "kyiv_oblast"
  );

  const kyivAlert = kyiv?.alert ?? false;

  strip.dataset.state = kyivAlert ? "alert" : "calm";

  text.textContent = kyivAlert
    ? `ПОВІТРЯНА ТРИВОГА · КИЇВ ТА ОБЛАСТЬ · АКТИВНИХ РЕГІОНІВ: ${data.active_alerts}`
    : `УСЕ ЧИСТО · ТРИМАЙМОСЬ · АКТИВНИХ РЕГІОНІВ: ${data.active_alerts}`;
}

async function pollEvents(): Promise<void> {
  try {
    const region = drawer.currentKey() || "kyiv";

    const data = await fetchEvents(region);

    lastEvents = data.events;

    map?.setTrajectories(lastEvents);

    if (drawer.isOpen()) {
      drawer.setEvents(lastEvents);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    console.error("events failed", msg);

    if (drawer.isOpen()) {
      drawer.setError(msg);
    }
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
      const r = data.regions.find((x) => x.key === openKey);

      if (r) {
        drawer.updateRegion(r);
      }
    }
  } catch (e) {
    console.error("poll failed", e);
  }
}

// ============================================================
// ESCAPE / GLOBAL CLOSE
// ============================================================

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;

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
    closeAuth();
    return;
  }

  if (aboutOverlay.dataset.open === "true") {
    closeAbout();
    return;
  }
});

// ============================================================
// INIT
// ============================================================

map = new ThreatMap("map", (key) => {
  const r = lastData?.regions.find((x) => x.key === key);

  if (r) {
    drawer.open(r);
    void pollEvents();
  }
});

const origOpen = drawer.open.bind(drawer);

drawer.open = (r) => {
  origOpen(r);
  map?.clearPin();
  void pollEvents();
};

const origClose = drawer.close.bind(drawer);

drawer.close = () => {
  origClose();
  map?.clearPin();
};

applyTheme(currentTheme());
applyLang(currentLang());
renderAuthState();

void initAuthAndSettings();

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
    navigator.serviceWorker.register("/sw.js").catch((e) => {
      console.warn("sw register failed", e);
    });
  });
}

hideLoader();
