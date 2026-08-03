// ============================================================
// Ukraine Defender — panel.ts
// FULL FILE
//
// - SVG-іконки замість емодзі;
// - різні підписи: напрямок / місце удару / зона розвідки;
// - санітизація HTML;
// - фільтр подій старше 24 годин;
// - свіжі події зверху.
// ============================================================

import type { Region, ThreatEvent, ThreatType } from "./types";

import { toponymName } from "./data/toponym-centers";

type FilterKey = ThreatType | "all" | "verified";

// ============================================================
// TYPE META (SVG icons + correct prefixes)
// ============================================================

const TYPE_META: Record<
  ThreatType,
  { label: string; icon: string; color: string; prefix: string }
> = {
  shahed: {
    label: "Шахед / БпЛА",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#35c4ff" aria-hidden="true"><path d="M12 3 L21 20 L12 15 L3 20 Z"/></svg>`,
    color: "#35c4ff",
    prefix: "напрямок"
  },
  ballistic: {
    label: "Балістика",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ff3b3b" aria-hidden="true"><path d="M12 2 L15 9 L15 16 L9 16 L9 9 Z M9 16 L7 21 L12 18.5 L17 21 L15 16 Z"/></svg>`,
    color: "#ff3b3b",
    prefix: "напрямок"
  },
  cruise: {
    label: "Крилата",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ffb020" aria-hidden="true"><path d="M2 12 L13 12 L13 9 L21 12 L13 15 L13 12 Z"/></svg>`,
    color: "#ffb020",
    prefix: "напрямок"
  },
  kab: {
    label: "КАБ / КАР",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ff7a18" aria-hidden="true"><path d="M12 2 C16 6 17 11 15 15 L9 15 C7 11 8 6 12 2 Z M9 15 L8 20 L12 17.5 L16 20 L15 15 Z"/></svg>`,
    color: "#ff7a18",
    prefix: "місце удару"
  },
  aviation: {
    label: "Авіація",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ff5fa2" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>`,
    color: "#ff5fa2",
    prefix: "напрямок польоту"
  },
  recon: {
    label: "Розвідка",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#7aa2ff" aria-hidden="true"><path d="M12 5 C6.5 5 2.5 9 1 12 c1.5 3 5.5 7 11 7 s9.5-4 11-7 c-1.5-3-5.5-7-11-7 z M12 15.5 A3.5 3.5 0 1 1 12 8.5 A3.5 3.5 0 0 1 12 15.5 Z"/></svg>`,
    color: "#7aa2ff",
    prefix: "зона розвідки"
  },
  unknown: {
    label: "Загроза",
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#8aa0c0" aria-hidden="true"><path d="M12 2 L22 20 L2 20 Z M11 9 L13 9 L13 15 L11 15 Z M11 16.5 L13 16.5 L13 18.5 L11 18.5 Z"/></svg>`,
    color: "#8aa0c0",
    prefix: "напрямок"
  }
};

const FILTERS: { key: FilterKey; label: string; verified?: boolean }[] = [
  { key: "all", label: "Усі" },
  { key: "verified", label: "Перевірені", verified: true },
  { key: "shahed", label: "Шахеди" },
  { key: "ballistic", label: "Балістика" },
  { key: "cruise", label: "Крилаті" },
  { key: "kab", label: "КАБ" },
  { key: "aviation", label: "Авіація" },
  { key: "recon", label: "Розвідка" }
];

const VERIFIED_MIN = 3;

const MAX_EVENT_AGE_HOURS = 24;

// ============================================================
// HELPERS
// ============================================================

function consensusLevel(n: number): string {
  if (n >= 5) return "high";
  if (n >= 3) return "mid";
  return "low";
}

function escapeHtml(text: string): string {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fmtDuration(sec: number | null): string {
  if (sec === null || sec === undefined) return "—";

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);

  if (h > 0) return `${h}г ${m}хв`;

  return `${m}хв`;
}

