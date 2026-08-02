import type { Region } from "./types";

function fmtDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h} год ${m % 60} хв`;
  return `${m} хв`;
}

export class Drawer {
  private root: HTMLElement;
  private title: HTMLElement;
  private status: HTMLElement;
  private body: HTMLElement;

  constructor() {
    this.root = document.getElementById("drawer")!;
    this.title = document.getElementById("drawerTitle")!;
    this.status = document.getElementById("drawerStatus")!;
    this.body = document.getElementById("drawerBody")!;
    document.getElementById("drawerClose")!.addEventListener("click", () => this.close());
  }

  open(region: Region) {
    this.title.textContent = region.name_uk;
    if (!region.active) {
      this.status.textContent = "У ЧЕРЗІ ПІДКЛЮЧЕННЯ";
      this.status.className = "drawer__status drawer__status--queued";
      this.body.innerHTML = `
        <div class="queued">
          <p class="queued__name">${region.name_uk}</p>
          <p class="queued__text">Цей регіон підключимо наступним етапом. Стеж за оновленнями — ти наступний.</p>
        </div>`;
    } else {
      const alert = region.alert;
      this.status.textContent = alert ? "🔴 ПОВІТРЯНА ТРИВОГА" : "🟢 ВІДБІЙ";
      this.status.className = "drawer__status " + (alert ? "drawer__status--alert" : "drawer__status--calm");
      this.body.innerHTML = alert ? `
        <div class="alert-card">
          <div class="alert-card__label">Тривога триває</div>
          <div class="alert-card__timer">${fmtDuration(region.duration_sec)}</div>
          <p class="alert-card__hint">Деталі цілей (шахеди / балістика / напрямки) з'являться на ШАГІ 3 — парсинг ТГ-каналів.</p>
        </div>` : `
        <div class="calm-card">
          <p>Загроз немає. Тримаємось.</p>
          <p class="calm-card__sub">Остання зміна статусу: ${region.changed ?? "—"}</p>
        </div>`;
    }
    this.root.dataset.open = "true";
  }

  close() {
    this.root.dataset.open = "false";
  }
}
