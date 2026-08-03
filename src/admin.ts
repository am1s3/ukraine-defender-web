// ============================================================
// Ukraine Defender — admin.ts
// FULL FILE
//
// Админ-панель:
// - тикеты;
// - пользователи;
// - источники;
// - жалобы;
// - логи;
// - настройки;
// - аналитика;
// - проверка прав;
// - интеграция с auth/i18n/support.
// ============================================================

import {
  listAdminTickets,
  closeAdminTicket,
  reopenAdminTicket,
  listAdminUsers,
  setUserRole,
  setUserActive,
  fetchAdminSourceStatus,
  fetchAdminEventReports,
  setAdminEventReportStatus,
  fetchAdminLogs,
  fetchAdminSettings,
  updateAdminSetting,
  fetchAdminAnalyticsSummary
} from "./api";

import type {
  SupportTicket,
  AdminUser,
  AdminSourceStatusEntry,
  EventReport,
  AdminLogEntry,
  SettingRow,
  AdminAnalyticsSummary,
  UserRole
} from "./types";

import {
  canAccessAdminPanel,
  isAuthenticated,
  getUserId,
  isCurrentUserOwner,
  onAuthChanged
} from "./auth";

import {
  translate as t,
  formatDate
} from "./i18n";

import {
  openSupportTicket
} from "./support";

// ============================================================
// STATE
// ============================================================

let initialized = false;

type AdminTab =
  | "tickets"
  | "users"
  | "sources"
  | "reports"
  | "logs"
  | "settings"
  | "analytics";

let activeTab: AdminTab = "tickets";

// ============================================================
// DOM HELPERS
// ============================================================

function el<T extends HTMLElement>(id: string): T | null {
  if (typeof document === "undefined") {
    return null;
  }

  return document.getElementById(id) as T | null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ============================================================
// TOAST
// ============================================================

function showToast(
  text: string,
  kind: "info" | "warn" | "ok" = "info",
  icon = "ℹ️"
): void {
  if (typeof document === "undefined") return;

  const host = el<HTMLDivElement>("toastHost");

  if (!host) return;

  const toast = document.createElement("div");

  toast.className =
    "toast" +
    (kind === "warn"
      ? " toast--warn"
      : kind === "ok"
        ? " toast--ok"
        : "");

  toast.textContent = `${icon} ${text}`;

  host.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--out");

    toast.addEventListener(
      "animationend",
      () => {
        toast.remove();
      },
      { once: true }
    );
  }, 3200);
}

// ============================================================
// ELEMENTS
// ============================================================

interface AdminElements {
  overlay: HTMLDivElement;

  ticketFilter: HTMLSelectElement;

  tickets: HTMLDivElement;
  ticketsRefresh: HTMLButtonElement;

  users: HTMLDivElement;
  usersRefresh: HTMLButtonElement;

  sources: HTMLDivElement;
  sourcesRefresh: HTMLButtonElement;

  reports: HTMLDivElement;
  reportsRefresh: HTMLButtonElement;

  logs: HTMLDivElement;
  logsRefresh: HTMLButtonElement;

  settingsList: HTMLDivElement;
  settingsForm: HTMLFormElement;
  settingKey: HTMLInputElement;
  settingValue: HTMLInputElement;
  settingsRefresh: HTMLButtonElement;

  analyticsSummary: HTMLDivElement;
  analyticsRefresh: HTMLButtonElement;
}

