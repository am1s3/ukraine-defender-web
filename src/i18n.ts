// ============================================================
// Ukraine Defender — i18n.ts
// FULL FILE
//
// Локализация:
// - uk / en;
// - хранение языка;
// - автоопределение;
// - перевод интерфейса;
// - плюрализация;
// - поддержка data-i18n / data-i18n-placeholder / data-i18n-aria.
// ============================================================

export type Language = "uk" | "en";

export const SUPPORTED_LANGUAGES: Language[] = ["uk", "en"];

const LANG_STORAGE_KEY = "ud_lang";

const DEFAULT_LANGUAGE: Language = "uk";

// ============================================================
// DICTIONARY TYPES
// ============================================================

type Dictionary = Record<string, string>;

interface PluralForms {
  one?: string;
  few?: string;
  many?: string;
  other: string;
}

type PluralDictionary = Record<string, PluralForms>;

// ============================================================
// UK DICTIONARY
// ============================================================

const uk: Dictionary = {
  "app.title": "Ukraine Defender — моніторинг повітряних загроз",
  "app.name": "Ukraine Defender",

  "common.refresh": "↻ Оновити",
  "common.back": "← Назад",
  "common.cancel": "Скасувати",
  "common.save": "Зберегти",
  "common.close": "Закрити",
  "common.open": "Відкрити",
  "common.error": "Помилка",
  "common.loading": "Завантаження…",
  "common.retry": "Повторити",

  "nav.report": "Звіт",
  "nav.report.icon": "📊 Звіт",
  "nav.about": "Про нас",
  "nav.donate": "Донат",
  "nav.support": "Підтримка",

  "user.theme": "🎨 Змінити тему",
  "user.language": "🌐 Укр / Eng",
  "user.support": "🛠 Техпідтримка",
  "user.donate": "💛 Підтримати",
  "user.admin": "🧠 Адмін-панель",
  "user.logout": "🚪 Вийти",

  "auth.loginButton": "Увійти",

  "auth.loginTitle": "Вхід",
  "auth.loginSubtitle": "Email або нік + пароль",

  "auth.identifier": "Email або нік",
  "auth.identifierPlaceholder": "email або nickname",

  "auth.password": "Пароль",
  "auth.passwordPlaceholder": "••••••••",

  "auth.forgotLink": "Забули пароль?",
  "auth.noAccountLink": "Немає акаунта? Зареєструватися",

  "auth.registerTitle": "Реєстрація",
  "auth.registerSubtitle": "Створення акаунта",

  "auth.nickname": "Нік",
  "auth.nicknamePlaceholder": "nickname",

  "auth.email": "Email",
  "auth.emailPlaceholder": "you@example.com",

  "auth.newPassword": "Новий пароль",
  "auth.repeatPassword": "Повтор пароля",

  "auth.next": "Далі",
  "auth.back": "Назад",

  "auth.registerSubmit": "Зареєструватися",
  "auth.haveAccountLink": "Вже є акаунт? Увійти",

  "auth.forgotTitle": "Відновлення пароля",
  "auth.forgotSubtitle": "Введіть email",
  "auth.forgotSubmit": "Надіслати відновлення",
  "auth.backToLogin": "Назад до входу",

  "auth.resetTitle": "Новий пароль",
  "auth.resetSubtitle": "Token + новий пароль",

  "auth.token": "Token",
  "auth.tokenPlaceholder": "reset token",

  "auth.resetSubmit": "Змінити пароль",

  "auth.hintNickname":
    "Нік відображатиметься в меню та в техпідтримці.",
  "auth.hintEmail":
    "Email потрібен для відновлення пароля.",

  "status.calm": "УСЕ ЧИСТО · ТРИМАЙМОСЬ",
  "status.alertKyiv": "ПОВІТРЯНА ТРИВОГА · КИЇВ ТА ОБЛАСТЬ",

  "map.selectRegion": "Оберіть область на карті",

  "support.title": "Техпідтримка",
  "support.subtitle": "Звернення та відповіді",

  "support.loginRequired":
    "Щоб написати в підтримку, потрібно увійти в акаунт.",

  "support.new": "➕ Нове звернення",
  "support.empty": "Поки що немає звернень.",

  "support.category": "Категорія",
  "support.subject": "Тема",
  "support.subjectPlaceholder": "Коротко: що сталося",

  "support.message": "Повідомлення",
  "support.messagePlaceholder": "Опишіть проблему або питання...",

  "support.yourMessage": "Ваше повідомлення",
  "support.yourMessagePlaceholder":
    "Напишіть відповідь або уточнення...",

  "support.send": "Відправити",
  "support.create": "Створити",

  "support.ticket": "Звернення",

  "support.status.open": "відкрито",
  "support.status.answered": "відповідь отримана",
  "support.status.closed": "закрито",

  "support.categories.bug": "Помилка сайту",
  "support.categories.map": "Карта",
  "support.categories.donation": "Донат",
  "support.categories.channel": "Канали / джерела",
  "support.categories.suggestion": "Пропозиція",
  "support.categories.other": "Інше",

  "donate.title": "Підтримати проєкт",
  "donate.subtitle": "Банка Ukraine Defender",

  "donate.text":
    "Збір іде на розвиток моніторингу, сервери, канали та покращення алгоритмів.",

  "donate.open": "Open",
  "donate.copy": "Скопіювати посилання",

  "donate.copied": "Посилання скопійовано.",
  "donate.copyError": "Не вдалося скопіювати посилання.",

  "admin.title": "Адмін-панель",
  "admin.subtitle": "Керування сервісом",

  "admin.tabs.tickets": "Тикети",
  "admin.tabs.users": "Користувачі",
  "admin.tabs.sources": "Джерела",
  "admin.tabs.reports": "Скарги",
  "admin.tabs.logs": "Логи",
  "admin.tabs.settings": "Налаштування",
  "admin.tabs.analytics": "Аналітика",

  "admin.refresh": "↻ Оновити",

  "admin.open": "Відкрити",
  "admin.close": "Close",
  "admin.reopen": "Reopen",

  "admin.ban": "Ban",
  "admin.unban": "Unban",

  "admin.saveSetting": "Зберегти налаштування",
  "admin.settingKey": "Ключ",
  "admin.settingValue": "Значення",

  "toast.welcome": "Вітаємо, {name}",
  "toast.registered": "Акаунт створено. Вітаємо, {name}",
  "toast.loggedOut": "Ви вийшли з акаунта",

  "toast.ticketCreated": "Звернення створено",
  "toast.ticketClosed": "Тикет закрито",
  "toast.ticketReopened": "Тикет відкрито знову",

  "toast.roleUpdated": "Роль оновлено",
  "toast.userBanned": "Акаунт заблоковано",
  "toast.userUnbanned": "Акаунт розблоковано",

  "toast.settingsSaved": "Налаштування збережено",

  "toast.reportFalse": "Скаргу позначено як false",
  "toast.reportResolved": "Скаргу закрито",

  "toast.notEnoughRights": "Недостатньо прав",

  "toast.themeDark": "Тема: темна",
  "toast.themeLight": "Тема: світла",
  "toast.themeSystem": "Тема: системна",

  "toast.langUk": "Мова: українська",
  "toast.langEn": "Language: English",

  "theme.dark": "Темна",
  "theme.light": "Світла",
  "theme.system": "Системна",

  "roles.user": "Користувач",
  "roles.support": "Підтримка",
  "roles.admin": "Адмін",
  "roles.owner": "Власник",

  "about.title": "Про Ukraine Defender",
  "about.donate": "Підтримати проєкт",

  "report.title": "Звіт",

  "loader.loading": "Завантаження…"
};

