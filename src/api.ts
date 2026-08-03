// ============================================================
// Ukraine Defender — api.ts
// FULL FILE
//
// Единый API-слой:
// - данные карты / тревоги / события / ночной отчёт;
// - auth;
// - support;
// - admin;
// - settings;
// - reports;
// - analytics.
// ============================================================

import type {
  AlertResponse,
  ThreatEvent,
  NightResponse
} from "./types";

// ============================================================
// CONFIG
// ============================================================

const API_BASE =
  ((import.meta as any).env?.VITE_API_BASE as string | undefined) ?? "";

const TOKEN_KEY = "ud_token";

export const DONATION_FALLBACK =
  "https://send.monobank.ua/jar/4tGSchYaiH";

// ============================================================
// ERROR
// ============================================================

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ============================================================
// TOKEN
// ============================================================

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable
  }
}

// ============================================================
// ROLE HELPERS
// ============================================================

export type UserRole = "user" | "support" | "admin" | "owner";

export function isStaffRole(role?: string | null): boolean {
  return !!role && ["support", "admin", "owner"].includes(role);
}

export function isAdminRole(role?: string | null): boolean {
  return !!role && ["admin", "owner"].includes(role);
}

export function isOwnerRole(role?: string | null): boolean {
  return role === "owner";
}

// ============================================================
// URL / FETCH CORE
// ============================================================

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

type QueryParams = Record<string, QueryValue>;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  auth?: boolean;
  timeoutMs?: number;
}

function buildUrl(path: string, query?: QueryParams): string {
  const base = API_BASE.replace(/\/+$/, "");
  const rawUrl = `${base}${path}`;

  const url = new URL(rawUrl, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const controller = new AbortController();

  const timeoutMs = options.timeoutMs ?? 20000;

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();

  if (token && options.auth !== false) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const method =
    options.method ?? (options.body !== undefined ? "POST" : "GET");

  try {
    const res = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body:
        options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
      signal: controller.signal
    });

    if (res.status === 204) {
      return undefined as T;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (
        res.status === 401 &&
        token &&
        !path.startsWith("/api/auth")
      ) {
        window.dispatchEvent(new CustomEvent("ud:unauthorized"));
      }

      const message =
        (data as any)?.error ||
        (data as any)?.message ||
        `HTTP ${res.status}`;

      throw new ApiError(String(message), res.status, data);
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// PUBLIC TYPES
// ============================================================

export type ThemePreference = "dark" | "light" | "system";
export type LanguagePreference = "uk" | "en";

export interface AuthUser {
  id: number;
  nickname: string;
  email: string;
  role: UserRole;
  theme: ThemePreference;
  lang: LanguagePreference;
  is_active: number;
  created_at?: string;
  updated_at?: string;
  last_seen_at?: string | null;
}

export interface AuthResponse {
  ok: boolean;
  token: string;
  user: AuthUser;
}

export interface MeResponse {
  ok: boolean;
  user: AuthUser;
  unread_support_tickets?: number;
}

export interface PublicSettingsResponse {
  ok: boolean;
  settings: Record<string, string>;
}

export interface HealthResponse {
  ok: boolean;
  service?: string;
  version?: string;
  ts?: string;
  db?: boolean;
  data_proxy?: boolean;
  groq_keys?: number;
  channels?: number;
  active_regions?: number;
}

// ============================================================
// DATA / MAP / EVENTS
// ============================================================

export interface EventsResponse {
  region: string;
  channels: string[];
  posts_scanned: number;
  events_count: number;
  events: ThreatEvent[];
  groq?: {
    calls: number;
    cache_hits: number;
    errors: string[];
    model: string;
  };
  debug_unmatched?: Array<{
    channel: string;
    ts: string | null;
    text: string;
  }>;
  errors?: string[];
  from_cache?: boolean;
  stale?: boolean;
  partial?: boolean;
  error?: string;
}

export interface PostsResponse {
  version: string;
  channel: string;
  count: number;
  posts: Array<{
    id: string;
    channel: string;
    text: string;
    ts: string | null;
  }>;
  from_cache?: boolean;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health", {
    timeoutMs: 10000
  });
}

export async function fetchAlerts(): Promise<AlertResponse> {
  return apiFetch<AlertResponse>("/api/alerts", {
    timeoutMs: 15000
  });
}

export async function fetchEvents(
  region: string = "kyiv"
): Promise<EventsResponse> {
  return apiFetch<EventsResponse>("/api/events", {
    query: { region },
    timeoutMs: 25000
  });
}

export async function fetchPosts(
  channel: string
): Promise<PostsResponse> {
  return apiFetch<PostsResponse>("/api/posts", {
    query: { channel },
    timeoutMs: 20000
  });
}

export async function fetchNight(
  hours: number = 12
): Promise<NightResponse> {
  return apiFetch<NightResponse>("/api/night", {
    query: { hours },
    timeoutMs: 25000
  });
}

// ============================================================
// AUTH
// ============================================================

export interface RegisterPayload {
  nickname: string;
  email: string;
  password: string;
  password_repeat?: string;
}

