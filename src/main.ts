import { fetchAlerts, fetchEvents, fetchNight } from "./api";
import { ThreatMap } from "./map";
import { Drawer } from "./panel";
import { SummaryOverlay } from "./summary";
import { initAuth, onAuthStateChange } from "./auth";
import { initLoader } from "./loader";
import { initTheme } from "./theme";
import { initSupport } from "./support";
import { initDonate } from "./donate";
import { initAdmin } from "./admin";
import { initI18n } from "./i18n";
import type { AlertResponse, ThreatEvent, NightResponse, Region } from "./types";

// ============================================================
// GLOBAL STATE
// ============================================================

let lastAlerts: AlertResponse | null = null;
let lastEvents: ThreatEvent[] = [];
let lastNight: NightResponse | null = null;
let pollTimer: number | null = null;
let drawer: Drawer;
let map: ThreatMap;
let summaryOverlay: SummaryOverlay;

// ============================================================
// ERROR HANDLING
// ============================================================

window.addEventListener("unhandledrejection", (e) => {
  console.error("[UD] Unhandled rejection:", e.reason);
  toast({ text: "Сталася помилка. Спробуйте оновити сторінку.", kind: "warn" });
});

window.addEventListener("error", (e) => {
  console.error("[UD] Global error:", e.error);
  toast({ text: "Непередбачена помилка", kind: "warn" });
});

// ============================================================
// INIT
// ============================================================

async function init() {
  console.log("[UD] Initializing Ukraine Defender...");

  // Инициализация всех модулей (сохраняем оригинальный функционал)
  initTheme();
  initI18n();
  initAuth();
  initSupport();
  initDonate();
  initAdmin();

  summaryOverlay = new SummaryOverlay();

  drawer = new Drawer({
    onHoverToponym: (key) => map.setHighlight(key),
    onFlyToponym: (key) => map.flyToponym(key),
    onRetry: () => { void pollEvents(); }
  });

  map = new ThreatMap("map", (key) => {
    const r = lastAlerts?.regions.find((x) => x.key === key);
    if (r) {
      drawer.open(r);
      if (r.alert) void pollEvents(key);
    }
  });

  setupNavigation();
  setupKeyboard();
  setupUserArea();

  // Первый poll
  await pollAlerts();
  await pollEvents();

  // Запускаем интервал
  startPolling();

  // Скрываем loader
  initLoader();
}

// ============================================================
// POLLING — ГЛАВНОЕ ИСПРАВЛЕНИЕ
// ============================================================

async function pollAlerts() {
  try {
    const data = await fetchAlerts();
    lastAlerts = data;

    console.log(`[UD] Alerts: ${data.active_alerts} active out of ${data.regions.length}`);

    // 🔥 ГЛАВНОЕ: обновляем карту и status strip
    map.updateAlerts(data.regions);
    updateStatusStrip(data.regions);
    drawer.updateAlerts(data.regions);

  } catch (e) {
    console.error("[UD] Alert poll failed:", e);
    toast({ text: "Не вдалося отримати тривоги", kind: "warn" });
  }
}

async function pollEvents(region = "kyiv") {
  try {
    const data = await fetchEvents(region);
    lastEvents = data.events;

    console.log(`[UD] Events: ${data.events_count}`);

    map.updateEvents(data.events);
    drawer.updateEvents(data.events);

  } catch (e) {
    console.error("[UD] Event poll failed:", e);
    toast({ text: "Не вдалося отримати події", kind: "warn" });
  }
}

// ============================================================
// STATUS STRIP — ПОКАЗЫВАЕМ РЕАЛЬНОЕ СОСТОЯНИЕ
// ============================================================