// ============================================================
// EN DICTIONARY
// ============================================================

const en: Dictionary = {
  "app.title": "Ukraine Defender — air threat monitoring",
  "app.name": "Ukraine Defender",

  "common.refresh": "↻ Refresh",
  "common.back": "← Back",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.close": "Close",
  "common.open": "Open",
  "common.error": "Error",
  "common.loading": "Loading…",
  "common.retry": "Retry",

  "nav.report": "Report",
  "nav.report.icon": "📊 Report",
  "nav.about": "About",
  "nav.donate": "Donate",
  "nav.support": "Support",

  "user.theme": "🎨 Change theme",
  "user.language": "🌐 Ua / En",
  "user.support": "🛠 Technical support",
  "user.donate": "💛 Donate",
  "user.admin": "🧠 Admin panel",
  "user.logout": "🚪 Log out",

  "auth.loginButton": "Sign in",

  "auth.loginTitle": "Sign in",
  "auth.loginSubtitle": "Email or nickname + password",

  "auth.identifier": "Email or nickname",
  "auth.identifierPlaceholder": "email or nickname",

  "auth.password": "Password",
  "auth.passwordPlaceholder": "••••••••",

  "auth.forgotLink": "Forgot password?",
  "auth.noAccountLink": "No account? Register",

  "auth.registerTitle": "Registration",
  "auth.registerSubtitle": "Create account",

  "auth.nickname": "Nickname",
  "auth.nicknamePlaceholder": "nickname",

  "auth.email": "Email",
  "auth.emailPlaceholder": "you@example.com",

  "auth.newPassword": "New password",
  "auth.repeatPassword": "Repeat password",

  "auth.next": "Next",
  "auth.back": "Back",

  "auth.registerSubmit": "Register",
  "auth.haveAccountLink": "Already have an account? Sign in",

  "auth.forgotTitle": "Password recovery",
  "auth.forgotSubtitle": "Enter your email",
  "auth.forgotSubmit": "Send recovery",
  "auth.backToLogin": "Back to sign in",

  "auth.resetTitle": "New password",
  "auth.resetSubtitle": "Token + new password",

  "auth.token": "Token",
  "auth.tokenPlaceholder": "reset token",

  "auth.resetSubmit": "Change password",

  "auth.hintNickname":
    "Your nickname will be visible in the menu and support.",
  "auth.hintEmail":
    "Email is needed for password recovery.",

  "status.calm": "ALL CLEAR · STAY SAFE",
  "status.alertKyiv": "AIR ALERT · KYIV AND REGION",

  "map.selectRegion": "Select a region on the map",

  "support.title": "Technical support",
  "support.subtitle": "Tickets and replies",

  "support.loginRequired":
    "You need to sign in to contact support.",

  "support.new": "➕ New ticket",
  "support.empty": "No tickets yet.",

  "support.category": "Category",
  "support.subject": "Subject",
  "support.subjectPlaceholder": "Short description of the issue",

  "support.message": "Message",
  "support.messagePlaceholder": "Describe your problem or question...",

  "support.yourMessage": "Your message",
  "support.yourMessagePlaceholder":
    "Write a reply or clarification...",

  "support.send": "Send",
  "support.create": "Create",

  "support.ticket": "Ticket",

  "support.status.open": "open",
  "support.status.answered": "answered",
  "support.status.closed": "closed",

  "support.categories.bug": "Site bug",
  "support.categories.map": "Map",
  "support.categories.donation": "Donation",
  "support.categories.channel": "Channels / sources",
  "support.categories.suggestion": "Suggestion",
  "support.categories.other": "Other",

  "donate.title": "Support the project",
  "donate.subtitle": "Ukraine Defender jar",

  "donate.text":
    "Donations go to monitoring development, servers, channels and algorithm improvements.",

  "donate.open": "Open",
  "donate.copy": "Copy link",

  "donate.copied": "Link copied.",
  "donate.copyError": "Failed to copy link.",

  "admin.title": "Admin panel",
  "admin.subtitle": "Service management",

  "admin.tabs.tickets": "Tickets",
  "admin.tabs.users": "Users",
  "admin.tabs.sources": "Sources",
  "admin.tabs.reports": "Reports",
  "admin.tabs.logs": "Logs",
  "admin.tabs.settings": "Settings",
  "admin.tabs.analytics": "Analytics",

  "admin.refresh": "↻ Refresh",

  "admin.open": "Open",
  "admin.close": "Close",
  "admin.reopen": "Reopen",

  "admin.ban": "Ban",
  "admin.unban": "Unban",

  "admin.saveSetting": "Save setting",
  "admin.settingKey": "Key",
  "admin.settingValue": "Value",

  "toast.welcome": "Welcome, {name}",
  "toast.registered": "Account created. Welcome, {name}",
  "toast.loggedOut": "You have signed out",

  "toast.ticketCreated": "Ticket created",
  "toast.ticketClosed": "Ticket closed",
  "toast.ticketReopened": "Ticket reopened",

  "toast.roleUpdated": "Role updated",
  "toast.userBanned": "Account banned",
  "toast.userUnbanned": "Account unbanned",

  "toast.settingsSaved": "Settings saved",

  "toast.reportFalse": "Report marked as false",
  "toast.reportResolved": "Report resolved",

  "toast.notEnoughRights": "Not enough rights",

  "toast.themeDark": "Theme: dark",
  "toast.themeLight": "Theme: light",
  "toast.themeSystem": "Theme: system",

  "toast.langUk": "Мова: українська",
  "toast.langEn": "Language: English",

  "theme.dark": "Dark",
  "theme.light": "Light",
  "theme.system": "System",

  "roles.user": "User",
  "roles.support": "Support",
  "roles.admin": "Admin",
  "roles.owner": "Owner",

  "about.title": "About Ukraine Defender",
  "about.donate": "Support the project",

  "report.title": "Report",

  "loader.loading": "Loading…"
};

