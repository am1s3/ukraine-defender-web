// ============================================================
// Ukraine Defender — loader.ts
// FULL FILE
//
// Лоадер:
// - минимальная длительность;
// - плавное скрытие;
// - fallback;
// - настройки из backend;
// - событие скрытия.
// ============================================================

import {
  fetchPublicSettings
} from "./api";

// ============================================================
// CONSTANTS
// ============================================================

export const LOADER_HIDDEN_EVENT = "ud:loader:hidden";

const DEFAULT_MIN_DURATION_MS = 2000;

const FALLBACK_MAX_MS = 6500;

const REMOVE_DELAY_MS = 650;

// ============================================================
// STATE
// ============================================================

let initialized = false;

let hidden = false;

let ready = false;

let disabledBySettings = false;

let minDurationMs = DEFAULT_MIN_DURATION_MS;

let bootAt = 0;

let hideTimer: number | null = null;

let fallbackTimer: number | null = null;

// ============================================================
// HELPERS
// ============================================================

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined"
  );
}

function now(): number {
  if (typeof performance !== "undefined") {
    return performance.now();
  }

  return Date.now();
}

function getLoaderElement(): HTMLDivElement | null {
  if (!isBrowser()) {
    return null;
  }

  return document.getElementById("loader") as HTMLDivElement | null;
}

// ============================================================
// EVENTS
// ============================================================

function dispatchHidden(): void {
  if (!isBrowser()) return;

  window.dispatchEvent(
    new CustomEvent(LOADER_HIDDEN_EVENT, {
      detail: {
        ts: Date.now()
      }
    })
  );
}

export function onLoaderHidden(
  handler: () => void
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const listener = () => {
    handler();
  };

  window.addEventListener(LOADER_HIDDEN_EVENT, listener);

  return () => {
    window.removeEventListener(LOADER_HIDDEN_EVENT, listener);
  };
}

// ============================================================
// HIDE LOGIC
// ============================================================

function clearTimers(): void {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }

  if (fallbackTimer !== null) {
    window.clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
}

function removeLoaderFromDom(): void {
  const loader = getLoaderElement();

  if (!loader) return;

  loader.remove();
}

function hideLoaderNow(): void {
  if (hidden) return;

  const loader = getLoaderElement();

  hidden = true;

  clearTimers();

  if (!loader) {
    dispatchHidden();
    return;
  }

  loader.dataset.hidden = "true";

  window.setTimeout(() => {
    removeLoaderFromDom();
  }, REMOVE_DELAY_MS);

  dispatchHidden();
}

function maybeHide(): void {
  if (hidden) return;

  if (disabledBySettings) {
    hideLoaderNow();
    return;
  }

  if (!ready) return;

  const elapsed = now() - bootAt;

  if (elapsed >= minDurationMs) {
    hideLoaderNow();
    return;
  }

  const remaining = minDurationMs - elapsed;

  if (hideTimer === null) {
    hideTimer = window.setTimeout(() => {
      hideTimer = null;

      maybeHide();
    }, remaining);
  }
}

// ============================================================
// PUBLIC API
// ============================================================

export function markLoaderReady(): void {
  if (ready) return;

  ready = true;

  maybeHide();
}

export function hideLoader(): void {
  markLoaderReady();
}

export function forceHideLoader(): void {
  hideLoaderNow();
}

export function isLoaderHidden(): boolean {
  return hidden;
}

export function setLoaderMinDuration(ms: number): void {
  if (!Number.isFinite(ms)) return;

  if (ms < 0) return;

  minDurationMs = ms;

  maybeHide();
}

// ============================================================
// SETTINGS
// ============================================================

async function loadLoaderSettings(): Promise<void> {
  try {
    const data = await fetchPublicSettings();

    const settings = data?.settings || {};

    if (settings.loader_enabled === "0") {
      disabledBySettings = true;

      hideLoaderNow();

      return;
    }

    const rawDuration = settings.loader_duration_ms;

    if (rawDuration !== undefined) {
      const parsed = parseInt(String(rawDuration), 10);

      if (Number.isFinite(parsed) && parsed >= 0) {
        minDurationMs = parsed;
      }
    }

    maybeHide();
  } catch {
    // settings are optional
  }
}

// ============================================================
// INIT
// ============================================================

export function initLoader(): void {
  if (!isBrowser()) return;

  if (initialized) return;

  initialized = true;

  bootAt = now();

  const loader = getLoaderElement();

  if (!loader) {
    hidden = true;

    return;
  }

  fallbackTimer = window.setTimeout(() => {
    fallbackTimer = null;

    hideLoaderNow();
  }, FALLBACK_MAX_MS);

  void loadLoaderSettings();

  if (document.readyState === "complete") {
    markLoaderReady();
  } else {
    window.addEventListener(
      "load",
      () => {
        markLoaderReady();
      },
      { once: true }
    );
  }

  maybeHide();
}

// ============================================================
// AUTOINIT
// ============================================================

if (isBrowser()) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initLoader();
    });
  } else {
    initLoader();
  }
}
