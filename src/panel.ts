// ============================================================
// Ukraine Defender — panel.ts (FIXED)
// Додано: SVG замість емодзі, різні підписи для типів, санітизація
// ============================================================

import type { Region, ThreatEvent, ThreatType } from "./types";
import { toponymName } from "./data/toponym-centers";

type FilterKey = ThreatType | "all" | "verified";

// 🔧 ВИПРАВЛЕННЯ: SVG іконки замість емодзі + правильні підписи
const TYPE_META: Record<
  ThreatType,
  { label: string; icon: string; color: string; prefix: string }
> = {
  shahed: {
    label: "Шахед / БпЛА",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#35c4ff"><path d="M12 2L2 12l4 4 6-6 6 6 4-4z"/></svg>`,
    color: "#35c4ff",
    prefix: "напрямок",
  },
  ballistic: {
    label: "Балістика",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ff3b3b"><path d="M12 2l-4 8v6h8v-6l-4-8z"/></svg>`,
    color: "#ff3b3b",
    prefix: "напрямок",
  },
  cruise: {
    label: "Крилата",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ffb020"><path d="M2 12l8-4v3h8v2h-8v3z"/></svg>`,
    color: "#ffb020",
    prefix: "напрямок",
  },
  kab: {
    label: "КАБ / КАР",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ff7a18"><circle cx="12" cy="12" r="8"/></svg>`,
    color: "#ff7a18",
    prefix: "місце удару", // 🔧 ВИПРАВЛЕННЯ: не "напрямок"
  },
  aviation: {
    label: "Авіація",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ff5fa2"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>`,
    color: "#ff5fa2",
    prefix: "напрямок польоту",
  },
  recon: {
    label: "Розвідка",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#7aa2ff"><circle cx="12" cy="12" r="3"/><path d="M12 4C6.5 4 2 8.5 2 12s4.5 8 10 8 10-4.5 10-8-4.5-8-10-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/></svg>`,
    color: "#7aa2ff",
    prefix: "зона розвідки", // 🔧 ВИПРАВЛЕННЯ: не "напрямок"
  },
  unknown: {
    label: "Загроза",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#8aa0c0"><path d="M12 2L2 20h20L12 2zm0 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm1-4h-2V7h2v6z"/></svg>`,
    color: "#8aa0c0",
    prefix: "напрямок",
  },
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

const VERIFIED_MIN = 3;

// 🔧 ВИПРАВЛЕННЯ: фільтрація подій старше 24 годин
const MAX_EVENT_AGE_HOURS = 24;

function consensusLevel(n: number): string {
  if (n >= 5) return "high";
  if (n >= 3) return "mid";
  return "low";
}

// 🔧 НОВА ФУНКЦІЯ: безпечна санітизація HTML
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export interface PanelCallbacks {
  onHoverToponym: (key: string | null) => void;
  onFlyToponym: (key: string | null) => void;
  onRetry: () => void;
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
  private hadData = false;
  private lastError = "";

  constructor(cb: PanelCallbacks) {
    this.cb = cb;
    this.root = document.getElementById("drawer")!;
    this.title = document.getElementById("drawerTitle")!;
    this.status = document.getElementById("drawerStatus")!;
    this.body = document.getElementById("drawerBody")!;
    document
      .getElementById("drawerClose")!
      .addEventListener("click", () => this.close());
  }

  isOpen(): boolean {
    return this.root.dataset.open === "true";
  }

  currentKey(): string | null {
    return this.currentRegion?.key ?? null;
  }

  open(region: Region) {
    this.currentRegion = region;
    this.events = [];
    this.filter = "all";
    this.prevKeys = new Set();
    this.openSources = new Set();
    this.hadData = false;
    this.lastError = "";
    this.mode = region.active ? "active" : "queued";
    this.title.textContent = region.name_uk;

    if (!region.active) {
      this.status.textContent = "У ЧЕРЗІ ПІДКЛЮЧЕННЯ";
      this.status.className = "drawer__status drawer__status--queued";
      this.body.innerHTML = `
        <div class="queued">
          <div class="queued__lock">🔒</div>
          <div class="queued__name">${escapeHtml(region.name_uk)}</div>
          <div class="queued__text">
            Цей регіон підключимо наступним етапом моніторингу.
            Стеж за оновленнями — ти наступний у черзі.
          </div>
        </div>
      `;
      this.root.dataset.open = "true";
      this.cb.onHoverToponym(null);
      return;
    }

    this.body.innerHTML = `
      <div class="loading">
        <div class="loading__dot"></div>
        Зчитуємо канали…
      </div>
    `;
    this.root.dataset.open = "true";
    this.renderHead();
  }

  updateRegion(region: Region) {
    if (this.mode === "active") {
      this.currentRegion = region;
      this.renderHead();
    } else if (this.mode === "queued" && region.active) {
      this.open(region);
    }
  }

  private renderHead() {
    const r = this.currentRegion!;
    const alert = r.alert;
    this.status.textContent = alert ? "ПОВІТРЯНА ТРИВОГА" : "ВІДБІЙ";
    this.status.className =
      "drawer__status " +
      (alert ? "drawer__status--alert" : "drawer__status--calm");
  }

  setEvents(events: ThreatEvent[]) {
    if (this.mode !== "active") return;

    // 🔧 ВИПРАВЛЕННЯ: фільтрація старих подій (>24h)
    const now = Date.now();
    const cutoff = now - MAX_EVENT_AGE_HOURS * 3600 * 1000;

    this.events = events.filter((e) => {
      if (!e.source?.ts) return true;
      const eventTime = new Date(e.source.ts).getTime();
      return eventTime >= cutoff;
    });

    this.hadData = true;
    this.lastError = "";
    this.renderBody();
    this.removeStaleBanner();
  }

  setError(msg?: string) {
    if (this.mode !== "active") return;
    this.lastError = (msg || "").slice(0, 160);
    if (this.hadData) this.showStaleBanner();
    else this.showErrorCard();
  }

  private showErrorCard() {
    const reason = this.lastError
      ? `
        <div class="ev-error__reason">
          ${escapeHtml(this.lastError)}
        </div>
      `
      : "";
    this.body.innerHTML = `
      <div class="ev-error">
        <div class="ev-error__dot"></div>
        <div class="ev-error__txt">
          <div class="ev-error__title">Не вдалося зчитати канали</div>
          <div class="ev-error__sub">перевіряємо зв'язок · автоповтор за мить</div>
          ${reason}
        </div>
        <button class="ev-retry ev-retry--mini">↻ Повторити</button>
      </div>
    `;
    this.wireErrorActions();
  }

  private showStaleBanner() {
    if (this.body.querySelector(".ev-stale")) return;
    const banner = document.createElement("div");
    banner.className = "ev-stale";
    banner.innerHTML = `
      <div class="ev-stale__dot"></div>
      <div class="ev-stale__txt">
        оновлення не вдалось · показуємо останні дані
      </div>
      <button class="ev-stale__close">↻</button>
      <button class="ev-stale__close">✕</button>
    `;
    this.body.insertBefore(banner, this.body.firstChild);
    this.wireErrorActions();
  }

  private removeStaleBanner() {
    this.body.querySelector(".ev-stale")?.remove();
  }

  private wireErrorActions() {
    this.body.querySelectorAll(".ev-retry").forEach((b) => {
      b.onclick = (ev) => {
        ev.stopPropagation();
        this.cb.onRetry();
      };
    });
    this.body.querySelectorAll(".ev-stale__close").forEach((b) => {
      b.onclick = (ev) => {
        ev.stopPropagation();
        this.removeStaleBanner();
      };
    });
  }

  private visibleEvents(): ThreatEvent[] {
    if (this.filter === "all") return this.events;
    if (this.filter === "verified")
      return this.events.filter((e) => e.consensus >= VERIFIED_MIN);
    return this.events.filter((e) => e.threat_type === this.filter);
  }

  private renderBody() {
    const r = this.currentRegion!;
    const alert = r.alert;

    const head = `
      <div class="ev-status ${alert ? "ev-status--alert" : "ev-status--calm"}">
        <div class="ev-status__dot"></div>
        <div class="ev-status__label">
          ${alert ? "Тривога триває" : "Загроз немає"}
        </div>
        <div class="ev-status__timer">
          ${alert ? fmtDuration(r.duration_sec) : "тримаємось"}
        </div>
      </div>
    `;

    const chips = `
      <div class="filters">
        ${FILTERS.map(
          (f) => `
          <button
            class="chip ${this.filter === f.key ? "chip--on" : ""} ${
              f.verified ? "chip--verified" : ""
            }"
            data-filter="${f.key}"
          >
            ${f.label}
          </button>
        `
        ).join("")}
      </div>
    `;

    const visible = this.visibleEvents();

    let list = "";
    if (!alert && visible.length === 0) {
      list = `
        <div class="calm-card">
          Усе чисто. Тримаємось.
          <div class="calm-card__sub">
            Остання зміна статусу: ${r.changed ?? "—"}
          </div>
        </div>
      `;
    } else if (alert && visible.length === 0) {
      const hint =
        this.filter === "verified"
          ? `Перевірених подій поки немає — чекаємо підтвердження від кількох каналів.`
          : `Тривога активна — деталі цілей зчитуються з каналів. Слідкуй за стрічкою.`;
      list = `
        <div class="ev-empty">
          ${hint}
        </div>
      `;
    } else {
      list = `
        <div class="ev-list">
          ${visible.map((e) => this.rowHtml(e)).join("")}
        </div>
      `;
    }

    this.body.innerHTML = head + chips + list;
    this.wire();
    this.prevKeys = new Set(visible.map((e) => this.eventKey(e)));
  }

  private eventKey(e: ThreatEvent): string {
    return `${e.threat_type}|${e.toponym_key ?? "_"}|${e.source.id}`;
  }

  private rowHtml(e: ThreatEvent): string {
    const meta = TYPE_META[e.threat_type];
    const key = this.eventKey(e);
    const isNew = !this.prevKeys.has(key);
    const open = this.openSources.has(key);
    const lvl = consensusLevel(e.consensus);
    const countTxt = e.count
      ? ` · ${e.count} ${e.count === 1 ? "ціль" : "цілі"}`
      : "";
    const launchTxt = e.launch_key ? ` · з ${e.launch_key}` : "";

    // 🔧 ВИПРАВЛЕННЯ: різні підписи для різних типів
    const prefix = meta.prefix;
    const toponym = toponymName(e.toponym_key, e.toponym_raw);

    return `
      <div
        class="ev-row ${isNew ? "ev-row--new" : ""}"
        data-topo="${e.toponym_key || ""}"
        style="--accent: ${meta.color}"
      >
        <div class="ev-row__bar"></div>
        <div class="ev-row__main">
          <div class="ev-row__top">
            <span class="ev-row__icon">${meta.icon}</span>
            <span class="ev-row__type">${escapeHtml(meta.label)}</span>
            <span class="ev-row__time">${fmtTime(e.source.ts)}</span>
          </div>
          <div class="ev-row__dir">
            ${escapeHtml(prefix)} <b>${escapeHtml(toponym)}</b>${countTxt}${launchTxt}
          </div>
          <div class="ev-row__foot">
            <span class="src-toggle ${open ? "src-toggle--on" : ""}" data-key="${key}">
              <span class="src-toggle__n">${e.sources.length}</span>
              джерел${open ? " ▾" : " ▸"}
            </span>
            <span class="consensus consensus--${lvl}">
              <span class="consensus__bar">
                <span class="consensus__fill" style="width:${Math.min(
                  100,
                  (e.consensus / 5) * 100
                )}%"></span>
              </span>
              підтв. ${e.consensus}
            </span>
          </div>
          ${open ? this.sourcesHtml(e) : ""}
        </div>
      </div>
    `;
  }

  private sourcesHtml(e: ThreatEvent): string {
    const lvl = consensusLevel(e.consensus);
    return `
      <div class="ev-sources">
        <div class="ev-sources__head">Джерела цього сповіщення</div>
        ${e.sources
          .map(
            (s) => `
            <a
              class="ev-src"
              href="${s.url || `https://t.me/${s.channel}/${s.id}`}"
              target="_blank"
              rel="noopener"
            >
              <span class="ev-src__ch">@${escapeHtml(s.channel)}</span>
              <span class="ev-src__ts">${fmtTime(s.ts)}</span>
              <span class="ev-src__go">↗</span>
            </a>
          `
          )
          .join("")}
        <div class="ev-sources__foot">
          Підтверджено ${e.consensus} незалежних джерел
        </div>
      </div>
    `;
  }

  private wire() {
    this.body.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.filter = btn.dataset.filter as FilterKey;
        this.renderBody();
      });
    });

    this.body.querySelectorAll(".ev-row").forEach((row) => {
      const topo = row.dataset.topo || null;
      row.addEventListener("mouseenter", () =>
        this.cb.onHoverToponym(topo)
      );
      row.addEventListener("mouseleave", () =>
        this.cb.onHoverToponym(null)
      );
      row.addEventListener("click", (ev) => {
        if (
          (ev.target as HTMLElement).closest(".src-toggle") ||
          (ev.target as HTMLElement).closest(".ev-sources")
        )
          return;
        this.cb.onFlyToponym(topo);
      });
    });

    this.body.querySelectorAll(".src-toggle").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const k = btn.dataset.key!;
        if (this.openSources.has(k)) this.openSources.delete(k);
        else this.openSources.add(k);
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

function fmtDuration(sec: number | null): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}г ${m}хв`;
  return `${m}хв`;
}

function fmtTime(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
