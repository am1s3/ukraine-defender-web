import type { AlertResponse, ThreatEvent, ThreatType, NightResponse } from "./types";
import { toBlob } from "html-to-image";
import { TOPONYM_CENTERS } from "./data/toponym-centers";

const TYPE_META: Record<ThreatType, { label: string; icon: string; color: string }> = {
  shahed:    { label: "Шахед / БпЛА", icon: "🛸", color: "#35c4ff" },
  ballistic: { label: "Балістика",    icon: "🚀", color: "#ff3b3b" },
  cruise:    { label: "Крилата",      icon: "☄️", color: "#ffb020" },
  kab:       { label: "КАБ / КАР",    icon: "💣", color: "#ff7a18" },
  aviation:  { label: "Авіація",      icon: "✈️", color: "#ff5fa2" },
  recon:     { label: "Розвідка",     icon: "👁", color: "#7aa2ff" },
  unknown:   { label: "Загроза",      icon: "⚠️", color: "#8aa0c0" },
};
const ORDER: ThreatType[] = ["ballistic", "cruise", "shahed", "kab", "aviation", "recon", "unknown"];

function toponymName(key: string): string {
  return TOPONYM_CENTERS[key]?.name ?? key;
}

export class SummaryOverlay {
  private root: HTMLElement;
  private card: HTMLElement;
  private events: ThreatEvent[] = [];
  private alerts: AlertResponse | null = null;
  private night: NightResponse | null = null;

  constructor() {
    this.root = document.getElementById("reportOverlay")!;
    this.card = document.getElementById("reportCard")!;
    this.root.querySelector(".report-overlay__backdrop")!.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") this.close(); });
  }

  open(events: ThreatEvent[], alerts: AlertResponse | null, night: NightResponse | null) {
    this.events = events;
    this.alerts = alerts;
    this.night = night;
    this.render();
    this.root.dataset.open = "true";
  }

  close() { this.root.dataset.open = "false"; }