// ============================================================
// PLURAL DICTIONARIES
// ============================================================

const ukPlural: PluralDictionary = {
  "status.activeRegions": {
    one: "АКТИВНИЙ РЕГІОН: {count}",
    few: "АКТИВНІ РЕГІОНИ: {count}",
    many: "АКТИВНИХ РЕГІОНІВ: {count}",
    other: "АКТИВНИХ РЕГІОНІВ: {count}"
  }
};

const enPlural: PluralDictionary = {
  "status.activeRegions": {
    one: "ACTIVE REGION: {count}",
    other: "ACTIVE REGIONS: {count}"
  }
};

// ============================================================
// DICTIONARY MAP
// ============================================================

const dictionaries: Record<Language, Dictionary> = {
  uk,
  en
};

const pluralDictionaries: Record<Language, PluralDictionary> = {
  uk: ukPlural,
  en: enPlural
};

// ============================================================
// LANGUAGE HELPERS
// ============================================================

export function normalizeLanguage(value: unknown): Language | null {
  const raw = String(value || "")
    .toLowerCase()
    .trim();

  if (!raw) return null;

  if (raw.startsWith("uk")) return "uk";
  if (raw.startsWith("en")) return "en";

  return null;
}

export function detectBrowserLanguage(): Language | null {
  if (typeof navigator === "undefined") return null;

  const languages = navigator.languages || [navigator.language];

  for (const lang of languages) {
    const normalized = normalizeLanguage(lang);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getStoredLanguage(): Language | null {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);

    return normalizeLanguage(raw);
  } catch {
    return null;
  }
}