function updateStatusStrip(regions: Region[]) {
  const strip = document.getElementById("statusStrip");
  const text = document.getElementById("statusText");

  if (!strip || !text) return;

  const alerts = regions.filter(r => r.alert);

  if (alerts.length === 0) {
    (strip as HTMLElement).dataset.state = "calm";
    text.textContent = "УСЕ ЧИСТО · ТРИМАЙМОСЬ";
  } else {
    (strip as HTMLElement).dataset.state = "alert";
    const names = alerts.slice(0, 3).map(r => r.name_uk).join(", ");
    const suffix = alerts.length > 3 ? "..." : "";
    text.textContent = `🚨 ТРИВОГА В ${alerts.length} РЕГІОНАХ: ${names}${suffix}`;
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);

  pollTimer = window.setInterval(async () => {
    await pollAlerts();
    await pollEvents();
  }, 15000);
}

// ============================================================
// NAVIGATION — РАБОТАЕТ С ОРИГИНАЛЬНЫМИ OVERLAY
// ============================================================

function setupNavigation() {
  // Навигация через data-nav
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = (btn as HTMLElement).dataset.nav;
      if (!target) return;

      const overlay = document.getElementById(`${target}Overlay`);
      if (overlay) (overlay as HTMLElement).dataset.open = "true";

      if (target === "report") {
        void openReport();
      }
    });
  });

  // Закрытие overlay'ев через крестики
  document.querySelectorAll(
    "[data-nav-close], [data-auth-close], [data-support-close], [data-donate-close], [data-admin-close]"
  ).forEach(btn => {
    btn.addEventListener("click", () => {
      const overlay = btn.closest("[data-open]");
      if (overlay) (overlay as HTMLElement).dataset.open = "false";
    });
  });

  // Закрытие overlay'ев через клик на backdrop
  document.querySelectorAll(
    ".report-overlay__backdrop, .about-overlay__backdrop, .auth-backdrop, .support-backdrop, .donate-backdrop, .admin-backdrop"
  ).forEach(el => {
    el.addEventListener("click", () => {
      const overlay = el.closest("[data-open]");
      if (overlay) (overlay as HTMLElement).dataset.open = "false";
    });
  });
}

function setupKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll("[data-open='true']").forEach(el => {
        (el as HTMLElement).dataset.open = "false";
      });
    }
  });
}

function setupUserArea() {
  const loginBtn = document.getElementById("loginOpenBtn");
  const userArea = document.getElementById("userArea");
  const userMenuBtn = document.getElementById("userMenuBtn");
  const userMenu = document.getElementById("userMenu");

  loginBtn?.addEventListener("click", () => {
    const overlay = document.getElementById("authOverlay");
    if (overlay) (overlay as HTMLElement).dataset.open = "true";
  });

  userMenuBtn?.addEventListener("click", () => {
    if (userMenu) {
      userMenu.style.display = userMenu.style.display === "block" ? "none" : "block";
    }
  });

  // Закрытие меню при клике вне
  document.addEventListener("click", (e) => {
    if (userArea && !userArea.contains(e.target as Node) && userMenu) {
      userMenu.style.display = "none";
    }
  });

  // Обработка действий в user menu
  document.querySelectorAll("[data-user-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = (btn as HTMLElement).dataset.userAction;
      if (userMenu) userMenu.style.display = "none";

      switch (action) {
        case "theme":
          // theme.ts должен экспортировать toggleTheme
          const event = new CustomEvent("ud:toggle_theme");
          window.dispatchEvent(event);
          break;
        case "logout":
          // auth.ts должен экспортировать logout
          const logoutEvent = new CustomEvent("ud:logout");
          window.dispatchEvent(logoutEvent);
          break;
        case "support":
          const supportOverlay = document.getElementById("supportOverlay");
          if (supportOverlay) (supportOverlay as HTMLElement).dataset.open = "true";
          break;
        case "donate":
          const donateOverlay = document.getElementById("donateOverlay");
          if (donateOverlay) (donateOverlay as HTMLElement).dataset.open = "true";
          break;
        case "admin":
          const adminOverlay = document.getElementById("adminOverlay");
          if (adminOverlay) (adminOverlay as HTMLElement).dataset.open = "true";
          break;
        case "lang":
          const langEvent = new CustomEvent("ud:toggle_lang");
          window.dispatchEvent(langEvent);
          break;
      }
    });
  });
}

// ============================================================
// REPORT OVERLAY
// ============================================================