  private render() {
    const n = this.night;
    const hasDb = !!n && n.stored_events > 0;

    // Джерело цифр: база (за вікно) якщо є, інакше live-зріз
    const byType = hasDb
      ? ORDER.map((t) => {
          const s = n!.by_type.find((x) => x.type === t);
          return s ? { t, groups: s.count, conf: s.confirmed } : null;
        }).filter((x): x is { t: ThreatType; groups: number; conf: number } => x !== null)
      : ORDER.map((t) => {
          const groups = this.events.filter((e) => e.threat_type === t);
          return groups.length ? { t, groups: groups.length, conf: groups.reduce((s, e) => s + e.consensus, 0) } : null;
        }).filter((x): x is { t: ThreatType; groups: number; conf: number } => x !== null);
    const maxGroups = Math.max(1, ...byType.map((x) => x.groups));

    const topDirs = hasDb
      ? n!.top_toponyms.map((d) => [d.name, d.count] as [string, number])
      : (() => {
          const dirs = new Map<string, number>();
          for (const e of this.events) if (e.toponym_key) dirs.set(e.toponym_key, (dirs.get(e.toponym_key) ?? 0) + e.consensus);
          return [...dirs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, c]) => [toponymName(k), c] as [string, number]);
        })();

    const channels = hasDb
      ? n!.channels.map((c) => c.channel)
      : [...new Set(this.events.flatMap((e) => e.sources.map((s) => s.channel)))];

    const totalEvents = hasDb ? n!.stored_events : this.events.length;
    const totalReports = hasDb ? n!.by_type.reduce((s, x) => s + x.count, 0) : this.events.reduce((s, e) => s + e.sources.length, 0);
    const totalConfirmed = hasDb ? n!.by_type.reduce((s, x) => s + x.confirmed, 0) : this.events.reduce((s, e) => s + e.consensus, 0);

    const windowLabel = hasDb
      ? `за останні ${n!.hours} год · ${n!.stored_events} подій у базі`
      : `поточний зріз каналів · база ще накопичує`;

    const alertRegions = (this.alerts?.regions ?? []).filter((r) => r.alert).map((r) => r.name_uk);

    const counters = `
      <div class="rp-counters">
        <div class="rp-counter"><span class="rp-counter__n">${totalEvents}</span><span class="rp-counter__l">подій за вікно</span></div>
        <div class="rp-counter"><span class="rp-counter__n">${totalReports}</span><span class="rp-counter__l">згадок у каналах</span></div>
        <div class="rp-counter"><span class="rp-counter__n">${totalConfirmed}</span><span class="rp-counter__l">підтверджень</span></div>
        <div class="rp-counter"><span class="rp-counter__n">${channels.length}</span><span class="rp-counter__l">джерел</span></div>
      </div>`;

    const bars = byType.length ? `
      <div class="rp-block">
        <div class="rp-block__title">Розбивка за типами</div>
        <div class="rp-bars">
          ${byType.map((x) => {
            const m = TYPE_META[x.t];
            const w = Math.round((x.groups / maxGroups) * 100);
            return `<div class="rp-bar">
              <span class="rp-bar__icon">${m.icon}</span>
              <span class="rp-bar__name">${m.label}</span>
              <span class="rp-bar__track"><span class="rp-bar__fill" style="width:${w}%;background:${m.color}"></span></span>
              <span class="rp-bar__n" style="color:${m.color}">${x.groups}</span>
            </div>`;
          }).join("")}
        </div>
      </div>` : `<div class="rp-block rp-block--empty">За вікном цілей не зафіксовано.</div>`;

    const dirsHtml = topDirs.length ? `
      <div class="rp-block">
        <div class="rp-block__title">Топ напрямків</div>
        <div class="rp-dirs">
          ${topDirs.map(([name, c]) => `<span class="rp-dir">${name} <b>${c}</b></span>`).join("")}
        </div>
      </div>` : "";

    const windowsHtml = hasDb && n!.windows.length ? `
      <div class="rp-block">
        <div class="rp-block__title">Вікна атак у базі</div>
        <div class="rp-windows">
          ${n!.windows.slice(0, 5).map((w) => `
            <div class="rp-window ${w.alert ? "rp-window--live" : ""}">
              <span class="rp-window__dot"></span>
              <span class="rp-window__reg">${w.region}</span>
              <span class="rp-window__t">${w.started ? this.fmt(w.started) : "—"}${w.ended ? " → " + this.fmt(w.ended) : " → триває"}</span>
            </div>`).join("")}
        </div>
      </div>` : "";

    const alertsHtml = `
      <div class="rp-block">
        <div class="rp-block__title">Тривога зараз · ${alertRegions.length} рег.</div>
        <div class="rp-alerts ${alertRegions.length ? "" : "rp-alerts--none"}">
          ${alertRegions.length ? alertRegions.map((nm) => `<span class="rp-alert-chip">${nm}</span>`).join("") : "наразі чисто по всій країні"}
        </div>
      </div>`;

    this.card.innerHTML = `
      <div class="rp-head">
        <div class="rp-head__brand"><span class="rp-head__shield">🛡️</span><span class="rp-head__name">UKRAINE DEFENDER</span></div>
        <button class="rp-close" id="rpClose">✕</button>
      </div>
      <div class="rp-title">ЗВІТ ${hasDb ? "ЗА ВІКНО" : "ЗА ПОТОЧНИЙ ЗРІЗ"}</div>
      <div class="rp-sub">${windowLabel} · ${new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date())}</div>
      ${counters}
      ${bars}
      ${dirsHtml}
      ${windowsHtml}
      ${alertsHtml}
      <div class="rp-foot">
        <span class="rp-foot__src">джерела: ${channels.map((c) => "@" + c).join(", ") || "—"}</span>
        <button class="rp-share" id="rpShare">📤 Поділитися</button>
      </div>`;

    this.card.querySelector("#rpClose")!.addEventListener("click", () => this.close());
    this.card.querySelector("#rpShare")!.addEventListener("click", () => this.share());
  }

  private fmt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
    return new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
  }

  private async share() {
    const btn = this.card.querySelector("#rpShare") as HTMLButtonElement;
    const old = btn.textContent;
    btn.textContent = "⏳ рендер…";
    btn.disabled = true;
    try {
      const blob = await toBlob(this.card, { backgroundColor: "#0b1220", pixelRatio: 2, cacheBust: true });
      if (!blob) throw new Error("не вдалося зрендерити");
      const file = new File([blob], "ukraine-defender-zvit.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Ukraine Defender — звіт" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "ukraine-defender-zvit.png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      btn.textContent = "✓ готово";
    } catch (e) {
      console.error("share failed", e);
      btn.textContent = "⚠ помилка";
    } finally {
      btn.disabled = false;
      setTimeout(() => { btn.textContent = old; }, 1800);
    }
  }
}