export function storeLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // storage unavailable
  }
}

export function getCurrentLanguage(): Language {
  if (typeof document !== "undefined") {
    const fromHtml = normalizeLanguage(
      document.documentElement.lang
    );

    if (fromHtml) {
      return fromHtml;
    }
  }

  return (
    getStoredLanguage() ||
    detectBrowserLanguage() ||
    DEFAULT_LANGUAGE
  );
}

export function getLocale(lang?: Language): string {
  const language = lang || getCurrentLanguage();

  return language === "uk" ? "uk-UA" : "en-US";
}

// ============================================================
// TRANSLATE
// ============================================================

function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];

    return value === undefined || value === null
      ? ""
      : String(value);
  });
}

export function translate(
  key: string,
  params?: Record<string, string | number>
): string {
  const lang = getCurrentLanguage();

  const dict = dictionaries[lang] || dictionaries[DEFAULT_LANGUAGE];

  const template = dict[key] ?? key;

  return interpolate(template, params);
}

export const t = translate;

export function pluralize(
  key: string,
  count: number,
  params?: Record<string, string | number>
): string {
  const lang = getCurrentLanguage();

  const pluralDict =
    pluralDictionaries[lang] ||
    pluralDictionaries[DEFAULT_LANGUAGE];

  const forms =
    pluralDict[key] ||
    pluralDictionaries[DEFAULT_LANGUAGE][key];

  if (!forms) {
    return translate(key, { ...params, count });
  }

  let category: Intl.LDMLPluralRule;

  try {
    category = new Intl.PluralRules(lang).select(count);
  } catch {
    category = new Intl.PluralRules(DEFAULT_LANGUAGE).select(count);
  }

  const template =
    forms[category as keyof PluralForms] ||
    forms.other ||
    String(count);

  return interpolate(template, { ...params, count });
}

// ============================================================
// STATUS STRIP TRANSLATION
// ============================================================

