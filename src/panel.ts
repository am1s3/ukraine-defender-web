import type { Region, ThreatEvent, ThreatType } from "./types";
import { toponymName } from "./data/toponym-centers";

const TYPE_META: Record<ThreatType, { label: string; icon: string; color: string }> = {
  shahed:    { label: "Шахед / БпЛА", icon: "🛸", color: "#35c4ff" },
  ballistic: { label: "Балістика",    icon: "🚀", color: "#ff3b3b" },
  cruise:    { label: "Крилата",      icon: "☄️", color: "#ffb020" },
  kab:       { label: "КАБ / КАР",    icon: "💣", color: "#ff7a18" },
  aviation:  { label: "Авіація",      icon: "✈️", color: "#ff5fa2" },
  recon:     { label: "Розвідка",     icon: "👁", color: "#7aa2ff" },
  unknown:   { label: "Загроза",      icon: "⚠️", color: "#8aa0c0" },
};

const FILTERS: { key: ThreatType | "all"; label: string }[] = [
  { key: "all", label: "Усі" },
  { key: "shahed", label: "Шахеди" },
  { key: "ballistic", label: "Балістика" },
  { key: "cruise", label: "Крилаті" },
  { key: "kab", label: "КАБ" },
  { key: "aviation", label: "Авіація" },
  { key: "recon", label: "Розвідка" },
];

function fmtTime(ts: string | null): string {
  if (!ts) return "--:--:--";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(d);
}

function fmtDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h} год ${m % 60} хв`;
  return `${m} хв`;
}

function consensusLevel(n: number): string {
  if (n >= 5) return "high";
  if (n >= 3) return "mid";
  return "low";
}

export interface PanelCallbacks {
  onHoverToponym: (key: string | null) => void;
  onFlyToponym: (key: string | null) => void;
}

export class Drawer {
  private root: HTMLElement;
  private title: HTMLElement;
  private status: HTMLElement;
  private body: HTMLElement;
  private cb: PanelCallbacks;

  private currentRegion: Region | null = null;
  private events: ThreatEvent[] = [];
  private filter: ThreatType | "all" = "all";
  private prevKeys = new Set<string>();
  private openSources = new Set<string>();

  constructor(cb: PanelCallbacks) {
    this.cb = cb;
    this.root = document.getElementById("drawer")!;
    this.title = document.getElementById("drawerTitle")!;
    this.status = document.getElementById("drawerStatus")!;
    this.body = document.getElementById("drawerBody")!;
    document.getElementById("drawerClose")!.addEventListener("click", () => this.close());
  }

  isOpen(): boolean { return this.root.dataset.open === "true"; }
  currentKey(): string | null { return this.currentRegion?.key ?? null; }

  open(region: Region) {
    this.currentRegion = region;
    this.events = [];
    this.filter = "all";
    this.prevKeys = new Set();
    this.openSources = new Set();
    this.title.textContent = region.name_uk;

    if (!region.active) {
      this.status.textContent = "У ЧЕРЗІ ПІДКЛЮЧЕННЯ";
      this.status.className = "drawer__status drawer__status--queued";
      this.body.innerHTML = `
        <div class="queued">
          <div class="queued__lock">🔒</div>
          <p class="queued__name">${region.name_uk}</p>
          <p class="queued__text">Цей регіон підключимо наступним етапом моніторингу. Стеж за оновленнями — ти наступний у черзі.</p>
        </div>`;
      this.root.dataset.open = "true";
      this.cb.onHoverToponym(null);
      return;
    }

    this.body.innerHTML = `<div class="loading"><span class="loading__dot"></span>Зчитуємо канали…</div>`;
    this.root.dataset.open = "true";
    this.renderHead();
  }

  private renderHead() {
    const r = this.currentRegion!;
    const alert = r.alert;
    this.status.textContent = alert ? "ПОВІТРЯНА ТРИВОГА" : "ВІДБІЙ";
    this.status.className = "drawer__status " + (alert ? "drawer__status--alert" : "drawer__status--calm");
  }

  setEvents(events: ThreatEvent[]) {
    this
