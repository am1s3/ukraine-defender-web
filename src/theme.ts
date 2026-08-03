// ============================================================
// Ukraine Defender — theme.ts
// FULL FILE
//
// Управление темой:
// - dark / light / system;
// - localStorage;
// - системная тема;
// - meta theme-color;
// - события для UI;
// - синхронизация между вкладками.
// ============================================================

import type { ThemePreference } from "./types";

// ============================================================
// CONSTANTS
// ============================================================

const THEME_STORAGE_KEY = "ud_theme";

const DEFAULT_THEME: ThemePreference = "dark";

export const THEME_ORDER: ThemePreference[] = [
  "dark",
  "light",
  "system"
];

export type ResolvedTheme = "dark" | "light";

export interface ThemeChangedDetail {
  preference: ThemePreference;
  resolved: ResolvedTheme;
}

// ============================================================
// ENVIRONMENT
// ============================================================

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined"
  );
}

// ============================================================
// NORMALIZE / STORAGE
// ============================================================

export function normalizeTheme(
  value: unknown
): ThemePreference | null {
  const raw = String(value || "")
    .toLowerCase()
    .trim();

  if (raw === "dark") return "dark";
  if (raw === "light") return "light";
  if (raw === "system") return "system";
  if (raw === "auto") return "system";

  return null;
}

export function getStoredTheme(): ThemePreference | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);

    return normalizeTheme(raw);
  } catch {
    return null;
  }
}

export function storeTheme(theme: ThemePreference): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable
  }
}

export function clearStoredTheme(): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // storage unavailable
  }
}

export function getThemePreference(
  fallback: ThemePreference = DEFAULT_THEME
): ThemePreference {
  return getStoredTheme() || fallback;
}

// ============================================================
// SYSTEM THEME
// ============================================================

export function getSystemTheme(): ResolvedTheme {
  if (!isBrowser()) {
    return "dark";
  }

  try {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    return media.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

export function resolveTheme(
  preference: ThemePreference
): ResolvedTheme {
  if (preference === "system") {
    return getSystemTheme();
  }

  return preference;
}

// ============================================================
// META THEME COLOR
// ============================================================

function getThemeColor(resolved: ResolvedTheme): string {
  if (resolved === "light") {
    return "#eef2f8";
  }

  return "#000000";
}

function setMetaThemeColor(color: string): void {
  if (!isBrowser()) return;

  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]'
  );

  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";

    document.head.appendChild(meta);
  }

  meta.content = color;
}

// ============================================================
// APPLY THEME
// ============================================================

export function applyTheme(
  preference: ThemePreference,
  dispatch: boolean = true
): void {
  if (!isBrowser()) return;

  const resolved = resolveTheme(preference);

  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;

  document.body.dataset.theme = resolved;
  document.body.dataset.themePreference = preference;

  setMetaThemeColor(getThemeColor(resolved));

  if (dispatch) {
    window.dispatchEvent(
      new CustomEvent<ThemeChangedDetail>("ud:theme", {
        detail: {
          preference,
          resolved
        }
      })
    );
  }
}

export function setTheme(
  preference: ThemePreference,
  save: boolean = true
): void {
  if (save) {
    storeTheme(preference);
  }

  applyTheme(preference, true);
}

// ============================================================
// CYCLE THEME
// ============================================================

export function cycleTheme(
  current?: ThemePreference
): ThemePreference {
  const active =
    current ||
    normalizeTheme(
      isBrowser()
        ? document.documentElement.dataset.themePreference
        : null
    ) ||
    getThemePreference();

  const index = THEME_ORDER.indexOf(active);

  const next =
    THEME_ORDER[
      (index + 1 + THEME_ORDER.length) % THEME_ORDER.length
    ];

  setTheme(next, true);

  return next;
}

// ============================================================
// THEME CHANGE SUBSCRIPTION
// ============================================================

export function onThemeChange(
  handler: (detail: ThemeChangedDetail) => void
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const listener = (event: Event) => {
    const custom = event as CustomEvent<ThemeChangedDetail>;

    if (custom.detail) {
      handler(custom.detail);
    }
  };

  window.addEventListener("ud:theme", listener);

  return () => {
    window.removeEventListener("ud:theme", listener);
  };
}

// ============================================================
// SYSTEM THEME LISTENER
// ============================================================

let systemMedia: MediaQueryList | null = null;
let systemListenerAttached = false;

function handleSystemThemeChange(): void {
  const preference = getThemePreference();

  if (preference === "system") {
    applyTheme("system", true);
  }
}

