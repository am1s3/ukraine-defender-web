import type { AlertResponse, ThreatEvent, ThreatType } from "./types";
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

  constructor() {
    this.root = document.getElementById("reportOverlay")!;
    this.card = document.getElementById("reportCard")!;
    this.root.querySelector(".report-overlay__backdrop")!.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") this.close(); });
  }

  open(events: ThreatEvent[], alerts: AlertResponse | null) {
    this.events = events;
    this.alerts = alerts;
    this.render();
    this.root.dataset.open = "true";
  }

  close() {
    this.root.dataset.open = "false";
  }

  private render() {
    const ev = this.events;
    const totalReports = ev.reduce((s, e) => s + e.sources.length, 0);
    const totalConfirmed = ev.reduce((s, e) => s + e.consensus, 0);

    // лічильники по типах
    const byType = ORDER.map((t) => {
      const groups = ev.filter((e) => e.threat_type === t);
      const conf = groups.reduce((s, e) => s + e.consensus, 0);
      return { t, groups: groups.length, conf };
    }).filter((x) => x.groups > 0);
    const maxGroups = Math.max(1, ...byType.map((x) => x.groups));

    // топ напрямків
    const dirs = new Map<string, number>();
    for (const e of ev) {
      if (!e.toponym_key) continue;
      dirs.set(e.toponym_key, (dirs.get(e.toponym_key) ?? 0) + e.consensus);
    }
    const topDirs = [...dirs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    // активні тривоги по країні
    const alertRegions = (this.alerts?.regions ?? []).filter((r) => r.alert).map((r) => r.name_uk);

    // унікальні джерела
    const channels = new Set<string>();
    for (const e of ev) for (const s of e.sources) channels.add(s.channel);

    const counters = `
      <div class="rp-counters">
        <div class="rp-counter"><span class="rp-counter__n">${ev.length}</span><span class="rp-counter__l">сповіщень про цілі</span></div>
        <div class="rp-counter"><span class="rp-counter__n">${totalReports}</span><span class="rp-counter__l">згадок у каналах</span></div>
        <div class="rp-counter"><span class="rp-counter__n">${totalConfirmed}</span><span class="rp-counter__l">підтверджень</span></div>
        <div class="rp-counter"><span class="rp-counter__n">${channels.size}</span><span class="rp-counter__l">джерел</span></div>
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
      </div>` : `<div class="rp-block rp-block--empty">За поточним зрізом каналів цілей не зафіксовано.</div>`;

    const dirsHtml = topDirs.length ? `
      <div class="rp-block">
        <div class="rp-block__title">Топ напрямків</div>
        <div class="rp-dirs">
          ${topDirs.map(([k, c]) => `<span class="rp-dir">${toponymName(k)} <b>${c}</b></span>`).join("")}
        </div>
      </div>` : "";

    const alertsHtml = `
      <div class="rp-block">
        <div class="rp-block__title">Тривога зараз · ${alertRegions.length} рег.</div>
        <div class="rp-alerts ${alertRegions.length ? "" : "rp-alerts--none"}">
          ${alertRegions.length ? alertRegions.map((n) => `<span class="rp-alert-chip">${n}</span>`).join("") : "наразі чисто по всій країні"}
        </div>
      </div>`;

    this.card.innerHTML = `
      <div class="rp-head">
        <div class="rp-head__brand"><span class="rp-head__shield">🛡️</span><span class="rp-head__name">UKRAINE DEFENDER</span></div>
        <button class="rp-close" id="rpClose">✕</button>
      </div>
      <div class="rp-title">ЗВІТ ЗА ПОТОЧНИЙ ЗРІЗ</div>
      <div class="rp-sub">${new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date())} · моніторинг каналів</div>
      ${counters}
      ${bars}
      ${dirsHtml}
      ${alertsHtml}
      <div class="rp-foot">
        <span class="rp-foot__src">джерела: ${[...channels].map((c) => "@" + c).join(", ") || "—"}</span>
        <button class="rp-share" id="rpShare">📤 Поділитися</button>
      </div>`;

    this.card.querySelector("#rpClose")!.addEventListener("click", () => this.close());
    this.card.querySelector("#rpShare")!.addEventListener("click", () => this.share());
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
