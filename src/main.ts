import { fetchAlerts, fetchEvents } from "./api";
import { ThreatMap } from "./map";
import { Drawer } from "./panel";
import type { AlertResponse, ThreatEvent, Region } from "./types";

// ============================================================
// GLOBAL STATE
// ============================================================

let lastAlerts: AlertResponse | null = null;
let lastEvents: ThreatEvent[] = [];
let pollTimer: number | null = null;
let drawer: Drawer;
let map: ThreatMap;

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

  drawer = new Drawer({
    onHoverToponym: (key) => map.setHighlight(key),
    onFlyToponym: (key) => map.flyToponym(key),
    onRetry: () => { void pollEvents(); }
  });

  map = new ThreatMap("map", (key) => {
    const r = lastAlerts?.regions.find((x) => x.key === key);
    if (r) {
      drawer.open(r);
      if (r.active) void pollEvents(key);
    }
  });

  setupNavigation();
  setupKeyboard();

  // Первый poll
  await pollAlerts();
  await pollEvents();

  // Запускаем интервал
  startPolling();

  // Скрываем loader
  hideLoader();
}

// ============================================================
// POLLING — ГЛАВНОЕ ИСПРАВЛЕНИЕ
// ============================================================

async function pollAlerts() {
  try {
    const data = await fetchAlerts();
    lastAlerts = data;

    console.log(`[UD] Alerts: ${data.active_alerts} active out of ${data.regions.length}`);

    // 🔥 ОБНОВЛЯЕМ КАРТУ
    map.updateAlerts(data.regions);
    
    // 🔥 ОБНОВЛЯЕМ STATUS STRIP
    updateStatusStrip(data.regions);

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
// NAVIGATION
// ============================================================

function setupNavigation() {
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

  document.querySelectorAll(
    "[data-nav-close], [data-auth-close], [data-support-close], [data-donate-close], [data-admin-close]"
  ).forEach(btn => {
    btn.addEventListener("click", () => {
      const overlay = btn.closest("[data-open]");
      if (overlay) (overlay as HTMLElement).dataset.open = "false";
    });
  });

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
  `;
}

// ============================================================
// LOADER
// ============================================================

function hideLoader() {
  const loader = document.getElementById("loader");
  if (!loader) return;

  (loader as HTMLElement).dataset.hidden = "true";
  setTimeout(() => loader.remove(), 600);
}

setTimeout(() => {
  const loader = document.getElementById("loader");
  if (loader && (loader as HTMLElement).dataset.hidden !== "true") {
    (loader as HTMLElement).dataset.state = "error";
  }
}, 8000);

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
