// ============================================================
// Ukraine Defender — types.ts
// FULL FILE
//
// Единые типы проекта:
// - threat / map / alerts / night report;
// - users / auth / roles;
// - support;
// - admin;
// - settings;
// - analytics;
// - reports.
// ============================================================

// ============================================================
// GENERIC HELPERS
// ============================================================

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type TimestampISO = string;

export type Coordinate = [number, number];

// ============================================================
// THREAT TYPES
// ============================================================

export type ThreatType =
  | "shahed"
  | "ballistic"
  | "cruise"
  | "kab"
  | "aviation"
  | "recon"
  | "unknown";

export type ThreatFilterKey = ThreatType | "all" | "verified";

export type ConsensusLevel = "low" | "mid" | "high";

export interface ThreatSource {
  channel: string;
  id?: string;
  ts: Nullable<TimestampISO>;
  url?: string;
}

export interface EventLineage {
  extractor: string;
  prompt_version?: Nullable<string>;
}

export interface ThreatEvent {
  threat_type: ThreatType;

  toponym_key: Nullable<string>;
  toponym_raw: Nullable<string>;

  launch_key: Nullable<string>;

  count: Nullable<number>;

  consensus: number;

  confidence?: Nullable<number>;

  text?: string;
  raw_text?: string;

  source: ThreatSource;
  sources: ThreatSource[];

  lineage?: EventLineage;
}

// ============================================================
// REGIONS / ALERTS
// ============================================================

export type AlertStripState = "calm" | "alert";

export interface Region {
  key: string;
  name_uk: string;

  alert: boolean;

  changed: Nullable<TimestampISO>;
  duration_sec: Nullable<number>;

  active: boolean;

  confidence?: Nullable<number>;
  source_channel?: Nullable<string>;
  excerpt?: Nullable<string>;
}

export interface AlertDebugPost {
  channel: string;
  ts: Nullable<TimestampISO>;
  regions?: string[];
  text?: string;
}

export interface AlertResponse {
  version?: string;
  updated_at: TimestampISO;

  source?: string;

  active_regions: string[];
  active_alerts: number;

  regions: Region[];

  errors?: string[];

  debug_status_posts?: AlertDebugPost[];

  from_cache?: boolean;
  stale?: boolean;
  partial?: boolean;
  error?: string;
}

// ============================================================
// EVENTS API RESPONSE
// ============================================================

export interface GroqStats {
  calls: number;
  cache_hits: number;
  errors: string[];
  model: string;
}

export interface UnmatchedPostDebug {
  channel: string;
  ts: Nullable<TimestampISO>;
  text: string;
}

export interface EventsResponse {
  region: string;

  channels: string[];

  posts_scanned: number;
  events_count: number;

  events: ThreatEvent[];

  groq?: GroqStats;

  debug_unmatched?: UnmatchedPostDebug[];

  errors?: string[];

  from_cache?: boolean;
  stale?: boolean;
  partial?: boolean;
  error?: string;
}

// ============================================================
// POSTS API RESPONSE
// ============================================================

export interface TelegramPost {
  id: string;
  channel: string;
  text: string;
  ts: Nullable<TimestampISO>;
}

export interface PostsResponse {
  version?: string;
  channel: string;
  count: number;
  posts: TelegramPost[];
  from_cache?: boolean;
}

// ============================================================
// NIGHT REPORT
// ============================================================

export interface NightByType {
  type: ThreatType;
  count: number;
  confirmed: number;
}

export interface NightToponym {
  key: string;
  name: string;
  count: number;
}

export interface NightChannel {
  channel: string;
  count: number;
}

export interface NightWindow {
  region: string;
  started: Nullable<TimestampISO>;
  ended: Nullable<TimestampISO>;

  // Некоторые ответы могут возвращать флаг активной тревоги окна.
  alert?: boolean;
}

export interface NightResponse {
  version?: string;

  hours: number;

  from?: TimestampISO;
  to?: TimestampISO;

  db?: boolean;

  stored_events: number;

  by_type: NightByType[];
  top_toponyms: NightToponym[];
  channels: NightChannel[];
  windows: NightWindow[];

  alerts_now?: number;

  error?: string;
}

// ============================================================
// GEO / MAP META
// ============================================================

export interface LaunchMeta {
  coord: Coordinate;
  name: string;
  carrier: string;
}

export interface ToponymMeta {
  coord: Coordinate;
  name: string;
}

export type LaunchCentersMap = Record<string, LaunchMeta>;

export type ToponymCentersMap = Record<string, ToponymMeta>;

// ============================================================
// USERS / AUTH
// ============================================================

export type UserRole =
  | "user"
  | "support"
  | "admin"
  | "owner";

export type ThemePreference =
  | "dark"
  | "light"
  | "system";

export type LanguagePreference =
  | "uk"
  | "en";

export interface AuthUser {
  id: number;

  nickname: string;
  email: string;

  role: UserRole;

  theme: ThemePreference;
  lang: LanguagePreference;

  is_active: number;

  email_verified_at?: Nullable<TimestampISO>;

  created_at?: TimestampISO;
  updated_at?: TimestampISO;
  last_seen_at?: Nullable<TimestampISO>;
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

export interface SessionInfo {
  user_id: number;
  created_at: TimestampISO;
  expires_at: TimestampISO;
  user_agent?: Nullable<string>;
  ip?: Nullable<string>;
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

  assigned_admin_id?: Nullable<number>;

  created_at: TimestampISO;
  updated_at: TimestampISO;
  closed_at?: Nullable<TimestampISO>;

  user_nickname?: string;
  user_email?: string;

  assigned_admin_nickname?: Nullable<string>;