export interface StatusStripParams {
  kyivAlert: boolean;
  activeAlerts: number;
}

export function translateStatusStrip(
  params: StatusStripParams
): string {
  const active = pluralize(
    "status.activeRegions",
    params.activeAlerts
  );

  if (params.kyivAlert) {
    return `${translate("status.alertKyiv")} · ${active}`;
  }

  return `${translate("status.calm")} · ${active}`;
}

// ============================================================
// DOM APPLY HELPERS
// ============================================================

function setText(
  selector: string,
  text: string
): void {
  if (typeof document === "undefined") return;

  const el = document.querySelector(selector);

  if (el) {
    el.textContent = text;
  }
}

function setTextAll(
  selector: string,
  text: string
): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = text;
  });
}

function setPlaceholder(
  selector: string,
  text: string
): void {
  if (typeof document === "undefined") return;

  const el = document.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(selector);

  if (el) {
    el.placeholder = text;
  }
}

function setOptionText(
  selector: string,
  text: string
): void {
  if (typeof document === "undefined") return;

  const el = document.querySelector(selector);

  if (el) {
    el.textContent = text;
  }
}

// ============================================================
// DATA-I18N APPLY
// ============================================================

function applyDataAttributes(): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");

    if (!key) return;

    el.textContent = translate(key);
  });

  document
    .querySelectorAll<HTMLElement>("[data-i18n-placeholder]")
    .forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");

      if (!key) return;

      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement
      ) {
        el.placeholder = translate(key);
      }
    });

  document
    .querySelectorAll<HTMLElement>("[data-i18n-aria]")
    .forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");

      if (!key) return;

      el.setAttribute("aria-label", translate(key));
    });
}

// ============================================================
// KNOWN SELECTORS APPLY
// ============================================================