function fmtTime(ts: string | null | undefined): string {
  if (!ts) return "—";

  try {
    return new Intl.DateTimeFormat("uk-UA", {
      timeZone: "Europe/Kyiv",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(ts));
  } catch {
    return "—";
  }
}

function eventTs(e: ThreatEvent): number {
  return Date.parse(e.source?.ts || "") || 0;
}

// ============================================================
// PANEL CALLBACKS
// ============================================================

export interface PanelCallbacks {
  onHoverToponym: (key: string | null) => void;
  onFlyToponym: (key: string | null) => void;
  onRetry: () => void;
}

// ============================================================
// DRAWER
// ============================================================

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

  open(region: Region): void {
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
      this.status.className =
        "drawer__status drawer__status--queued";

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

  updateRegion(region: Region): void {
    if (this.mode === "active") {
      this.currentRegion = region;
      this.renderHead();
    } else if (this.mode === "queued" && region.active) {
      this.open(region);
    }
  }

  private renderHead(): void {
    const r = this.currentRegion!;
    const alert = r.alert;

    this.status.textContent = alert
      ? "ПОВІТРЯНА ТРИВОГА"
      : "ВІДБІЙ";

    this.status.className =
      "drawer__status " +
      (alert ? "drawer__status--alert" : "drawer__status--calm");
  }

  setEvents(events: ThreatEvent[]): void {
    if (this.mode !== "active") return;

    const now = Date.now();
    const cutoff = now - MAX_EVENT_AGE_HOURS * 3600 * 1000;

    // Свіжі зверху + фільтр по 24 години.
    const filtered = events
      .filter((e) => {
        if (!e.source?.ts) return true;
        const t = Date.parse(e.source.ts);
        return !Number.isFinite(t) || t >= cutoff;
      })
      .sort((a, b) => eventTs(b) - eventTs(a));

    this.events = filtered;
    this.hadData = true;
    this.lastError = "";
    this.renderBody();
    this.removeStaleBanner();
  }

  setError(msg?: string): void {
    if (this.mode !== "active") return;

    this.lastError = (msg || "").slice(0, 160);

    if (this.hadData) this.showStaleBanner();
    else this.showErrorCard();
  }

  private showErrorCard(): void {
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

  private showStaleBanner(): void {
    if (this.body.querySelector(".ev-stale")) return;

    const banner = document.createElement("div");

    banner.className = "ev-stale";

    banner.innerHTML = `
      <div class="ev-stale__dot"></div>
      <div class="ev-stale__txt">
        оновлення не вдалось · показуємо останні дані
      </div>
      <button class="ev-stale__close" data-act="retry">↻</button>
      <button class="ev-stale__close" data-act="close">✕</button>
    `;

    this.body.insertBefore(banner, this.body.firstChild);

    this.wireErrorActions();
  }

  private removeStaleBanner(): void {
    this.body.querySelector(".ev-stale")?.remove();
  }

  private wireErrorActions(): void {
    this.body.querySelectorAll<HTMLButtonElement>(".ev-retry").forEach((b) => {
      b.onclick = (ev: MouseEvent) => {
        ev.stopPropagation();
        this.cb.onRetry();
      };
    });

    this.body
      .querySelectorAll<HTMLButtonElement>(".ev-stale__close")
      .forEach((b) => {
        b.onclick = (ev: MouseEvent) => {
          ev.stopPropagation();

          const act = b.dataset.act;

          if (act === "retry") this.cb.onRetry();
          else this.removeStaleBanner();
        };
      });
  }

  private visibleEvents(): ThreatEvent[] {
    if (this.filter === "all") return this.events;

    if (this.filter === "verified")
      return this.events.filter((e) => e.consensus >= VERIFIED_MIN);

    return this.events.filter((e) => e.threat_type === this.filter);
  }

  private renderBody(): void {
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
            data-filter="${escapeHtml(f.key)}"
          >
            ${escapeHtml(f.label)}
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
    return `${e.threat_type}|${e.toponym_key ?? "_"}|${e.source.id ?? "unknown"}`;
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

    const launchTxt = e.launch_key ? ` · з ${escapeHtml(e.launch_key)}` : "";

    const prefix = meta.prefix;
    const toponym = toponymName(e.toponym_key, e.toponym_raw);

    return `
      <div
        class="ev-row ${isNew ? "ev-row--new" : ""}"
        data-topo="${escapeHtml(e.toponym_key || "")}"
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
            <span class="src-toggle ${open ? "src-toggle--on" : ""}" data-key="${escapeHtml(key)}">
              <span class="src-toggle__n">${e.sources.length}</span>
              джерел${open ? " ▾" : " ▸"}
            </span>
            <span class="consensus consensus--${lvl}">
              <span class="consensus__bar">
                <span class="consensus__fill" style="width:${Math.min(100, (e.consensus / 5) * 100)}%"></span>
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
    return `
      <div class="ev-sources">
        <div class="ev-sources__head">Джерела цього сповіщення</div>
        ${e.sources
          .map(
            (s) => `
            <a
              class="ev-src"
              href="${escapeHtml(s.url || `https://t.me/${s.channel}/${s.id || ""}`)}"
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

  private wire(): void {
    this.body.querySelectorAll<HTMLElement>("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.filter = (btn.dataset.filter || "all") as FilterKey;
        this.renderBody();
      });
    });

    this.body.querySelectorAll<HTMLElement>(".ev-row").forEach((row) => {
      const topo = row.dataset.topo || null;

      row.addEventListener("mouseenter", () =>
        this.cb.onHoverToponym(topo)
      );

      row.addEventListener("mouseleave", () =>
        this.cb.onHoverToponym(null)
      );

      row.addEventListener("click", (ev) => {
        const target = ev.target as HTMLElement;

        if (
          target.closest(".src-toggle") ||
          target.closest(".ev-sources")
        )
          return;

        this.cb.onFlyToponym(topo);
      });
    });

    this.body
      .querySelectorAll<HTMLElement>(".src-toggle")
      .forEach((btn) => {
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();

          const k = btn.dataset.key!;

          if (this.openSources.has(k)) this.openSources.delete(k);
          else this.openSources.add(k);

          this.renderBody();
        });
      });
  }

  close(): void {
    this.root.dataset.open = "false";
    this.currentRegion = null;
    this.mode = null;
    this.cb.onHoverToponym(null);
  }
}
