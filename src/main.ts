import "./style.css";
import { fetchAlerts, fetchEvents } from "./api";
import { ThreatMap } from "./map";
import { Drawer } from "./panel";
import type { AlertResponse } from "./types";

// Версія фронту (одна правда — сюди і в бейдж)
const APP_VERSION = "v1.0.0";

const drawer = new Drawer({
  onHoverToponym: (key) => map.setHighlight(key),
  onFlyToponym: (key) => map.flyToponym(key),
});

const map = new ThreatMap("map", (key) => {
  const r = lastData?.regions.find((x) => x.key === key);
  if (r) {
    drawer.open(r);
    if (r.active) refreshEvents();
  }
});

let lastData: AlertResponse | null = null;
let eventsTimer: number | null = null;

// --- Бейдж версії: стан з'єднання ---
let lastOkAt = 0;
let currentApiVersion = "—";
const elBadge = document.getElementById("verBadge")!;
const elApp = document.getElementById("verApp")!;
const elApi = document.getElementById("verApi")!;
const elAge = document.getElementById("verAge")!;
elApp.textContent = APP_VERSION;

function renderBadge() {
  elApi.textContent = `API ${currentApiVersion}`;
  if (!lastOkAt) {
    elBadge.dataset.state = "dead";
    elAge.textContent = "очікування…";
    return;
  }
  const sec = Math.floor((Date.now() - lastOkAt) / 1000);
  elAge.textContent = sec < 2 ? "оновлено щойно" : `оновлено ${sec}с тому`;
  elBadge.dataset.state = sec > 45 ? "dead" : sec > 20 ? "stale" : "live";
}
setInterval(renderBadge, 1000);
renderBadge();

function tickClock() {
  const el = document.getElementById("clock")!;
  el.textContent = new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date());
}
setInterval(tickClock, 1000);
tickClock();

function updateStatusStrip(data: AlertResponse) {
  const strip = document.getElementById("statusStrip")!;
  const text = document.getElementById("statusText")!;
  const coverage = document.getElementById("coverage")!;
  const kyiv = data.regions.find((r) => r.key === "kyiv_city" || r.key === "kyiv_oblast");
  const kyivAlert = kyiv?.alert ?? false;
  strip.dataset.state = kyivAlert ? "alert" : "calm";
  text.textContent = kyivAlert
    ? `ПОВІТРЯНА ТРИВОГА · КИЇВ ТА ОБЛАСТЬ · АКТИВНИХ РЕГІОНІВ: ${data.active_alerts}`
    : `УСЕ ЧИСТО · ТРИМАЙМОСЬ · АКТИВНИХ РЕГІОНІВ: ${data.active_alerts}`;
  coverage.textContent = `ПОКРИТТЯ 1/25`;
}

async function refreshEvents() {
  if (!drawer.isOpen()) return;
  const key = drawer.currentKey();
  const region = key === "kyiv_city" || key === "kyiv_oblast" ? "kyiv" : "kyiv";
  try {
    const data = await fetchEvents(region);
    drawer.setEvents(data.events);
  } catch (e) {
    console.error("events failed", e);
  }
}

function syncEventsLoop() {
  if (eventsTimer) { clearInterval(eventsTimer); eventsTimer = null; }
  if (drawer.isOpen()) {
    eventsTimer = window.setInterval(refreshEvents, 10000);
  }
}

async function poll() {
  try {
    const data = await fetchAlerts();
    lastData = data;
    lastOkAt = Date.now();
    currentApiVersion = data.version || "—";
    renderBadge();
    map.render(data.regions);
    updateStatusStrip(data);
    const openKey = drawer.currentKey();
    if (openKey) {
      const r = data.regions.find((x) => x.key === openKey);
      if (r) {
        drawer.open(r);
        if (r.active) refreshEvents();
      }
    }
  } catch (e) {
    console.error("poll failed", e);
    // lastOkAt не чіпаємо — тикер сам покаже старіння з'єднання
  }
}

const origOpen = drawer.open.bind(drawer);
drawer.open = (r) => { origOpen(r); syncEventsLoop(); };
const origClose = drawer.close.bind(drawer);
drawer.close = () => { origClose(); syncEventsLoop(); };

poll();
setInterval(poll, 5000);