function applyKnownTranslations(): void {
  if (typeof document === "undefined") return;

  document.title = translate("app.title");

  // Topbar nav

  setText(
    '.topbar__nav [data-nav="report"]',
    translate("nav.report.icon")
  );

  setText(
    '.topbar__nav [data-nav="about"]',
    translate("nav.about")
  );

  setText(
    '.topbar__nav [data-nav="donate"]',
    translate("nav.donate")
  );

  setText(
    '.topbar__nav [data-nav="support"]',
    translate("nav.support")
  );

  // Tabbar nav

  setText(
    '.tabbar [data-nav="report"] .tabbar__lbl',
    translate("nav.report")
  );

  setText(
    '.tabbar [data-nav="about"] .tabbar__lbl',
    translate("nav.about")
  );

  setText(
    '.tabbar [data-nav="donate"] .tabbar__lbl',
    translate("nav.donate")
  );

  setText(
    '.tabbar [data-nav="support"] .tabbar__lbl',
    translate("nav.support")
  );

  // Auth button

  setText("#loginOpenBtn", translate("auth.loginButton"));

  // User menu

  setText('[data-user-action="theme"]', translate("user.theme"));
  setText('[data-user-action="lang"]', translate("user.language"));
  setText('[data-user-action="support"]', translate("user.support"));
  setText('[data-user-action="donate"]', translate("user.donate"));
  setText('[data-user-action="admin"]', translate("user.admin"));
  setText('[data-user-action="logout"]', translate("user.logout"));

  // Drawer

  setText(".drawer__empty", translate("map.selectRegion"));

  // Auth overlay: login

  setText(
    '#authOverlay [data-auth-view="login"] .ud-title',
    translate("auth.loginTitle")
  );

  setText(
    '#authOverlay [data-auth-view="login"] .ud-sub',
    translate("auth.loginSubtitle")
  );

  setText(
    'label[for="loginIdentifier"]',
    translate("auth.identifier")
  );

  setPlaceholder(
    "#loginIdentifier",
    translate("auth.identifierPlaceholder")
  );

  setText(
    'label[for="loginPassword"]',
    translate("auth.password")
  );

  setPlaceholder(
    "#loginPassword",
    translate("auth.passwordPlaceholder")
  );

  setText(
    "#loginForm button[type='submit']",
    translate("auth.loginButton")
  );

  setText(
    '[data-auth-switch="forgot"]',
    translate("auth.forgotLink")
  );

  setText(
    '[data-auth-switch="register"]',
    translate("auth.noAccountLink")
  );

  // Auth overlay: register

  setText(
    '#authOverlay [data-auth-view="register"] .ud-title',
    translate("auth.registerTitle")
  );

  setText(
    '#authOverlay [data-auth-view="register"] .ud-sub',
    translate("auth.registerSubtitle")
  );

  setText(
    'label[for="registerNickname"]',
    translate("auth.nickname")
  );

  setPlaceholder(
    "#registerNickname",
    translate("auth.nicknamePlaceholder")
  );

  setText(
    'label[for="registerEmail"]',
    translate("auth.email")
  );

  setPlaceholder(
    "#registerEmail",
    translate("auth.emailPlaceholder")
  );

  setText(
    'label[for="registerPassword"]',
    translate("auth.newPassword")
  );

  setText(
    'label[for="registerPasswordRepeat"]',
    translate("auth.repeatPassword")
  );

  setTextAll(
    "[data-register-next]",
    translate("auth.next")
  );

  setTextAll(
    "[data-register-back]",
    translate("auth.back")
  );

  setText(
    "#registerForm button[type='submit']",
    translate("auth.registerSubmit")
  );

  setText(
    '#authOverlay [data-auth-switch="login"]',
    translate("auth.haveAccountLink")
  );

  // Auth overlay: forgot

  setText(
    '#authOverlay [data-auth-view="forgot"] .ud-title',
    translate("auth.forgotTitle")
  );

  setText(
    '#authOverlay [data-auth-view="forgot"] .ud-sub',
    translate("auth.forgotSubtitle")
  );

  setText(
    'label[for="forgotEmail"]',
    translate("auth.email")
  );

  setPlaceholder(
    "#forgotEmail",
    translate("auth.emailPlaceholder")
  );

  setText(
    "#forgotForm button[type='submit']",
    translate("auth.forgotSubmit")
  );

  setText(
    '#forgotForm [data-auth-switch="login"]',
    translate("auth.backToLogin")
  );

  // Auth overlay: reset

  setText(
    '#authOverlay [data-auth-view="reset"] .ud-title',
    translate("auth.resetTitle")
  );

  setText(
    '#authOverlay [data-auth-view="reset"] .ud-sub',
    translate("auth.resetSubtitle")
  );

  setText(
    'label[for="resetToken"]',
    translate("auth.token")
  );

  setPlaceholder(
    "#resetToken",
    translate("auth.tokenPlaceholder")
  );

  setText(
    'label[for="resetPassword"]',
    translate("auth.newPassword")
  );

  setText(
    'label[for="resetPasswordRepeat"]',
    translate("auth.repeatPassword")
  );

  setText(
    "#resetForm button[type='submit']",
    translate("auth.resetSubmit")
  );

  setText(
    '#resetForm [data-auth-switch="login"]',
    translate("auth.backToLogin")
  );

  // Support overlay

  setText("#supportOverlay .ud-title", translate("support.title"));
  setText("#supportOverlay .ud-sub", translate("support.subtitle"));

  setText("#supportGoLoginBtn", translate("auth.loginButton"));
  setText("#supportNewTicketBtn", translate("support.new"));
  setText("#supportRefreshBtn", translate("common.refresh"));
  setText("#supportBackBtn", translate("common.back"));
  setText("#supportCancelNewBtn", translate("common.back"));

  setText(
    'label[for="supportCategory"]',
    translate("support.category")
  );

  setText(
    'label[for="supportSubject"]',
    translate("support.subject")
  );

  setPlaceholder(
    "#supportSubject",
    translate("support.subjectPlaceholder")
  );

  setText(
    'label[for="supportBody"]',
    translate("support.message")
  );

  setPlaceholder(
    "#supportBody",
    translate("support.messagePlaceholder")
  );

  setText(
    'label[for="supportMessageText"]',
    translate("support.yourMessage")
  );

  setPlaceholder(
    "#supportMessageText",
    translate("support.yourMessagePlaceholder")
  );

  setText(
    "#supportMessageForm button[type='submit']",
    translate("support.send")
  );

  setText(
    "#supportNewForm button[type='submit']",
    translate("support.create")
  );

  setOptionText(
    '#supportCategory option[value="bug"]',
    translate("support.categories.bug")
  );

  setOptionText(
    '#supportCategory option[value="map"]',
    translate("support.categories.map")
  );

  setOptionText(
    '#supportCategory option[value="donation"]',
    translate("support.categories.donation")
  );

  setOptionText(
    '#supportCategory option[value="channel"]',
    translate("support.categories.channel")
  );

  setOptionText(
    '#supportCategory option[value="suggestion"]',
    translate("support.categories.suggestion")
  );

  setOptionText(
    '#supportCategory option[value="other"]',
    translate("support.categories.other")
  );

  // Donate overlay

  setText("#donateOverlay .ud-title", translate("donate.title"));
  setText("#donateOverlay .ud-sub", translate("donate.subtitle"));

  setText("#donateLink", translate("donate.open"));
  setText("#donateCopyBtn", translate("donate.copy"));

  // Admin overlay

  setText("#adminOverlay .ud-title", translate("admin.title"));
  setText("#adminOverlay .ud-sub", translate("admin.subtitle"));

  setText(
    '.admin__tab[data-admin-tab="tickets"]',
    translate("admin.tabs.tickets")
  );

  setText(
    '.admin__tab[data-admin-tab="users"]',
    translate("admin.tabs.users")
  );

  setText(
    '.admin__tab[data-admin-tab="sources"]',
    translate("admin.tabs.sources")
  );

  setText(
    '.admin__tab[data-admin-tab="reports"]',
    translate("admin.tabs.reports")
  );

  setText(
    '.admin__tab[data-admin-tab="logs"]',
    translate("admin.tabs.logs")
  );

  setText(
    '.admin__tab[data-admin-tab="settings"]',
    translate("admin.tabs.settings")
  );

  setText(
    '.admin__tab[data-admin-tab="analytics"]',
    translate("admin.tabs.analytics")
  );

  setText(
    "#adminTicketsRefreshBtn",
    translate("admin.refresh")
  );

  setText(
    "#adminUsersRefreshBtn",
    translate("admin.refresh")
  );

  setText(
    "#adminSourcesRefreshBtn",
    translate("admin.refresh")
  );

  setText(
    "#adminReportsRefreshBtn",
    translate("admin.refresh")
  );

  setText(
    "#adminLogsRefreshBtn",
    translate("admin.refresh")
  );

  setText(
    "#adminSettingsRefreshBtn",
    translate("admin.refresh")
  );

  setText(
    "#adminAnalyticsRefreshBtn",
    translate("admin.refresh")
  );

  setText(
    "#adminSettingForm button[type='submit']",
    translate("admin.saveSetting")
  );

  setText(
    'label[for="adminSettingKey"]',
    translate("admin.settingKey")
  );

  setText(
    'label[for="adminSettingValue"]',
    translate("admin.settingValue")
  );
}