function getElements(): AdminElements | null {
  const overlay = el<HTMLDivElement>("adminOverlay");

  const ticketFilter = el<HTMLSelectElement>("adminTicketFilter");

  const tickets = el<HTMLDivElement>("adminTickets");
  const ticketsRefresh = el<HTMLButtonElement>(
    "adminTicketsRefreshBtn"
  );

  const users = el<HTMLDivElement>("adminUsers");
  const usersRefresh = el<HTMLButtonElement>(
    "adminUsersRefreshBtn"
  );

  const sources = el<HTMLDivElement>("adminSources");
  const sourcesRefresh = el<HTMLButtonElement>(
    "adminSourcesRefreshBtn"
  );

  const reports = el<HTMLDivElement>("adminReports");
  const reportsRefresh = el<HTMLButtonElement>(
    "adminReportsRefreshBtn"
  );

  const logs = el<HTMLDivElement>("adminLogs");
  const logsRefresh = el<HTMLButtonElement>(
    "adminLogsRefreshBtn"
  );

  const settingsList = el<HTMLDivElement>("adminSettingsList");
  const settingsForm = el<HTMLFormElement>("adminSettingForm");
  const settingKey = el<HTMLInputElement>("adminSettingKey");
  const settingValue = el<HTMLInputElement>("adminSettingValue");
  const settingsRefresh = el<HTMLButtonElement>(
    "adminSettingsRefreshBtn"
  );

  const analyticsSummary = el<HTMLDivElement>(
    "adminAnalyticsSummary"
  );
  const analyticsRefresh = el<HTMLButtonElement>(
    "adminAnalyticsRefreshBtn"
  );

  if (
    !overlay ||
    !ticketFilter ||
    !tickets ||
    !ticketsRefresh ||
    !users ||
    !usersRefresh ||
    !sources ||
    !sourcesRefresh ||
    !reports ||
    !reportsRefresh ||
    !logs ||
    !logsRefresh ||
    !settingsList ||
    !settingsForm ||
    !settingKey ||
    !settingValue ||
    !settingsRefresh ||
    !analyticsSummary ||
    !analyticsRefresh
  ) {
    return null;
  }

  return {
    overlay,
    ticketFilter,
    tickets,
    ticketsRefresh,
    users,
    usersRefresh,
    sources,
    sourcesRefresh,
    reports,
    reportsRefresh,
    logs,
    logsRefresh,
    settingsList,
    settingsForm,
    settingKey,
    settingValue,
    settingsRefresh,
    analyticsSummary,
    analyticsRefresh
  };
}

// ============================================================
// OPEN / CLOSE
// ============================================================

function openAuthLogin(): void {
  if (typeof document === "undefined") return;

  const authOverlay = document.getElementById("authOverlay");

  if (!authOverlay) return;

  document
    .querySelectorAll<HTMLElement>("[data-auth-view]")
    .forEach((node) => {
      node.hidden =
        node.getAttribute("data-auth-view") !== "login";
    });

  authOverlay.dataset.open = "true";
}

export function openAdmin(): void {
  const els = getElements();

  if (!els) return;

  if (!isAuthenticated()) {
    openAuthLogin();
    return;
  }

  if (!canAccessAdminPanel()) {
    showToast(t("toast.notEnoughRights"), "warn", "⛔");
    return;
  }

  els.overlay.dataset.open = "true";

  void loadTab(activeTab);
}

export function closeAdmin(): void {
  const els = getElements();

  if (!els) return;

  els.overlay.dataset.open = "false";
}

// ============================================================
// TABS
// ============================================================

function setTab(tab: AdminTab): void {
  activeTab = tab;

  if (typeof document === "undefined") return;

  document.querySelectorAll(".admin__tab").forEach((node) => {
    const button = node as HTMLElement;

    button.classList.toggle(
      "admin__tab--on",
      button.dataset.adminTab === tab
    );
  });

  document
    .querySelectorAll<HTMLElement>(".admin__pane")
    .forEach((pane) => {
      pane.hidden = pane.getAttribute("data-admin-pane") !== tab;
    });

  void loadTab(tab);
}

function bindTabs(): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll(".admin__tab").forEach((node) => {
    node.addEventListener("click", () => {
      const tab = (node as HTMLElement).dataset.adminTab;

      if (!tab) return;

      setTab(tab as AdminTab);
    });
  });
}

// ============================================================
// LOAD ROUTER
// ============================================================

async function loadTab(tab: AdminTab): Promise<void> {
  if (!canAccessAdminPanel()) {
    return;
  }

  if (tab === "tickets") {
    await loadTickets();
    return;
  }

  if (tab === "users") {
    await loadUsers();
    return;
  }

  if (tab === "sources") {
    await loadSources();
    return;
  }

  if (tab === "reports") {
    await loadReports();
    return;
  }

  if (tab === "logs") {
    await loadLogs();
    return;
  }

  if (tab === "settings") {
    await loadSettings();
    return;
  }

  if (tab === "analytics") {
    await loadAnalytics();
    return;
  }
}

// ============================================================
// TICKETS
// ============================================================

function ticketStatusBadge(status: string): string {
  if (status === "open") {
    return "ud-badge ud-badge--open";
  }

  if (status === "answered") {
    return "ud-badge ud-badge--answered";
  }

  return "ud-badge ud-badge--closed";
}