  last_message?: Nullable<string>;
}

export interface SupportMessage {
  id: number;

  ticket_id: number;
  sender_id: Nullable<number>;

  body: string;

  is_admin: number;

  created_at: TimestampISO;

  nickname?: Nullable<string>;
  role?: Nullable<UserRole>;
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

// ============================================================
// ADMIN / USERS
// ============================================================

export interface AdminUser {
  id: number;

  nickname: string;
  email: string;

  role: UserRole;

  is_active: number;

  created_at: TimestampISO;
  last_seen_at?: Nullable<TimestampISO>;
}

export interface AdminUsersResponse {
  ok: boolean;
  users: AdminUser[];
}

// ============================================================
// ADMIN / TICKETS
// ============================================================

export type AdminTicketFilter =
  | ""
  | SupportTicketStatus;

export interface AdminTicketListResponse {
  ok: boolean;
  tickets: SupportTicket[];
}

// ============================================================
// ADMIN / ANALYTICS
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

// ============================================================
// ADMIN / LOGS
// ============================================================

export interface AdminLogEntry {
  id: number;

  admin_id?: Nullable<number>;

  action: string;
  target?: Nullable<string>;

  details?: Nullable<string>;

  created_at: TimestampISO;

  admin_nickname?: Nullable<string>;
}

export interface AdminLogsResponse {
  ok: boolean;
  logs: AdminLogEntry[];
}

// ============================================================
// CHANNELS / SOURCES
// ============================================================

export type ChannelKind =
  | "universal"
  | "regional"
  | "official"
  | "volunteer";

export interface ChannelSource {
  handle: string;

  kind: ChannelKind;

  weight: number;

  active: number;

  notes?: Nullable<string>;

  created_at?: TimestampISO;
  updated_at?: TimestampISO;
}

export interface SourceStatusEntry {
  channel: string;

  last_success_at?: Nullable<TimestampISO>;
  last_error?: Nullable<string>;

  last_posts_count?: number;
  last_events_count?: number;

  updated_at?: TimestampISO;
}

//
// Специально более мягкий тип для админки,
// потому что API может отдавать kind как string.
//
export interface AdminSourceStatusEntry {
  handle: string;

  kind: string;

  weight: number;

  active: number;

  notes?: Nullable<string>;

  created_at?: TimestampISO;
  updated_at?: Nullable<TimestampISO>;

  last_success_at?: Nullable<TimestampISO>;
  last_error?: Nullable<string>;

  last_posts_count?: number;
  last_events_count?: number;
}

export interface AdminSourceStatusResponse {
  ok: boolean;
  sources: AdminSourceStatusEntry[];
}

export interface PublicSourceStatusResponse {
  ok: boolean;
  sources: Array<{
    handle: string;
    kind: ChannelKind;
    active: number;
  }>;
}

export interface AdminChannelUpdatePayload {
  handle: string;

  kind?: ChannelKind;

  weight?: number;

  active?: boolean;

  notes?: string;
}

// ============================================================
// EVENT REPORTS / MODERATION
// ============================================================

export type EventReportStatus =
  | "new"
  | "reviewing"
  | "false"
  | "resolved";

export interface EventReport {
  id: number;

  event_hash?: Nullable<string>;

  user_id?: Nullable<number>;

  comment?: Nullable<string>;

  status: EventReportStatus;

  created_at: TimestampISO;

  reviewed_by?: Nullable<number>;
  reviewed_at?: Nullable<TimestampISO>;

  reporter_nickname?: Nullable<string>;
}

export interface AdminEventReportsResponse {
  ok: boolean;
  reports: EventReport[];
}

export interface CreateEventReportPayload {
  event_hash?: string;
  comment: string;
}

// ============================================================
// SETTINGS
// ============================================================

export interface SettingRow {
  key: string;
  value: string;
  updated_at?: TimestampISO;
}

export interface AdminSettingsResponse {
  ok: boolean;
  settings: SettingRow[];
}

export interface PublicSettingsResponse {
  ok: boolean;
  settings: Record<string, string>;
}

export type SettingKey =
  | "donation_url"
  | "support_enabled"
  | "default_lang"
  | "default_theme"
  | "loader_enabled"
  | "loader_duration_ms"
  | "guest_mode_enabled"
  | "admin_analytics_enabled"
  | "source_status_public"
  | string;

// ============================================================
// DONATIONS
// ============================================================

export interface DonationInfo {
  url: string;
  qr_url?: string;
  label?: string;
}

// ============================================================
// UI STATE
// ============================================================

export type ToastKind = "info" | "warn" | "ok";

export interface ToastOptions {
  text: string;
  kind?: ToastKind;
  icon?: string;
}

export type OverlayName =
  | "auth"
  | "support"
  | "donate"
  | "admin"
  | "about"
  | "report";

export interface DrawerState {
  open: boolean;
  regionKey: Nullable<string>;
}

export interface UserMenuState {
  open: boolean;
}

export interface AuthViewState {
  view: "login" | "register" | "forgot" | "reset";
  registerStep: number;
}

// ============================================================
// HEALTH
// ============================================================

export interface HealthResponse {
  ok: boolean;

  service?: string;
  version?: string;

  ts?: TimestampISO;

  db?: boolean;
  data_proxy?: boolean;

  groq_keys?: number;
  channels?: number;
  active_regions?: number;
}

// ============================================================
// ANALYTICS
// ============================================================

export interface AnalyticsEventPayload {
  name: string;
  props?: Nullable<Record<string, unknown>>;
}

export interface AnalyticsEventRow {
  id: number;

  user_id?: Nullable<number>;

  name: string;

  props?: Nullable<string>;

  created_at: TimestampISO;
}
