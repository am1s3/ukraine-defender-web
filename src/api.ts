// ============================================================
// Ukraine Defender — api.ts (FULL)
// Прямі адреси + всі функції
// ============================================================

import type {
  AlertResponse,
  ThreatEvent,
  NightResponse,
  AuthUser,
  AuthResponse,
  MeResponse,
  RegisterPayload,
  LoginPayload,
  ProfilePatch,
  PasswordForgotPayload,
  PasswordForgotResponse,
  PasswordResetPayload,
  SupportTicket,
  SupportMessage,
  SupportTicketDetailResponse,
  SupportTicketListResponse,
  CreateSupportTicketPayload,
  AdminUser,
  AdminUsersResponse,
  AdminTicketListResponse,
  AdminAnalyticsSummary,
  AdminAnalyticsResponse,
  AdminLogEntry,
  AdminLogsResponse,
  AdminSourceStatusEntry,
  AdminSourceStatusResponse,
  EventReport,
  AdminEventReportsResponse,
  CreateEventReportPayload,
  SettingRow,
  AdminSettingsResponse,
  PublicSettingsResponse,
  PublicSourceStatusResponse,
  AdminChannelUpdatePayload,
  HealthResponse,
  UserRole,
  SupportTicketStatus,
  EventReportStatus,
  EventsResponse
} from "./types";

// ============================================================
// DIRECT ENDPOINTS
// ============================================================

const DATA_API_BASE =
  "https://ukraine-defender-data.shushko-art.workers.dev";

const AUTH_API_BASE =
  "https://ukraine-defender-api.shushko-art.workers.dev";

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

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  auth?: boolean;
  timeoutMs?: number;
}

function baseFor(path: string): string {
  if (/^\/api\/(alerts|events|posts|night)/.test(path)) {
    return DATA_API_BASE;
  }
  return AUTH_API_BASE;
}

function buildUrl(path: string, query?: QueryParams): string {
  const base = baseFor(path).replace(/\/+$/, "");
  const url = new URL(`${base}${path}`, window.location.origin);

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
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
// DATA / MAP / EVENTS (DATA WORKER)
// ============================================================

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

export async function fetchPosts(channel: string) {
  return apiFetch("/api/posts", {
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
// AUTH (AUTH WORKER)
// ============================================================

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
// PUBLIC SETTINGS / SOURCE STATUS (AUTH WORKER)
// ============================================================

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
// SUPPORT (AUTH WORKER)
// ============================================================

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
// ADMIN / TICKETS (AUTH WORKER)
// ============================================================

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
// ADMIN / USERS (AUTH WORKER)
// ============================================================

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
// ADMIN / ANALYTICS / SOURCES / LOGS (AUTH WORKER)
// ============================================================

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
// ADMIN / EVENT REPORTS (AUTH WORKER)
// ============================================================

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
// ADMIN / SETTINGS / CHANNELS (AUTH WORKER)
// ============================================================

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

export function updateAdminChannel(
  payload: AdminChannelUpdatePayload
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/admin/channels", {
    method: "POST",
    body: payload
  });
}

// ============================================================
// USER EVENT REPORTS (AUTH WORKER)
// ============================================================

export function createEventReport(
  payload: CreateEventReportPayload
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/reports", {
    method: "POST",
    body: payload
  });
}

// ============================================================
// ANALYTICS (AUTH WORKER)
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
