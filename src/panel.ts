import type { Region, ThreatEvent, ThreatType } from "./types";
import { toponymName } from "./data/toponym-centers";

type FilterKey = ThreatType | "all" | "verified";

const TYPE_META: Record<ThreatType, { label: string; icon: string; color: string }> = {
  shahed:    { label: "Шахед / БпЛА", icon: "🛸", color: "#35c4ff" },
  ballistic: { label: "Балістика",    icon: "🚀", color: "#ff3b3b" },
  cruise:    { label: "Крилата",      icon: "☄️", color: "#ffb020" },
  kab:       { label: "КАБ / КАР",    icon: "💣", color: "#ff7a18" },
  aviation:  { label: "Авіація",      icon: "✈️", color: "#ff5fa2" },
  recon:     { label: "Розвідка",     icon: "👁", color: "#7aa2ff" },
  unknown:   { label: "Загроза",      icon: "⚠️", color: "#8aa0c0" },
};

const FILTERS: { key: FilterKey; label: string; verified?: boolean }[] = [
  { key: "all", label: "Усі" },
  { key: "verified", label: "✓ Перевірені", verified: true },
  { key: "shahed", label: "Шахеди" },
  { key: "ballistic", label: "Балістика" },
  { key: "cruise", label: "Крилаті" },
  { key: "kab", label: "КАБ" },
  { key: "aviation", label: "Авіація" },
  { key: "recon", label: "Розвідка" },
];