function renderTickets(tickets: SupportTicket[]): void {
  const els = getElements();

  if (!els) return;

  if (!tickets.length) {
    els.tickets.innerHTML = `
      <div class="admin__empty">
        —
      </div>
    `;

    return;
  }

  els.tickets.innerHTML = tickets
    .map((ticket) => {
      const id = Number(ticket.id);

      const status = escapeHtml(ticket.status || "open");

      const closeBtn =
        ticket.status === "closed"
          ? `
            <button
              class="ud-btn ud-btn--ghost"
              style="padding:6px 9px;font-size:11px;"
              data-action="reopen"
              data-id="${id}"
            >
              ${escapeHtml(t("admin.reopen"))}
            </button>
          `
          : `
            <button
              class="ud-btn ud-btn--ghost"
              style="padding:6px 9px;font-size:11px;"
              data-action="close"
              data-id="${id}"
            >
              ${escapeHtml(t("admin.close"))}
            </button>
          `;

      return `
        <div class="admin-row">
          <div class="admin-row__top">
            <div class="admin-row__title">
              ${escapeHtml(ticket.subject)}
            </div>

            <span class="${ticketStatusBadge(ticket.status)}">
              ${status}
            </span>
          </div>

          <div class="admin-row__meta">
            #${id}
            ·
            ${escapeHtml(ticket.user_nickname || "unknown")}
            ·
            ${escapeHtml(ticket.category || "other")}
            ·
            ${escapeHtml(formatDate(ticket.updated_at || ticket.created_at))}
          </div>

          <div class="ud-row" style="margin-top:10px;">
            <button
              class="ud-btn"
              style="padding:6px 9px;font-size:11px;"
              data-action="open"
              data-id="${id}"
            >
              ${escapeHtml(t("admin.open"))}
            </button>

            ${closeBtn}
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadTickets(): Promise<void> {
  const els = getElements();

  if (!els) return;

  els.tickets.innerHTML = `
    <div class="admin__empty">
      ${escapeHtml(t("common.loading"))}
    </div>
  `;

  try {
    const status = els.ticketFilter.value as
      | ""
      | "open"
      | "answered"
      | "closed";

    const data = await listAdminTickets(status);

    renderTickets(data.tickets || []);
  } catch (error) {
    els.tickets.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((error as Error).message || error))}
      </div>
    `;
  }
}

function bindTicketActions(): void {
  const els = getElements();

  if (!els) return;

  els.tickets.addEventListener("click", async (event) => {
    const target = (event.target as HTMLElement).closest(
      "[data-action]"
    );

    if (!target) return;

    const action = target.getAttribute("data-action");
    const id = Number(target.getAttribute("data-id"));

    if (!Number.isFinite(id)) return;

    try {
      if (action === "open") {
        closeAdmin();

        await openSupportTicket(id);

        return;
      }

      if (action === "close") {
        await closeAdminTicket(id);

        showToast(t("toast.ticketClosed"), "ok", "✅");

        await loadTickets();

        return;
      }

      if (action === "reopen") {
        await reopenAdminTicket(id);

        showToast(t("toast.ticketReopened"), "ok", "🔁");

        await loadTickets();

        return;
      }
    } catch (error) {
      showToast(
        String((error as Error).message || error),
        "warn",
        "⚠️"
      );
    }
  });

  els.ticketFilter.addEventListener("change", () => {
    void loadTickets();
  });

  els.ticketsRefresh.addEventListener("click", () => {
    void loadTickets();
  });
}

// ============================================================
// USERS
// ============================================================

function renderUsers(users: AdminUser[]): void {
  const els = getElements();

  if (!els) return;

  if (!users.length) {
    els.users.innerHTML = `
      <div class="admin__empty">
        —
      </div>
    `;

    return;
  }

  const currentUserId = getUserId();
  const owner = isCurrentUserOwner();

  els.users.innerHTML = users
    .map((user) => {
      const active = !!user.is_active;

      const isSelf = user.id === currentUserId;

      const targetIsOwner = user.role === "owner";

      const roleDisabled = (role: UserRole): boolean => {
        if (isSelf) return true;

        if (user.role === role) return true;

        if (targetIsOwner && !owner) return true;

        if (role === "owner" && !owner) return true;

        return false;
      };

      const banDisabled =
        isSelf || (targetIsOwner && !owner);

      return `
        <div class="admin-row">
          <div class="admin-row__top">
            <div class="admin-row__title">
              ${escapeHtml(user.nickname)}
            </div>

            <span class="ud-badge">
              ${escapeHtml(user.role)}
            </span>
          </div>

          <div class="admin-row__meta">
            ${escapeHtml(user.email)}
            ·
            ${active ? "active" : "disabled"}
            ·
            ${escapeHtml(formatDate(user.created_at))}
          </div>

          <div class="ud-row" style="margin-top:10px;flex-wrap:wrap;">
            <button
              class="ud-btn ud-btn--ghost"
              style="padding:6px 9px;font-size:11px;"
              data-action="role"
              data-role="user"
              data-id="${Number(user.id)}"
              ${roleDisabled("user") ? "disabled" : ""}
            >
              user
            </button>

            <button
              class="ud-btn ud-btn--ghost"
              style="padding:6px 9px;font-size:11px;"
              data-action="role"
              data-role="support"
              data-id="${Number(user.id)}"
              ${roleDisabled("support") ? "disabled" : ""}
            >
              support
            </button>

            <button
              class="ud-btn ud-btn--ghost"
              style="padding:6px 9px;font-size:11px;"
              data-action="role"
              data-role="admin"
              data-id="${Number(user.id)}"
              ${roleDisabled("admin") ? "disabled" : ""}
            >
              admin
            </button>

            <button
              class="ud-btn"
              style="padding:6px 9px;font-size:11px;"
              data-action="toggle-active"
              data-id="${Number(user.id)}"
              ${banDisabled ? "disabled" : ""}
            >
              ${active
                ? escapeHtml(t("admin.ban"))
                : escapeHtml(t("admin.unban"))}
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadUsers(): Promise<void> {
  const els = getElements();

  if (!els) return;

  els.users.innerHTML = `
    <div class="admin__empty">
      ${escapeHtml(t("common.loading"))}
    </div>
  `;

  try {
    const data = await listAdminUsers();

    renderUsers(data.users || []);
  } catch (error) {
    els.users.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((error as Error).message || error))}
      </div>
    `;
  }
}

function bindUserActions(): void {
  const els = getElements();

  if (!els) return;

  els.users.addEventListener("click", async (event) => {
    const target = (event.target as HTMLElement).closest(
      "[data-action]"
    );

    if (!target) return;

    const action = target.getAttribute("data-action");
    const id = Number(target.getAttribute("data-id"));
    const role = target.getAttribute("data-role") as UserRole | null;

    if (!Number.isFinite(id)) return;

    try {
      if (action === "role" && role) {
        await setUserRole(id, role);

        showToast(t("toast.roleUpdated"), "ok", "🧠");

        await loadUsers();

        return;
      }

      if (action === "toggle-active") {
        const row = target.closest(".admin-row");

        const meta =
          row?.querySelector(".admin-row__meta")?.textContent || "";

        const isActive =
          meta.includes("active") && !meta.includes("disabled");

        await setUserActive(id, !isActive);

        showToast(
          isActive
            ? t("toast.userBanned")
            : t("toast.userUnbanned"),
          "ok",
          "🛡️"
        );

        await loadUsers();

        return;
      }
    } catch (error) {
      showToast(
        String((error as Error).message || error),
        "warn",
        "⚠️"
      );
    }
  });

  els.usersRefresh.addEventListener("click", () => {
    void loadUsers();
  });
}

// ============================================================
// SOURCES
// ============================================================

function renderSources(sources: AdminSourceStatusEntry[]): void {
  const els = getElements();

  if (!els) return;

  if (!sources.length) {
    els.sources.innerHTML = `
      <div class="admin__empty">
        —
      </div>
    `;

    return;
  }

  els.sources.innerHTML = sources
    .map((source) => {
      const active = !!source.active;

      return `
        <div class="admin-row">
          <div class="admin-row__top">
            <div class="admin-row__title">
              @${escapeHtml(source.handle)}
            </div>

            <span class="ud-badge ${active ? "ud-badge--answered" : "ud-badge--closed"}">
              ${active ? "active" : "inactive"}
            </span>
          </div>

          <div class="admin-row__meta">
            ${escapeHtml(source.kind || "universal")}
            ·
            weight ${Number(source.weight ?? 1).toFixed(2)}
            <br />
            last success: ${escapeHtml(formatDate(source.last_success_at || ""))}
            <br />
            last error: ${escapeHtml(source.last_error || "—")}
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadSources(): Promise<void> {
  const els = getElements();

  if (!els) return;

  els.sources.innerHTML = `
    <div class="admin__empty">
      ${escapeHtml(t("common.loading"))}
    </div>
  `;

  try {
    const data = await fetchAdminSourceStatus();

    renderSources(data.sources || []);
  } catch (error) {
    els.sources.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((error as Error).message || error))}
      </div>
    `;
  }
}

function bindSourceActions(): void {
  const els = getElements();

  if (!els) return;

  els.sourcesRefresh.addEventListener("click", () => {
    void loadSources();
  });
}

// ============================================================
// REPORTS
// ============================================================

function renderReports(reports: EventReport[]): void {
  const els = getElements();

  if (!els) return;

  if (!reports.length) {
    els.reports.innerHTML = `
      <div class="admin__empty">
        —
      </div>
    `;

    return;
  }

  els.reports.innerHTML = reports
    .map((report) => {
      const closed =
        report.status === "false" ||
        report.status === "resolved";

      const buttons = closed
        ? ""
        : `
          <div class="ud-row" style="margin-top:10px;">
            <button
              class="ud-btn ud-btn--ghost"
              style="padding:6px 9px;font-size:11px;"
              data-action="report-false"
              data-id="${Number(report.id)}"
            >
              False
            </button>

            <button
              class="ud-btn"
              style="padding:6px 9px;font-size:11px;"
              data-action="report-resolved"
              data-id="${Number(report.id)}"
            >
              Resolved
            </button>
          </div>
        `;

      return `
        <div class="admin-row">
          <div class="admin-row__top">
            <div class="admin-row__title">
              ${escapeHtml(report.event_hash || "event")}
            </div>

            <span class="ud-badge">
              ${escapeHtml(report.status)}
            </span>
          </div>

          <div class="admin-row__meta">
            ${escapeHtml(report.reporter_nickname || "unknown")}
            ·
            ${escapeHtml(formatDate(report.created_at))}
            <br />
            ${escapeHtml(report.comment || "")}
          </div>

          ${buttons}
        </div>
      `;
    })
    .join("");
}

async function loadReports(): Promise<void> {
  const els = getElements();

  if (!els) return;

  els.reports.innerHTML = `
    <div class="admin__empty">
      ${escapeHtml(t("common.loading"))}
    </div>
  `;

  try {
    const data = await fetchAdminEventReports();

    renderReports(data.reports || []);
  } catch (error) {
    els.reports.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((error as Error).message || error))}
      </div>
    `;
  }
}

function bindReportActions(): void {
  const els = getElements();

  if (!els) return;

  els.reports.addEventListener("click", async (event) => {
    const target = (event.target as HTMLElement).closest(
      "[data-action]"
    );

    if (!target) return;

    const action = target.getAttribute("data-action");
    const id = Number(target.getAttribute("data-id"));

    if (!Number.isFinite(id)) return;

    try {
      if (action === "report-false") {
        await setAdminEventReportStatus(id, "false");

        showToast(t("toast.reportFalse"), "ok", "🚫");

        await loadReports();

        return;
      }

      if (action === "report-resolved") {
        await setAdminEventReportStatus(id, "resolved");

        showToast(t("toast.reportResolved"), "ok", "✅");

        await loadReports();

        return;
      }
    } catch (error) {
      showToast(
        String((error as Error).message || error),
        "warn",
        "⚠️"
      );
    }
  });

  els.reportsRefresh.addEventListener("click", () => {
    void loadReports();
  });
}

// ============================================================
// LOGS
// ============================================================

function renderLogs(logs: AdminLogEntry[]): void {
  const els = getElements();

  if (!els) return;

  if (!logs.length) {
    els.logs.innerHTML = `
      <div class="admin__empty">
        —
      </div>
    `;

    return;
  }

  els.logs.innerHTML = logs
    .map((log) => {
      return `
        <div class="admin-row">
          <div class="admin-row__top">
            <div class="admin-row__title">
              ${escapeHtml(log.action)}
            </div>

            <span class="ud-badge">
              ${escapeHtml(log.admin_nickname || "system")}
            </span>
          </div>

          <div class="admin-row__meta">
            target: ${escapeHtml(log.target || "—")}
            <br />
            ${escapeHtml(formatDate(log.created_at))}
            <br />
            ${escapeHtml(log.details || "")}
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadLogs(): Promise<void> {
  const els = getElements();

  if (!els) return;

  els.logs.innerHTML = `
    <div class="admin__empty">
      ${escapeHtml(t("common.loading"))}
    </div>
  `;

  try {
    const data = await fetchAdminLogs();

    renderLogs(data.logs || []);
  } catch (error) {
    els.logs.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((error as Error).message || error))}
      </div>
    `;
  }
}

function bindLogActions(): void {
  const els = getElements();

  if (!els) return;

  els.logsRefresh.addEventListener("click", () => {
    void loadLogs();
  });
}

// ============================================================
// SETTINGS
// ============================================================

function renderSettings(settings: SettingRow[]): void {
  const els = getElements();

  if (!els) return;

  if (!settings.length) {
    els.settingsList.innerHTML = `
      <div class="admin__empty">
        —
      </div>
    `;

    return;
  }

  els.settingsList.innerHTML = settings
    .map((setting) => {
      return `
        <div class="admin-row">
          <div class="admin-row__top">
            <div class="admin-row__title">
              ${escapeHtml(setting.key)}
            </div>
          </div>

          <div class="admin-row__meta">
            ${escapeHtml(setting.value)}
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadSettings(): Promise<void> {
  const els = getElements();

  if (!els) return;

  els.settingsList.innerHTML = `
    <div class="admin__empty">
      ${escapeHtml(t("common.loading"))}
    </div>
  `;

  try {
    const data = await fetchAdminSettings();

    renderSettings(data.settings || []);
  } catch (error) {
    els.settingsList.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((error as Error).message || error))}
      </div>
    `;
  }
}

function bindSettingsActions(): void {
  const els = getElements();

  if (!els) return;

  els.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const key = els.settingKey.value.trim();
    const value = els.settingValue.value.trim();

    if (!key || !value) {
      showToast(t("common.error"), "warn", "⚠️");
      return;
    }

    try {
      await updateAdminSetting(key, value);

      showToast(t("toast.settingsSaved"), "ok", "⚙️");

      els.settingValue.value = "";

      await loadSettings();
    } catch (error) {
      showToast(
        String((error as Error).message || error),
        "warn",
        "⚠️"
      );
    }
  });

  els.settingsRefresh.addEventListener("click", () => {
    void loadSettings();
  });
}

// ============================================================
// ANALYTICS
// ============================================================

function renderAnalytics(summary: AdminAnalyticsSummary): void {
  const els = getElements();

  if (!els) return;

  const items: Array<[string, number]> = [
    ["users_total", summary.users_total ?? 0],
    ["tickets_open", summary.tickets_open ?? 0],
    ["events_24h", summary.events_24h ?? 0],
    ["alerts_24h", summary.alerts_24h ?? 0],
    ["messages_total", summary.messages_total ?? 0],
    ["tickets_total", summary.tickets_total ?? 0],
    ["reports_new", summary.reports_new ?? 0]
  ];

  els.analyticsSummary.innerHTML = items
    .map(([key, value]) => {
      return `
        <div class="admin__stat">
          <b>${Number(value)}</b>
          <span>${escapeHtml(key.replaceAll("_", " "))}</span>
        </div>
      `;
    })
    .join("");
}

async function loadAnalytics(): Promise<void> {
  const els = getElements();

  if (!els) return;

  els.analyticsSummary.innerHTML = `
    <div class="admin__empty">
      ${escapeHtml(t("common.loading"))}
    </div>
  `;

  try {
    const data = await fetchAdminAnalyticsSummary();

    renderAnalytics(data.summary);
  } catch (error) {
    els.analyticsSummary.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((error as Error).message || error))}
      </div>
    `;
  }
}

function bindAnalyticsActions(): void {
  const els = getElements();

  if (!els) return;

  els.analyticsRefresh.addEventListener("click", () => {
    void loadAnalytics();
  });
}

// ============================================================
// CLOSE / GLOBAL BINDINGS
// ============================================================

function bindCloseButtons(): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll("[data-admin-close]").forEach((node) => {
    node.addEventListener("click", () => {
      closeAdmin();
    });
  });
}

function bindGlobalEvents(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("ud:open-admin", () => {
    openAdmin();
  });

  onAuthChanged(() => {
    const els = getElements();

    if (!els) return;

    if (
      els.overlay.dataset.open === "true" &&
      !canAccessAdminPanel()
    ) {
      closeAdmin();
    }
  });
}

// ============================================================
// INIT
// ============================================================

export function initAdmin(): void {
  if (initialized) return;

  initialized = true;

  bindCloseButtons();
  bindTabs();

  bindTicketActions();
  bindUserActions();
  bindSourceActions();
  bindReportActions();
  bindLogActions();
  bindSettingsActions();
  bindAnalyticsActions();

  bindGlobalEvents();
}

// ============================================================
// AUTOINIT
// ============================================================

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initAdmin();
    });
  } else {
    initAdmin();
  }
}
