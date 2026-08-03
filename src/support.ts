// ============================================================
// Ukraine Defender — support.ts
// FULL FILE
//
// Техподдержка:
// - список тикетов;
// - создание тикета;
// - просмотр тикета;
// - ответы;
// - статусы;
// - связь с auth;
// - связь с i18n;
// - события открытия.
// ============================================================

import {
  listSupportTickets,
  createSupportTicket,
  getSupportTicket,
  sendSupportMessage
} from "./api";

import type {
  SupportTicket,
  SupportMessage,
  SupportTicketCategory,
  SupportTicketStatus
} from "./types";

import {
  isAuthenticated,
  isCurrentUserStaff,
  onAuthChanged
} from "./auth";

import {
  translate as t,
  formatDate
} from "./i18n";

// ============================================================
// STATE
// ============================================================

let initialized = false;

let currentTicketId: number | null = null;

type SupportView = "list" | "ticket" | "new";

let view: SupportView = "list";

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

interface SupportElements {
  overlay: HTMLDivElement;
  authRequired: HTMLDivElement;
  app: HTMLDivElement;

  goLoginBtn: HTMLButtonElement;

  newTicketBtn: HTMLButtonElement;
  refreshBtn: HTMLButtonElement;

  ticketsList: HTMLDivElement;

  ticketView: HTMLDivElement;
  backBtn: HTMLButtonElement;
  ticketStatus: HTMLSpanElement;
  ticketSubject: HTMLHeadingElement;
  messages: HTMLDivElement;

  messageForm: HTMLFormElement;
  messageText: HTMLTextAreaElement;

  newForm: HTMLFormElement;
  category: HTMLSelectElement;
  subject: HTMLInputElement;
  body: HTMLTextAreaElement;
  cancelNewBtn: HTMLButtonElement;
}

function getElements(): SupportElements | null {
  const overlay = el<HTMLDivElement>("supportOverlay");
  const authRequired = el<HTMLDivElement>("supportAuthRequired");
  const app = el<HTMLDivElement>("supportApp");

  const goLoginBtn = el<HTMLButtonElement>("supportGoLoginBtn");

  const newTicketBtn = el<HTMLButtonElement>("supportNewTicketBtn");
  const refreshBtn = el<HTMLButtonElement>("supportRefreshBtn");

  const ticketsList = el<HTMLDivElement>("supportTicketsList");

  const ticketView = el<HTMLDivElement>("supportTicketView");
  const backBtn = el<HTMLButtonElement>("supportBackBtn");
  const ticketStatus = el<HTMLSpanElement>("supportTicketStatus");
  const ticketSubject = el<HTMLHeadingElement>("supportTicketSubject");
  const messages = el<HTMLDivElement>("supportMessages");

  const messageForm = el<HTMLFormElement>("supportMessageForm");
  const messageText = el<HTMLTextAreaElement>("supportMessageText");

  const newForm = el<HTMLFormElement>("supportNewForm");
  const category = el<HTMLSelectElement>("supportCategory");
  const subject = el<HTMLInputElement>("supportSubject");
  const body = el<HTMLTextAreaElement>("supportBody");
  const cancelNewBtn = el<HTMLButtonElement>("supportCancelNewBtn");

  if (
    !overlay ||
    !authRequired ||
    !app ||
    !goLoginBtn ||
    !newTicketBtn ||
    !refreshBtn ||
    !ticketsList ||
    !ticketView ||
    !backBtn ||
    !ticketStatus ||
    !ticketSubject ||
    !messages ||
    !messageForm ||
    !messageText ||
    !newForm ||
    !category ||
    !subject ||
    !body ||
    !cancelNewBtn
  ) {
    return null;
  }

  return {
    overlay,
    authRequired,
    app,
    goLoginBtn,
    newTicketBtn,
    refreshBtn,
    ticketsList,
    ticketView,
    backBtn,
    ticketStatus,
    ticketSubject,
    messages,
    messageForm,
    messageText,
    newForm,
    category,
    subject,
    body,
    cancelNewBtn
  };
}

// ============================================================
// OPEN / CLOSE
// ============================================================