export interface LoginPayload {
  login: string;
  password: string;
}

export interface ProfilePatch {
  theme?: ThemePreference;
  lang?: LanguagePreference;
}

export interface PasswordForgotPayload {
  email: string;
}

export interface PasswordForgotResponse {
  ok: boolean;
  debug_token?: string;
}

export interface PasswordResetPayload {
  token: string;
  password: string;
  password_repeat?: string;
}

export function registerUser(
  payload: RegisterPayload
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: payload
  });
}

export function loginUser(
  payload: LoginPayload
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: payload
  });
}

export function logoutUser(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/auth/logout", {
    method: "POST"
  });
}

export function fetchMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/api/auth/me");
}

export function updateProfile(
  patch: ProfilePatch
): Promise<{ ok: boolean; user: AuthUser }> {
  return apiFetch<{ ok: boolean; user: AuthUser }>(
    "/api/auth/profile",
    {
      method: "PATCH",
      body: patch
    }
  );
}

export function forgotPassword(
  payload: PasswordForgotPayload
): Promise<PasswordForgotResponse> {
  return apiFetch<PasswordForgotResponse>(
    "/api/auth/password/forgot",
    {
      method: "POST",
      body: payload
    }
  );
}

export function resetPassword(
  payload: PasswordResetPayload
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    "/api/auth/password/reset",
    {
      method: "POST",
      body: payload
    }
  );
}

// ============================================================
// PUBLIC SETTINGS / SOURCE STATUS
// ============================================================

export interface PublicSourceStatusResponse {
  ok: boolean;
  sources: Array<{
    handle: string;
    kind: string;
    active: number;
  }>;
}

export function fetchPublicSettings(): Promise<PublicSettingsResponse> {
  return apiFetch<PublicSettingsResponse>("/api/settings/public", {
    timeoutMs: 10000
  });
}

export function fetchPublicSourceStatus(): Promise<PublicSourceStatusResponse> {
  return apiFetch<PublicSourceStatusResponse>("/api/source-status", {
    timeoutMs: 10000
  });
}

// ============================================================
// SUPPORT
// ============================================================

export type SupportTicketCategory =
  | "bug"
  | "map"
  | "donation"
  | "channel"
  | "suggestion"
  | "other";

export type SupportTicketStatus =
  | "open"
  | "answered"
  | "closed";

export interface SupportTicket {
  id: number;
  user_id: number;
  category: SupportTicketCategory;
  subject: string;
  status: SupportTicketStatus;
  assigned_admin_id?: number | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;

  user_nickname?: string;
  user_email?: string;
  assigned_admin_nickname?: string | null;
  last_message?: string | null;
}

export interface SupportMessage {
  id: number;
  ticket_id: number;
  sender_id: number | null;
  body: string;
  is_admin: number;
  created_at: string;

  nickname?: string | null;
  role?: UserRole | null;
}

export interface SupportTicketDetailResponse {
  ok: boolean;
  ticket: SupportTicket;
  messages: SupportMessage[];
}

export interface SupportTicketListResponse {
  ok: boolean;
  tickets: SupportTicket[];
}

export interface CreateSupportTicketPayload {
  category: SupportTicketCategory;
  subject: string;
  body: string;
}

export function listSupportTickets(): Promise<SupportTicketListResponse> {
  return apiFetch<SupportTicketListResponse>("/api/support/tickets");
}

export function createSupportTicket(
  payload: CreateSupportTicketPayload
): Promise<{ ok: boolean; ticket_id: number }> {
  return apiFetch<{ ok: boolean; ticket_id: number }>(
    "/api/support/tickets",
    {
      method: "POST",
      body: payload
    }
  );
}

export function getSupportTicket(
  ticketId: number
): Promise<SupportTicketDetailResponse> {
  return apiFetch<SupportTicketDetailResponse>(
    `/api/support/tickets/${ticketId}`
  );
}

export function sendSupportMessage(
  ticketId: number,
  body: string
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/support/tickets/${ticketId}/messages`,
    {
      method: "POST",
      body: { body }
    }
  );
}

// ============================================================
// ADMIN / TICKETS
// ============================================================

export interface AdminTicketListResponse {
  ok: boolean;
  tickets: SupportTicket[];
}

export function listAdminTickets(
  status?: SupportTicketStatus | ""
): Promise<AdminTicketListResponse> {
  return apiFetch<AdminTicketListResponse>("/api/admin/tickets", {
    query: {
      status: status || undefined
    }
  });
}

export function sendAdminTicketMessage(
  ticketId: number,
  body: string
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/admin/tickets/${ticketId}/messages`,
    {
      method: "POST",
      body: { body }
    }
  );
}

export function closeAdminTicket(
  ticketId: number
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/admin/tickets/${ticketId}/close`,
    {
      method: "POST"
    }
  );
}

export function reopenAdminTicket(
  ticketId: number
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/admin/tickets/${ticketId}/reopen`,
    {
      method: "POST"
    }
  );
}

