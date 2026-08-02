import "./style.css";
import { fetchAlerts, fetchEvents } from "./api";
import { ThreatMap } from "./map";
import { Drawer } from "./panel";
import type { AlertResponse } from "./types";

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
    map.render(data.regions);
    updateStatusStrip(data);
    // якщо шторка відкрита — оновимо статус і стрічку
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
  }
}

// перехоплюємо відкриття/закриття шторки для циклу подій
const origOpen = drawer.open.bind(drawer);
drawer.open = (r) => { origOpen(r); syncEventsLoop(); };
const origClose = drawer.close.bind(drawer);
drawer.close = () => { origClose(); syncEventsLoop(); };

poll();
setInterval(poll, 5000);
