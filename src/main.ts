import "./style.css";
import { fetchAlerts } from "./api";
import { ThreatMap } from "./map";
import { Drawer } from "./panel";
import type { AlertResponse } from "./types";

const drawer = new Drawer();
const map = new ThreatMap("map", (key) => {
  const r = lastData?.regions.find((x) => x.key === key);
  if (r) drawer.open(r);
});

let lastData: AlertResponse | null = null;

// Годинник по Києву (UTC+2 / UTC+3 літній)
function tickClock() {
  const el = document.getElementById("clock")!;
  el.textContent = new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date());
}
setInterval(tickClock, 1000); tickClock();

function updateStatusStrip(data: AlertResponse) {
  const strip = document.getElementById("statusStrip")!;
  const text = document.getElementById("statusText")!;
  const activeKyiv = data.regions.find((r) => r.key === "kyiv_city" || r.key === "kyiv_oblast");
  const kyivAlert = activeKyiv?.alert ?? false;
  strip.dataset.state = kyivAlert ? "alert" : "calm";
  text.textContent = kyivAlert
    ? `ПОВІТРЯНА ТРИВОГА · КИЇВ ТА ОБЛАСТЬ · АКТИВНИХ РЕГІОНІВ: ${data.active_alerts}`
    : `УСЕ ЧИСТО · ТРИМАЙМОСЬ · АКТИВНИХ РЕГІОНІВ: ${data.active_alerts}`;
}

async function poll() {
  try {
    const data = await fetchAlerts();
    lastData = data;
    map.render(data.regions);
    updateStatusStrip(data);
  } catch (e) {
    console.error("poll failed", e);
  }
}

poll();
setInterval(poll, 5000);   // раз на 5 секунд, як і домовлялись