export function assignAdminTicket(
  ticketId: number,
  adminId: number
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/admin/tickets/${ticketId}/assign`,
    {
      method: "POST",
      body: { admin_id: adminId }
    }
  );
}

// ============================================================
// ADMIN / USERS
// ============================================================

export interface AdminUser {
  id: number;
  nickname: string;
  email: string;
  role: UserRole;
  is_active: number;
  created_at: string;
  last_seen_at?: string | null;
}

export interface AdminUsersResponse {
  ok: boolean;
  users: AdminUser[];
}

export function listAdminUsers(): Promise<AdminUsersResponse> {
  return apiFetch<AdminUsersResponse>("/api/admin/users");
}

export function setUserRole(
  userId: number,
  role: UserRole
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/admin/users/${userId}/role`,
    {
      method: "POST",
      body: { role }
    }
  );
}

export function setUserActive(
  userId: number,
  isActive: boolean
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/admin/users/${userId}/active`,
    {
      method: "POST",
      body: { is_active: isActive }
    }
  );
}

// ============================================================
// ADMIN / ANALYTICS / SOURCES / LOGS
// ============================================================

export interface AdminAnalyticsSummary {
  users_total: number;
  tickets_total: number;
  tickets_open: number;
  messages_total: number;
  events_24h: number;
  alerts_24h: number;
  reports_new: number;
}

export interface AdminAnalyticsResponse {
  ok: boolean;
  summary: AdminAnalyticsSummary;
}

export interface AdminSourceStatus {
  handle: string;
  kind: string;
  weight: number;
  active: number;
  notes?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  last_posts_count?: number;
  last_events_count?: number;
  updated_at?: string | null;
}

export interface AdminSourceStatusResponse {
  ok: boolean;
  sources: AdminSourceStatus[];
}

export interface AdminLog {
  id: number;
  action: string;
  target?: string | null;
  details?: string | null;
  created_at: string;
  admin_nickname?: string | null;
}

export interface AdminLogsResponse {
  ok: boolean;
  logs: AdminLog[];
}

export function fetchAdminAnalyticsSummary(): Promise<AdminAnalyticsResponse> {
  return apiFetch<AdminAnalyticsResponse>(
    "/api/admin/analytics/summary"
  );
}

export function fetchAdminSourceStatus(): Promise<AdminSourceStatusResponse> {
  return apiFetch<AdminSourceStatusResponse>(
    "/api/admin/source-status"
  );
}

export function fetchAdminLogs(): Promise<AdminLogsResponse> {
  return apiFetch<AdminLogsResponse>("/api/admin/logs");
}

// ============================================================
// ADMIN / EVENT REPORTS
// ============================================================

export type EventReportStatus =
  | "new"
  | "reviewing"
  | "false"
  | "resolved";

export interface AdminEventReport {
  id: number;
  event_hash?: string | null;
  comment?: string | null;
  status: EventReportStatus;
  created_at: string;
  reporter_nickname?: string | null;
}

export interface AdminEventReportsResponse {
  ok: boolean;
  reports: AdminEventReport[];
}

export function fetchAdminEventReports(): Promise<AdminEventReportsResponse> {
  return apiFetch<AdminEventReportsResponse>(
    "/api/admin/event-reports"
  );
}

export function setAdminEventReportStatus(
  reportId: number,
  status: EventReportStatus
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/admin/event-reports/${reportId}/status`,
    {
      method: "POST",
      body: { status }
    }
  );
}

// ============================================================
// USER EVENT REPORTS
// ============================================================

export interface CreateEventReportPayload {
  event_hash?: string;
  comment: string;
}

export function createEventReport(
  payload: CreateEventReportPayload
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/reports", {
    method: "POST",
    body: payload
  });
}

// ============================================================
// ADMIN / SETTINGS
// ============================================================

export interface AdminSetting {
  key: string;
  value: string;
  updated_at?: string;
}

export interface AdminSettingsResponse {
  ok: boolean;
  settings: AdminSetting[];
}

export function fetchAdminSettings(): Promise<AdminSettingsResponse> {
  return apiFetch<AdminSettingsResponse>("/api/admin/settings");
}

export function updateAdminSetting(
  key: string,
  value: string
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/admin/settings", {
    method: "POST",
    body: { key, value }
  });
}

// ============================================================
// ADMIN / CHANNELS
// ============================================================

export type ChannelKind =
  | "universal"
  | "regional"
  | "official"
  | "volunteer";

export interface AdminChannelUpdatePayload {
  handle: string;
  kind?: ChannelKind;
  weight?: number;
  active?: boolean;
  notes?: string;
}

export function updateAdminChannel(
  payload: AdminChannelUpdatePayload
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/admin/channels", {
    method: "POST",
    body: payload
  });
}

// ============================================================
// ANALYTICS
// ============================================================

export function trackAnalyticsEvent(
  name: string,
  props?: Record<string, unknown>
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/analytics/event", {
    method: "POST",
    body: {
      name,
      props: props ?? null
    },
    timeoutMs: 8000
  });
}
