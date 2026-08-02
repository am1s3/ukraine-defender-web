import "./style.css";
import { fetchAlerts, fetchEvents } from "./api";
import { ThreatMap } from "./map";
import { Drawer } from "./panel";
import { SummaryOverlay } from "./summary";
import type { AlertResponse, ThreatEvent } from "./types";

const drawer = new Drawer({
  onHoverToponym: (key) => map.setHighlight(key),
  onFlyToponym: (key) => map.flyToponym(key),
  onRetry: () => { void pollEvents(); },
});

const map = new ThreatMap("map", (key) => {
  const r = lastData?.regions.find((x) => x.key === key);
  if (r) {
    drawer.open(r);
    if (r.active) pollEvents();
  }
});

const summary = new SummaryOverlay();
document.querySelectorAll<HTMLElement>('[data-nav="report"]').forEach((b) => {
  b.addEventListener("click", () => summary.open(lastEvents, lastData));
});

let lastData: AlertResponse | null = null;
let lastEvents: ThreatEvent[] = [];

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

async function pollEvents() {
  try {
    const data = await fetchEvents("kyiv");
    lastEvents = data.events;
    map.setTrajectories(lastEvents);
    if (drawer.isOpen()) drawer.setEvents(lastEvents);
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
drawer.open = (r) => { origOpen(r); map.clearPin(); pollEvents(); };
const origClose = drawer.close.bind(drawer);
drawer.close = () => { origClose(); map.clearPin(); };

poll();
pollEvents();
setInterval(poll, 5000);
setInterval(pollEvents, 12000);