const VERIFIED_MIN = 3; // мінімум незалежних джерел щоб вважати подію перевіреною

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
  private mode: "active" | "queued" | null = null;
  private events: ThreatEvent[] = [];
  private filter: FilterKey = "all";
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
    this.mode = region.active ? "active" : "queued";
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

  // Оновлення БЕЗ скидання тіла (викликається з poll кожні 5с)
  updateRegion(region: Region) {
    if (this.mode === "active") {
      this.currentRegion = region;
      this.renderHead();
    } else if (this.mode === "queued" && region.active) {
      this.open(region); // регіон раптово ожив — відкриваємо по-новому (рідкісний кейс)
    }
  }

  private renderHead() {
    const r = this.currentRegion!;
    const alert = r.alert;
    this.status.textContent = alert ? "ПОВІТРЯНА ТРИВОГА" : "ВІДБІЙ";
    this.status.className = "drawer__status " + (alert ? "drawer__status--alert" : "drawer__status--calm");
  }

  setEvents(events: ThreatEvent[]) {
    if (this.mode !== "active") return;
    this.events = events;
    this.renderBody();
  }

  private visibleEvents(): ThreatEvent[] {
    if (this.filter === "all") return this.events;
    if (this.filter === "verified") return this.events.filter((e) => e.consensus >= VERIFIED_MIN);
    return this.events.filter((e) => e.threat_type === this.filter);
  }

  private renderBody() {
    const r = this.currentRegion!;
    const alert = r.alert;

    const head = `
      <div class="ev-status ${alert ? "ev-status--alert" : "ev-status--calm"}">
        <span class="ev-status__dot"></span>
        <span class="ev-status__label">${alert ? "Тривога триває" : "Загроз немає"}</span>
        <span class="ev-status__timer">${alert ? fmtDuration(r.duration_sec) : "тримаємось"}</span>
      </div>`;

    const chips = `
      <div class="filters">
        ${FILTERS.map((f) =>
          `<button class="chip ${this.filter === f.key ? "chip--on" : ""} ${f.verified ? "chip--verified" : ""}" data-filter="${f.key}">${f.label}</button>`
        ).join("")}
      </div>`;

    const visible = this.visibleEvents();

    let list = "";
    if (!alert && visible.length === 0) {
      list = `<div class="calm-card"><p>Усе чисто. Тримаємось.</p><p class="calm-card__sub">Остання зміна статусу: ${r.changed ?? "—"}</p></div>`;
    } else if (alert && visible.length === 0) {
      const hint = this.filter === "verified"
        ? `Перевірених подій поки немає — чекаємо підтвердження від кількох каналів.`
        : `Тривога активна — деталі цілей зчитуються з каналів. Слідкуй за стрічкою.`;
      list = `<div class="ev-empty">${hint}</div>`;
    } else {
      list = `<div class="ev-list">${visible.map((e, i) => this.rowHtml(e, i)).join("")}</div>`;
    }

    this.body.innerHTML = head + chips + list;
    this.wire();
    this.prevKeys = new Set(visible.map((e) => this.eventKey(e)));
  }

  private eventKey(e: ThreatEvent): string {
    return `${e.threat_type}|${e.toponym_key ?? "_"}|${e.source.id}`;
  }

  private rowHtml(e: ThreatEvent, i: number): string {
    const meta = TYPE_META[e.threat_type];
    const key = this.eventKey(e);
    const isNew = !this.prevKeys.has(key);
    const open = this.openSources.has(key);
    const lvl = consensusLevel(e.consensus);
    const countTxt = e.count ? ` · ${e.count} ${e.count === 1 ? "ціль" : "цілі"}` : "";
    const launchTxt = e.launch_key ? ` · з ${e.launch_key}` : "";

    return `
      <div class="ev-row ${isNew ? "ev-row--new" : ""}" data-type="${e.threat_type}" data-topo="${e.toponym_key ?? ""}" style="--accent:${meta.color}">
        <div class="ev-row__bar"></div>
        <div class="ev-row__main">
          <div class="ev-row__top">
            <span class="ev-row__icon">${meta.icon}</span>
            <span class="ev-row__type">${meta.label}</span>
            <span class="ev-row__time">${fmtTime(e.source.ts)}</span>
          </div>
          <div class="ev-row__dir">напрямок <b>${toponymName(e.toponym_key, e.toponym_raw)}</b>${countTxt}${launchTxt}</div>
          <div class="ev-row__foot">
            <button class="src-toggle ${open ? "src-toggle--on" : ""}" data-key="${key}">
              <span class="src-toggle__n">${e.sources.length}</span> джерел${open ? " ▾" : " ▸"}
            </button>
            <span class="consensus consensus--${lvl}" title="рівень підтвердження">
              <span class="consensus__bar"><span class="consensus__fill" style="width:${Math.min(e.consensus / 6 * 100, 100)}%"></span></span>
              підтв. ${e.consensus}
            </span>
          </div>
        </div>
        ${open ? this.sourcesHtml(e) : ""}
      </div>`;
  }

  private sourcesHtml(e: ThreatEvent): string {
    const lvl = consensusLevel(e.consensus);
    return `
      <div class="ev-sources">
        <div class="ev-sources__head">Джерела цього сповіщення</div>
        ${e.sources.map((s) => `
          <a class="ev-src" href="${s.url}" target="_blank" rel="noopener">
            <span class="ev-src__ch">@${s.channel}</span>
            <span class="ev-src__ts">${fmtTime(s.ts)}</span>
            <span class="ev-src__go">↗</span>
          </a>`).join("")}
        <div class="ev-sources__foot consensus--${lvl}">Підтверджено ${e.consensus} незалежних джерел</div>
      </div>`;
  }

  private wire() {
    this.body.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.filter = btn.dataset.filter as FilterKey;
        this.renderBody();
      });
    });

    this.body.querySelectorAll<HTMLElement>(".ev-row").forEach((row) => {
      const topo = row.dataset.topo || null;
      row.addEventListener("mouseenter", () => this.cb.onHoverToponym(topo));
      row.addEventListener("mouseleave", () => this.cb.onHoverToponym(null));
      row.addEventListener("click", (ev) => {
        if ((ev.target as HTMLElement).closest(".src-toggle") || (ev.target as HTMLElement).closest(".ev-sources")) return;
        this.cb.onFlyToponym(topo);
      });
    });

    this.body.querySelectorAll<HTMLButtonElement>(".src-toggle").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const k = btn.dataset.key!;
        if (this.openSources.has(k)) this.openSources.delete(k); else this.openSources.add(k);
        this.renderBody();
      });
    });
  }

  close() {
    this.root.dataset.open = "false";
    this.currentRegion = null;
    this.mode = null;
    this.cb.onHoverToponym(null);
  }
}