// ============================================================
// APPLY / INIT / SWITCH
// ============================================================

export function applyI18n(lang?: Language): void {
  const language = lang || getCurrentLanguage();

  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }

  storeLanguage(language);

  applyDataAttributes();
  applyKnownTranslations();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<Language>("ud:i18n", {
        detail: language
      })
    );
  }
}

export function setLanguage(lang: Language): void {
  applyI18n(lang);
}

export function toggleLanguage(): Language {
  const current = getCurrentLanguage();

  const next: Language = current === "uk" ? "en" : "uk";

  setLanguage(next);

  return next;
}

export interface InitI18nOptions {
  defaultLanguage?: Language;
  userLanguage?: Language | null;
}

export function initI18n(
  options: InitI18nOptions = {}
): Language {
  const stored = getStoredLanguage();

  const language =
    stored ||
    normalizeLanguage(options.userLanguage) ||
    detectBrowserLanguage() ||
    options.defaultLanguage ||
    DEFAULT_LANGUAGE;

  applyI18n(language);

  return language;
}

// ============================================================
// FORMAT HELPERS
// ============================================================

export function formatNumber(
  value: number,
  lang?: Language
): string {
  try {
    return new Intl.NumberFormat(getLocale(lang)).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(
  value: string | number | Date,
  lang?: Language
): string {
  try {
    return new Intl.DateTimeFormat(getLocale(lang), {
      timeZone: "Europe/Kyiv",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

export function formatTime(
  value: string | number | Date,
  lang?: Language
): string {
  try {
    return new Intl.DateTimeFormat(getLocale(lang), {
      timeZone: "Europe/Kyiv",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}