export function openSupport(): void {
  const els = getElements();

  if (!els) return;

  els.overlay.dataset.open = "true";

  renderAuthState();
}

export function closeSupport(): void {
  const els = getElements();

  if (!els) return;

  els.overlay.dataset.open = "false";
}

// ============================================================
// VIEW
// ============================================================

function setView(next: SupportView): void {
  view = next;

  const els = getElements();

  if (!els) return;

  els.ticketsList.hidden = view !== "list";
  els.ticketView.hidden = view !== "ticket";
  els.newForm.hidden = view !== "new";
}

function showList(): void {
  setView("list");

  void loadTickets();
}

function showNewForm(): void {
  setView("new");
}

// ============================================================
// AUTH UI
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

function renderAuthState(): void {
  const els = getElements();

  if (!els) return;

  const authed = isAuthenticated();

  els.authRequired.hidden = authed;
  els.app.hidden = !authed;

  if (!authed) {
    return;
  }

  if (view === "list") {
    void loadTickets();
  }

  if (view === "ticket" && currentTicketId) {
    void loadTicket();
  }
}

// ============================================================
// TICKETS LIST
// ============================================================

function statusBadgeClass(
  status: SupportTicketStatus | string
): string {
  if (status === "open") {
    return "ud-badge ud-badge--open";
  }

  if (status === "answered") {
    return "ud-badge ud-badge--answered";
  }

  return "ud-badge ud-badge--closed";
}

function statusLabel(
  status: SupportTicketStatus | string
): string {
  return t(`support.status.${status}`);
}

