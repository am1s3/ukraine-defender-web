// ============================================================
// Ukraine Defender — donate.ts
// FULL FILE
//
// Донаты:
// - банка;
// - ссылка;
// - копирование ссылки;
// - settings donation_url;
// - аналитика;
// - событие открытия.
// ============================================================

import {
  fetchPublicSettings,
  trackAnalyticsEvent
} from "./api";

import {
  translate as t
} from "./i18n";

// ============================================================
// STATE
// ============================================================

const FALLBACK_DONATION_URL =
  "https://send.monobank.ua/jar/4tGSchYaiH";

let initialized = false;

let donationUrl = FALLBACK_DONATION_URL;

let settingsLoaded = false;

// ============================================================
// DOM HELPERS
// ============================================================

function el<T extends HTMLElement>(id: string): T | null {
  if (typeof document === "undefined") {
    return null;
  }

  return document.getElementById(id) as T | null;
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

interface DonateElements {
  overlay: HTMLDivElement;
  link: HTMLAnchorElement;
  copyBtn: HTMLButtonElement;
  message: HTMLDivElement;
  urlBox: HTMLElement | null;
}

function getElements(): DonateElements | null {
  const overlay = el<HTMLDivElement>("donateOverlay");
  const link = el<HTMLAnchorElement>("donateLink");
  const copyBtn = el<HTMLButtonElement>("donateCopyBtn");
  const message = el<HTMLDivElement>("donateMessage");

  if (!overlay || !link || !copyBtn || !message) {
    return null;
  }

  const urlBox = overlay.querySelector<HTMLElement>(".donate__url");

  return {
    overlay,
    link,
    copyBtn,
    message,
    urlBox
  };
}

// ============================================================
// MESSAGE
// ============================================================

function showMessage(
  els: DonateElements,
  text: string,
  ok: boolean
): void {
  els.message.hidden = false;
  els.message.textContent = text;

  els.message.className = `ud-message ${
    ok ? "ud-message--ok" : "ud-message--error"
  }`;

  window.setTimeout(() => {
    els.message.hidden = true;
  }, 3500);
}

// ============================================================
// APPLY URL
// ============================================================

function applyDonationUrl(): void {
  const els = getElements();

  if (!els) return;

  els.link.href = donationUrl;

  if (els.urlBox) {
    els.urlBox.textContent = donationUrl;
  }

  const qr = document.getElementById("donateQr") as HTMLImageElement | null;

  if (qr) {
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      donationUrl
    )}`;

    qr.alt = "QR donation link";
  }
}

// ============================================================
// SETTINGS
// ============================================================

async function loadDonationSettings(): Promise<void> {
  try {
    const data = await fetchPublicSettings();

    const url = data?.settings?.donation_url;

    if (url && typeof url === "string" && url.trim()) {
      donationUrl = url.trim();
    }

    settingsLoaded = true;

    applyDonationUrl();
  } catch {
    settingsLoaded = true;

    donationUrl = FALLBACK_DONATION_URL;

    applyDonationUrl();
  }
}

// ============================================================
// OPEN / CLOSE
// ============================================================

export function openDonate(): void {
  const els = getElements();

  if (!els) return;

  els.overlay.dataset.open = "true";

  applyDonationUrl();

  if (!settingsLoaded) {
    void loadDonationSettings();
  }

  void trackAnalyticsEvent("donate.open", {
    url: donationUrl
  }).catch(() => {});
}

export function closeDonate(): void {
  const els = getElements();

  if (!els) return;

  els.overlay.dataset.open = "false";
}

// ============================================================
// COPY LINK
// ============================================================

async function copyWithClipboard(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(donationUrl);

    return true;
  } catch {
    return false;
  }
}

function copyWithFallback(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  try {
    const textarea = document.createElement("textarea");

    textarea.value = donationUrl;

    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    const ok = document.execCommand("copy");

    textarea.remove();

    return ok;
  } catch {
    return false;
  }
}

async function copyDonationLink(): Promise<void> {
  const els = getElements();

  if (!els) return;

  const ok =
    (await copyWithClipboard()) || copyWithFallback();

  if (ok) {
    showMessage(els, t("donate.copied"), true);

    showToast(t("donate.copied"), "ok", "💛");

    void trackAnalyticsEvent("donate.copy", {
      url: donationUrl
    }).catch(() => {});
  } else {
    showMessage(els, t("donate.copyError"), false);

    showToast(t("donate.copyError"), "warn", "⚠️");
  }
}

// ============================================================
// BINDINGS
// ============================================================

function bindCloseButtons(): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll("[data-donate-close]").forEach((node) => {
    node.addEventListener("click", () => {
      closeDonate();
    });
  });
}

function bindNavButtons(): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll('[data-nav="donate"]').forEach((node) => {
    node.addEventListener("click", () => {
      openDonate();
    });
  });
}

function bind(): void {
  const els = getElements();

  if (!els) return;

  bindCloseButtons();
  bindNavButtons();

  els.copyBtn.addEventListener("click", () => {
    void copyDonationLink();
  });

  window.addEventListener("ud:open-donate", () => {
    openDonate();
  });
}

// ============================================================
// INIT
// ============================================================

export function initDonate(): void {
  if (initialized) return;

  initialized = true;

  bind();

  applyDonationUrl();

  void loadDonationSettings();
}

// ============================================================
// AUTOINIT
// ============================================================

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initDonate();
    });
  } else {
    initDonate();
  }
}