async function openReport() {
  const card = document.getElementById("reportCard");
  if (!card) return;

  if (!lastAlerts) {
    card.innerHTML = `
      <div class="rp-head">
        <span class="ud-title">Звіт</span>
        <button class="rp-close" data-nav-close="report">✕</button>
      </div>
      <p class="ud-sub">Завантаження...</p>
    `;
    return;
  }

  const alerts = lastAlerts.regions.filter(r => r.alert);

  card.innerHTML = `
    <div class="rp-head">
      <span class="ud-title">Поточний стан</span>
      <button class="rp-close" data-nav-close="report">✕</button>
    </div>
    <p class="ud-sub">${new Date(lastAlerts.updated_at).toLocaleString("uk-UA")}</p>
    <div class="rp-counters">
      <div class="rp-counter">
        <span class="rp-counter__n">${lastAlerts.regions.length}</span>
        <span class="rp-counter__l">РЕГІОНІВ</span>
      </div>
      <div class="rp-counter">
        <span class="rp-counter__n" style="color: var(--red)">${alerts.length}</span>
        <span class="rp-counter__l">ТРИВОГ</span>
      </div>
      <div class="rp-counter">
        <span class="rp-counter__n" style="color: var(--green)">${lastAlerts.regions.length - alerts.length}</span>
        <span class="rp-counter__l">ВІДБІЙ</span>
      </div>
      <div class="rp-counter">
        <span class="rp-counter__n">${lastEvents.length}</span>
        <span class="rp-counter__l">ПОДІЙ</span>
      </div>
    </div>
    ${alerts.length > 0 ? `
      <h3 style="font-family: var(--font-display); font-size: 14px; margin: 16px 0 10px; color: var(--red);">🚨 АКТИВНІ ТРИВОГИ:</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${alerts.map(r => `
          <span style="padding: 6px 12px; background: rgba(255,59,59,0.15); border: 1px solid var(--red); border-radius: 999px; font-family: var(--font-mono); font-size: 11px; color: var(--red);">
            ${r.name_uk}
          </span>
        `).join("")}
      </div>
    ` : `
      <p style="color: var(--green); font-family: var(--font-mono); font-size: 13px; padding: 20px; text-align: center;">
        ✅ Наразі тривог немає
      </p>
    `}
    ${lastEvents.length > 0 ? `
      <h3 style="font-family: var(--font-display); font-size: 14px; margin: 16px 0 10px;">ОСТАННІ ПОДІЇ:</h3>
      <div style="max-height: 300px; overflow-y: auto;">
        ${lastEvents.slice(0, 10).map(ev => `
          <div style="padding: 10px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 8px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-family: var(--font-display); font-size: 12px; font-weight: 600; color: var(--cyan);">
                ${ev.threat_type.toUpperCase()}
              </span>
              <span style="font-family: var(--font-mono); font-size: 10px; color: var(--muted);">
                ${ev.source.channel}
              </span>
            </div>
            <div style="font-size: 13px; margin-top: 4px; color: var(--text);">
              ${ev.count ? `<b>${ev.count}</b> шт. ` : ""}${ev.toponym_raw || ev.toponym_key || "—"}
            </div>
          </div>
        `).join("")}
      </div>
    ` : ""}
  `;
}

// ============================================================
// TOAST
// ============================================================

export function toast(opts: { text: string; kind?: "info" | "warn" | "ok" }) {
  const host = document.getElementById("toastHost");
  if (!host) return;

  const el = document.createElement("div");
  el.className = `toast toast--${opts.kind || "info"}`;
  el.textContent = opts.text;
  host.appendChild(el);

  setTimeout(() => {
    el.classList.add("toast--out");
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ============================================================
// CLOCK
// ============================================================

function updateClock() {
  const clock = document.getElementById("clock");
  if (!clock) return;

  const now = new Date();
  const kyiv = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Kyiv" }));
  clock.textContent = kyiv.toLocaleTimeString("uk-UA", { hour12: false });
}

setInterval(updateClock, 1000);
updateClock();

// ============================================================
// START
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  void init();
});
