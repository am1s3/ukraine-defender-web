import { fetchAlerts, fetchEvents, fetchNight } from "./api";
import { ThreatMap } from "./map";
import { Drawer } from "./panel";
import { SummaryOverlay } from "./summary";
import type { AlertResponse, ThreatEvent, NightResponse, Region } from "./types";

// ============================================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// ============================================================

let lastAlerts: AlertResponse | null = null;
let lastEvents: ThreatEvent[] = [];
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
// ИНИЦИАЛИЗАЦИЯ
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
      if (r.alert) void pollEvents(key);
    }
  });

  summaryOverlay = new SummaryOverlay();

  // Навигация
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
// POLLING ALERTS — ПОЧИНКА ТРИВОГ
// ============================================================

async function pollAlerts() {
  try {
    const data = await fetchAlerts();
    lastAlerts = data;
    
    console.log(`[UD] Alerts received: ${data.active_alerts} active`);
    
    // 🔥 ОБНОВЛЯЕМ КАРТУ — это было главной проблемой!
    map.updateAlerts(data.regions);
    
    // Обновляем status strip
    updateStatusStrip(data.regions);
    
    // Обновляем drawer если открыт
    drawer.updateAlerts(data.regions);
    
  } catch (e) {
    console.error("[UD] Alert poll failed:", e);
    toast({ text: "Не вдалося отримати тривоги", kind: "warn" });
  }
}

// ============================================================
// POLLING EVENTS
// ============================================================

async function pollEvents(region = "kyiv") {
  try {
    const data = await fetchEvents(region);
    lastEvents = data.events;
    
    console.log(`[UD] Events received: ${data.events_count}`);
    
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
    strip.dataset.state = "calm";
    text.textContent = "УСЕ ЧИСТО · ТРИМАЙМОСЬ";
  } else {
    strip.dataset.state = "alert";
    const names = alerts.slice(0, 3).map(r => r.name_uk).join(", ");
    text.textContent = `🚨 ТРИВОГА В ${alerts.length} РЕГІОНАХ: ${names}${alerts.length > 3 ? "..." : ""}`;
  }
}

// ============================================================
// POLLING INTERVAL
// ============================================================

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  
  pollTimer = window.setInterval(async () => {
    await pollAlerts();
    await pollEvents();
  }, 15000); // каждые 15 секунд
}

// ============================================================
// НАВИГАЦИЯ
// ============================================================

function setupNavigation() {
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = (btn as HTMLElement).dataset.nav;
      if (!target) return;
      
      const overlay = document.getElementById(`${target}Overlay`);
      if (overlay) {
        overlay.dataset.open = "true";
      }
      
      if (target === "report") {
        summaryOverlay.open(lastAlerts, lastEvents);
      }
    });
  });

  // Закрытие overlay'ев
  document.querySelectorAll("[data-nav-close], [data-auth-close], [data-support-close], [data-donate-close], [data-admin-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const overlay = btn.closest("[data-open]");
      if (overlay) overlay.dataset.open = "false";
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
// LOADER
// ============================================================

function hideLoader() {
  const loader = document.getElementById("loader");
  if (!loader) return;
  
  loader.dataset.hidden = "true";
  setTimeout(() => loader.remove(), 600);
}

// Fallback если init завис
setTimeout(() => {
  const loader = document.getElementById("loader");
  if (loader && loader.dataset.hidden !== "true") {
    loader.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="font-size: 48px;">⚠️</div>
        <h2 style="margin: 16px 0;">Повільне з'єднання</h2>
        <p style="color: #8aa0c0;">Не вдалося завантажити дані. Перевірте інтернет.</p>
        <button onclick="location.reload()" style="
          margin-top: 16px;
          padding: 12px 24px;
          background: #35c4ff;
          color: #06121f;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        ">🔄 Спробувати ще раз</button>
      </div>
    `;
    loader.dataset.state = "error";
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
// СТАРТ
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  void init();
});
