// ============================================================
// Ukraine Defender — main.ts (FIXED)
// Додано: XSS-fix у showToast, race condition fix у pollEvents
// ============================================================

import "./style.css";
import { fetchAlerts, fetchEvents, fetchNight } from "./api";
import { ThreatMap } from "./map";
import { Drawer } from "./panel";
import { SummaryOverlay } from "./summary";
import type {
  AlertResponse,
  ThreatEvent,
  NightResponse,
} from "./types";

const drawer = new Drawer({
  onHoverToponym: (key) => map.setHighlight(key),
  onFlyToponym: (key) => map.flyToponym(key),
  onRetry: () => {
    void pollEvents();
  },
});

const map = new ThreatMap("map", (key) => {
  const r = lastData?.regions.find((x) => x.key === key);
  if (r) {
    drawer.open(r);
    if (r.active) pollEvents();
  }
});

const summary = new SummaryOverlay();

let lastData: AlertResponse | null = null;
let lastEvents: ThreatEvent[] = [];
let lastNight: NightResponse | null = null;

async function openSummary() {
  try {
    lastNight = await fetchNight(12);
  } catch (e) {
    console.warn("night failed", e);
  }
  summary.open(lastEvents, lastData, lastNight);
}

const aboutOverlay = document.getElementById("aboutOverlay")!;
function openAbout() {
  aboutOverlay.dataset.open = "true";
}
function closeAbout() {
  aboutOverlay.dataset.open = "false";
}

const toastHost = document.getElementById("toastHost")!;

// 🔧 ВИПРАВЛЕННЯ: textContent замість innerHTML для XSS-safety
function showToast(
  text: string,
  kind: "info" | "warn" | "ok" = "info",
  icon = "ℹ️"
) {
  const el = document.createElement("div");
  el.className =
    "toast" + (kind === "warn" ? " toast--warn" : kind === "ok" ? " toast--ok" : "");

  // 🔧 ВИПРАВЛЕННЯ: безпечне додавання тексту
  el.textContent = `${icon} ${text}`;

  toastHost.appendChild(el);
  setTimeout(() => {
    el.classList.add("toast--out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, 3200);
}

document.querySelectorAll("[data-nav]").forEach((b) => {
  b.addEventListener("click", () => {
    switch (b.dataset.nav) {
      case "report":
        void openSummary();
        break;
      case "about":
        openAbout();
        break;
      case "donate":
        showToast(
          "Реквізити для донату з'являться незабаром. Дякуємо, що тримаєте стрій!",
          "warn",
          "💛"
        );
        break;
      case "support":
        showToast(
          "Техпідтримка: напишіть нам у Telegram — канал скоро відкриємо.",
          "info",
          "📡"
        );
        break;
    }
  });
});

document.querySelectorAll("[data-nav-close='about']").forEach((b) => {
  b.addEventListener("click", closeAbout);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAbout();
});

function tickClock() {
  const el = document.getElementById("clock")!;
  el.textContent = new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}
setInterval(tickClock, 1000);
tickClock();

function updateStatusStrip(data: AlertResponse) {
  const strip = document.getElementById("statusStrip")!;
  const text = document.getElementById("statusText")!;
  const coverage = document.getElementById("coverage")!;
  const kyiv = data.regions.find(
    (r) => r.key === "kyiv_city" || r.key === "kyiv_oblast"
  );
  const kyivAlert = kyiv?.alert ?? false;
  strip.dataset.state = kyivAlert ? "alert" : "calm";
  text.textContent = kyivAlert
    ? `ПОВІТРЯНА ТРИВОГА · КИЇВ ТА ОБЛАСТЬ · АКТИВНИХ РЕГІОНІВ: ${data.active_alerts}`
    : `УСЕ ЧИСТО · ТРИМАЙМОСЬ · АКТИВНИХ РЕГІОНІВ: ${data.active_alerts}`;
  coverage.textContent = `ПОКРИТТЯ 1/25`;
}

// 🔧 ВИПРАВЛЕННЯ: race condition fix + перевірка drawer state
async function pollEvents() {
  // 🔧 Зберегти стан drawer ПЕРЕД fetch
  const drawerWasOpen = drawer.isOpen();
  const currentRegionKey = drawer.currentKey();

  try {
    const data = await fetchEvents("kyiv");
    lastEvents = data.events;
    map.setTrajectories(lastEvents);

    // 🔧 ВИПРАВЛЕННЯ: перевірити стан drawer ПІСЛЯ fetch
    if (drawerWasOpen && drawer.isOpen()) {
      const newRegionKey = drawer.currentKey();
      // Тільки якщо регіон не змінився під час запиту
      if (currentRegionKey === newRegionKey) {
        drawer.setEvents(lastEvents);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("events failed", msg);
    if (drawer.isOpen()) drawer.setError(msg);
  }
}

async function poll() {
  try {
    const data = await fetchAlerts();
    lastData = data;
    map.render(data.regions);
    updateStatusStrip(data);

    const openKey = drawer.currentKey();
    if (openKey) {
      const r = data.regions.find((x) => x.key === openKey);
      if (r) drawer.updateRegion(r);
    }
  } catch (e) {
    console.error("poll failed", e);
  }
}

const origOpen = drawer.open.bind(drawer);
drawer.open = (r) => {
  origOpen(r);
  map.clearPin();
  pollEvents();
};
const origClose = drawer.close.bind(drawer);
drawer.close = () => {
  origClose();
  map.clearPin();
};

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((e) => console.warn("sw register failed", e));
  });
}

poll();
pollEvents();
setInterval(poll, 5000);
setInterval(pollEvents, 12000);