function attachSystemListener(): void {
  if (!isBrowser() || systemListenerAttached) return;

  try {
    systemMedia = window.matchMedia("(prefers-color-scheme: dark)");

    if (typeof systemMedia.addEventListener === "function") {
      systemMedia.addEventListener(
        "change",
        handleSystemThemeChange
      );
    } else if (
      typeof (systemMedia as any).addListener === "function"
    ) {
      (systemMedia as any).addListener(handleSystemThemeChange);
    }

    systemListenerAttached = true;
  } catch {
    // very old browser / unsupported media
  }
}

function detachSystemListener(): void {
  if (!isBrowser() || !systemMedia || !systemListenerAttached) {
    return;
  }

  try {
    if (typeof systemMedia.removeEventListener === "function") {
      systemMedia.removeEventListener(
        "change",
        handleSystemThemeChange
      );
    } else if (
      typeof (systemMedia as any).removeListener === "function"
    ) {
      (systemMedia as any).removeListener(handleSystemThemeChange);
    }
  } catch {
    // ignore
  }

  systemMedia = null;
  systemListenerAttached = false;
}

// ============================================================
// STORAGE SYNC
// ============================================================

let storageListenerAttached = false;

function handleStorageChange(event: StorageEvent): void {
  if (event.key !== THEME_STORAGE_KEY) return;

  const stored = normalizeTheme(event.newValue);

  if (stored) {
    applyTheme(stored, true);
  }
}

function attachStorageListener(): void {
  if (!isBrowser() || storageListenerAttached) return;

  window.addEventListener("storage", handleStorageChange);

  storageListenerAttached = true;
}

function detachStorageListener(): void {
  if (!isBrowser() || !storageListenerAttached) return;

  window.removeEventListener("storage", handleStorageChange);

  storageListenerAttached = false;
}

// ============================================================
// INIT
// ============================================================

export interface InitThemeOptions {
  defaultTheme?: ThemePreference;
  userTheme?: ThemePreference | null;
  saveInitial?: boolean;
}

export function initTheme(
  options: InitThemeOptions = {}
): ThemePreference {
  if (!isBrowser()) {
    return options.defaultTheme || DEFAULT_THEME;
  }

  const stored = getStoredTheme();

  const preference =
    stored ||
    normalizeTheme(options.userTheme) ||
    options.defaultTheme ||
    DEFAULT_THEME;

  if (!stored && options.saveInitial !== false) {
    storeTheme(preference);
  }

  applyTheme(preference, false);

  attachSystemListener();
  attachStorageListener();

  return preference;
}

export function destroyTheme(): void {
  detachSystemListener();
  detachStorageListener();
}

// ============================================================
// INLINE PRE-PAINT HELPER
// ============================================================

/**
 * Этот скрипт можно вставить в index.html до загрузки CSS,
 * чтобы тема применялась сразу и не было тёмной/светлой вспышки.
 */
export function getThemeInitScript(
  defaultTheme: ThemePreference = DEFAULT_THEME
): string {
  return `
(function () {
  try {
    var KEY = "${THEME_STORAGE_KEY}";
    var DEFAULT = "${defaultTheme}";

    var stored = null;

    try {
      stored = localStorage.getItem(KEY);
    } catch (e) {}

    var pref = stored || DEFAULT;

    if (pref !== "dark" && pref !== "light" && pref !== "system") {
      pref = DEFAULT;
    }

    var resolved = pref;

    if (pref === "system") {
      try {
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } catch (e) {
        resolved = "dark";
      }
    }

    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = pref;

    var meta = document.querySelector('meta[name="theme-color"]');

    if (meta) {
      meta.content = resolved === "light" ? "#eef2f8" : "#000000";
    }
  } catch (e) {}
})();
`.trim();
}

// ============================================================
// UI HELPERS
// ============================================================

export function getThemeLabelKey(
  preference: ThemePreference
): string {
  if (preference === "dark") {
    return "theme.dark";
  }

  if (preference === "light") {
    return "theme.light";
  }

  return "theme.system";
}

export function isDarkResolvedTheme(): boolean {
  if (!isBrowser()) {
    return true;
  }

  return document.documentElement.dataset.theme === "dark";
}

export function isLightResolvedTheme(): boolean {
  if (!isBrowser()) {
    return false;
  }

  return document.documentElement.dataset.theme === "light";
}

export function currentThemePreference(): ThemePreference {
  if (!isBrowser()) {
    return DEFAULT_THEME;
  }

  return (
    normalizeTheme(
      document.documentElement.dataset.themePreference
    ) ||
    getThemePreference()
  );
}