function renderTickets(tickets: SupportTicket[]): void {
  const els = getElements();

  if (!els) return;

  if (!tickets.length) {
    els.ticketsList.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(t("support.empty"))}
      </div>
    `;

    return;
  }

  els.ticketsList.innerHTML = tickets
    .map((ticket) => {
      const id = Number(ticket.id);

      return `
        <div class="support-ticket" data-ticket-id="${id}">
          <div class="support-ticket__top">
            <div class="support-ticket__title">
              ${escapeHtml(ticket.subject)}
            </div>

            <span class="${statusBadgeClass(ticket.status)}">
              ${escapeHtml(statusLabel(ticket.status))}
            </span>
          </div>

          <div class="support-ticket__meta">
            ${escapeHtml(t(`support.categories.${ticket.category}`))}
            ·
            ${escapeHtml(formatDate(ticket.updated_at || ticket.created_at))}
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadTickets(): Promise<void> {
  const els = getElements();

  if (!els) return;

  if (!isAuthenticated()) {
    renderAuthState();
    return;
  }

  try {
    const data = await listSupportTickets();

    renderTickets(data.tickets || []);
  } catch (error) {
    els.ticketsList.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((error as Error).message || error))}
      </div>
    `;
  }
}

// ============================================================
// TICKET DETAIL
// ============================================================

export async function openSupportTicket(
  ticketId: number
): Promise<void> {
  if (!isAuthenticated()) {
    openAuthLogin();
    return;
  }

  currentTicketId = ticketId;

  setView("ticket");

  openSupport();

  await loadTicket();
}

function renderMessages(messages: SupportMessage[]): void {
  const els = getElements();

  if (!els) return;

  if (!messages.length) {
    els.messages.innerHTML = `
      <div class="admin__empty">
        —
      </div>
    `;

    return;
  }

  els.messages.innerHTML = messages
    .map((message) => {
      const admin = !!message.is_admin;

      const author = admin
        ? t("roles.support")
        : message.nickname || t("roles.user");

      return `
        <div class="support-message ${admin ? "support-message--admin" : ""}">
          <div class="support-message__head">
            <span>${escapeHtml(author)}</span>
            <span>${escapeHtml(formatDate(message.created_at))}</span>
          </div>

          <div class="support-message__body">
            ${escapeHtml(message.body)}
          </div>
        </div>
      `;
    })
    .join("");

  els.messages.scrollTop = els.messages.scrollHeight;
}

async function loadTicket(): Promise<void> {
  const els = getElements();

  if (!els) return;

  if (!currentTicketId) return;

  if (!isAuthenticated()) {
    renderAuthState();
    return;
  }

  try {
    const data = await getSupportTicket(currentTicketId);

    const ticket = data.ticket;

    if (!ticket) {
      throw new Error("ticket not found");
    }

    els.ticketSubject.textContent = ticket.subject;

    els.ticketStatus.textContent = statusLabel(ticket.status);
    els.ticketStatus.className = statusBadgeClass(ticket.status);

    renderMessages(data.messages || []);

    const staff = isCurrentUserStaff();

    els.messageText.disabled =
      ticket.status === "closed" && !staff;
  } catch (error) {
    els.messages.innerHTML = `
      <div class="admin__empty">
        ${escapeHtml(String((error as Error).message || error))}
      </div>
    `;
  }
}

// ============================================================
// CREATE TICKET
// ============================================================

async function handleCreateTicket(
  event: SubmitEvent
): Promise<void> {
  event.preventDefault();

  const els = getElements();

  if (!els) return;

  if (!isAuthenticated()) {
    openAuthLogin();
    return;
  }

  const category = els.category.value as SupportTicketCategory;
  const subject = els.subject.value.trim();
  const body = els.body.value.trim();

  if (subject.length < 3) {
    showToast(t("common.error"), "warn", "⚠️");
    return;
  }

  if (body.length < 3) {
    showToast(t("common.error"), "warn", "⚠️");
    return;
  }

  try {
    await createSupportTicket({
      category,
      subject,
      body
    });

    els.subject.value = "";
    els.body.value = "";

    showToast(t("toast.ticketCreated"), "ok", "🛠");

    showList();
  } catch (error) {
    showToast(
      String((error as Error).message || error),
      "warn",
      "⚠️"
    );
  }
}

// ============================================================
// SEND MESSAGE
// ============================================================

async function handleSendMessage(
  event: SubmitEvent
): Promise<void> {
  event.preventDefault();

  const els = getElements();

  if (!els) return;

  if (!currentTicketId) return;

  if (!isAuthenticated()) {
    openAuthLogin();
    return;
  }

  const body = els.messageText.value.trim();

  if (!body) return;

  try {
    await sendSupportMessage(currentTicketId, body);

    els.messageText.value = "";

    await loadTicket();
  } catch (error) {
    showToast(
      String((error as Error).message || error),
      "warn",
      "⚠️"
    );
  }
}

// ============================================================
// BINDINGS
// ============================================================

function bindCloseButtons(): void {
  if (typeof document === "undefined") return;

  document
    .querySelectorAll("[data-support-close]")
    .forEach((node) => {
      node.addEventListener("click", () => {
        closeSupport();
      });
    });
}

function bind(): void {
  const els = getElements();

  if (!els) return;

  bindCloseButtons();

  els.goLoginBtn.addEventListener("click", () => {
    closeSupport();
    openAuthLogin();
  });

  els.newTicketBtn.addEventListener("click", () => {
    showNewForm();
  });

  els.refreshBtn.addEventListener("click", () => {
    if (view === "ticket") {
      void loadTicket();
    } else {
      void loadTickets();
    }
  });

  els.backBtn.addEventListener("click", () => {
    showList();
  });

  els.cancelNewBtn.addEventListener("click", () => {
    showList();
  });

  els.ticketsList.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest(
      "[data-ticket-id]"
    );

    if (!target) return;

    const ticketId = Number(target.getAttribute("data-ticket-id"));

    if (!Number.isFinite(ticketId)) return;

    void openSupportTicket(ticketId);
  });

  els.newForm.addEventListener("submit", (event) => {
    void handleCreateTicket(event);
  });

  els.messageForm.addEventListener("submit", (event) => {
    void handleSendMessage(event);
  });

  window.addEventListener("ud:open-support", () => {
    openSupport();
  });

  onAuthChanged(() => {
    renderAuthState();
  });
}

// ============================================================
// INIT
// ============================================================

export function initSupport(): void {
  if (initialized) return;

  initialized = true;

  bind();

  renderAuthState();
}

// ============================================================
// AUTOINIT
// ============================================================

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initSupport();
    });
  } else {
    initSupport();
  }
}
