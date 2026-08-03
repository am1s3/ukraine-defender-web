import type { Region, ThreatEvent } from "./types";

export interface DrawerOptions {
  onHoverToponym: (key: string) => void;
  onFlyToponym: (key: string) => void;
  onRetry: () => void;
}

export class Drawer {
  private el: HTMLElement;
  private titleEl: HTMLElement;
  private statusEl: HTMLElement;
  private bodyEl: HTMLElement;
  private closeBtn: HTMLElement;
  private currentRegion: Region | null = null;
  private events: ThreatEvent[] = [];
  private opts: DrawerOptions;

  constructor(opts: DrawerOptions) {
    this.opts = opts;
    this.el = document.getElementById("drawer")!;
    this.titleEl = document.getElementById("drawerTitle")!;
    this.statusEl = document.getElementById("drawerStatus")!;
    this.bodyEl = document.getElementById("drawerBody")!;
    this.closeBtn = document.getElementById("drawerClose")!;

    this.closeBtn.addEventListener("click", () => this.close());
  }

  open(region: Region) {
    this.currentRegion = region;
    this.el.dataset.open = "true";
    this.render();
  }

  close() {
    this.el.dataset.open = "false";
    this.currentRegion = null;
  }

  updateAlerts(regions: Region[]) {
    if (!this.currentRegion) return;
    
    const updated = regions.find(r => r.key === this.currentRegion!.key);
    if (updated) {
      this.currentRegion = updated;
      this.render();
    }
  }

  updateEvents(events: ThreatEvent[]) {
    this.events = events;
    if (this.currentRegion) {
      this.render();
    }
  }

  private render() {
    if (!this.currentRegion) {
      this.bodyEl.innerHTML = `<p class="drawer__empty">Оберіть область на карті</p>`;
      return;
    }

    const r = this.currentRegion;
    this.titleEl.textContent = r.name_uk;
    
    // Статус тривоги
    if (r.alert) {
      this.statusEl.textContent = `🚨 ТРИВОГА ${r.duration_sec ? `· ${this.formatDuration(r.duration_sec)}` : ""}`;
      this.statusEl.className = "drawer__status drawer__status--alert";
    } else {
      this.statusEl.textContent = "✅ ВІДБІЙ";
      this.statusEl.className = "drawer__status drawer__status--calm";
    }

    // Контент
    const regionEvents = this.events.filter(e => 
      e.toponym_key === r.key || 
      e.toponym_raw?.toLowerCase().includes(r.key.toLowerCase())
    );

    if (regionEvents.length === 0) {
      this.bodyEl.innerHTML = `
        <div class="ev-status ev-status--${r.alert ? "alert" : "calm"}">
          <span class="ev-status__dot"></span>
          <span class="ev-status__label">${r.alert ? "Активна тривога" : "Загрози немає"}</span>
        </div>
        <p class="ev-empty">${r.alert ? "Очікуємо деталі від джерел..." : "Наразі все спокійно."}</p>
      `;
      return;
    }

    // Список событий
    const html = regionEvents.map(ev => `
      <div class="ev-row" data-event-hash="${ev.source.id}">
        <div class="ev-row__bar" style="--accent: ${this.getTypeColor(ev.threat_type)}"></div>
        <div class="ev-row__main">
          <div class="ev-row__top">
            <span class="ev-row__icon">${this.getTypeIcon(ev.threat_type)}</span>
            <span class="ev-row__type" style="color: ${this.getTypeColor(ev.threat_type)}">${ev.threat_type.toUpperCase()}</span>
            <span class="ev-row__time">${this.formatTime(ev.source.ts)}</span>
          </div>
          <div class="ev-row__dir">
            ${ev.count ? `<b>${ev.count}</b> шт. ` : ""}
            ${ev.toponym_raw || ev.toponym_key || "—"}
          </div>
          <div class="ev-row__foot">
            <span class="consensus consensus--${this.getConsensusLevel(ev.consensus)}">
              <span class="consensus__bar"><span class="consensus__fill" style="width: ${Math.min(100, ev.consensus * 20)}%"></span></span>
              ${ev.consensus} джерел
            </span>
          </div>
        </div>
      </div>
    `).join("");

    this.bodyEl.innerHTML = `
      <div class="ev-status ev-status--${r.alert ? "alert" : "calm"}">
        <span class="ev-status__dot"></span>
        <span class="ev-status__label">${r.alert ? "Активна тривога" : "Загрози немає"}</span>
        ${r.duration_sec ? `<span class="ev-status__timer">${this.formatDuration(r.duration_sec)}</span>` : ""}
      </div>
      <div class="filters">
        <button class="chip chip--on">Усі (${regionEvents.length})</button>
      </div>
      <div class="ev-list">${html}</div>
    `;
  }

  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      shahed: "🚁",
      ballistic: "🚀",
      cruise: "💫",
      kab: "💣",
      aviation: "✈️",
      recon: "👁",
      unknown: "⚠️"
    };
    return icons[type] || "⚠️";
  }

  private getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      shahed: "#ff3b3b",
      ballistic: "#ff6b6b",
      cruise: "#ffb020",
      kab: "#ff8c00",
      aviation: "#35c4ff",
      recon: "#2ee6a6",
      unknown: "#8aa0c0"
    };
    return colors[type] || "#8aa0c0";
  }

  private getConsensusLevel(n: number): "low" | "mid" | "high" {
    if (n >= 5) return "high";
    if (n >= 2) return "mid";
    return "low";
  }

  private formatTime(ts: string | null): string {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  }

  private formatDuration(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}г ${m}хв`;
    return `${m}хв`;
  }
}
