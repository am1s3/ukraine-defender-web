export type ThreatType =
  | "shahed" | "ballistic" | "cruise" | "kab" | "aviation" | "recon" | "unknown";

export interface Region {
  key: string;
  name_uk: string;
  source_name?: string;
  alert: boolean;
  changed: string | null;
  duration_sec: number | null;
  active: boolean;
}

export interface AlertResponse {
  version: string;
  updated_at: string;
  source: string;
  active_regions: string[];
  active_alerts: number;
  regions: Region[];
  from_cache?: boolean;
  stale?: boolean;
  partial?: boolean;
  error?: string;
  errors?: string[];
}

export interface EventSource {
  channel: string;
  id: string;
  ts: string | null;
  url: string;
}

export interface ThreatEvent {
  threat_type: ThreatType;
  toponym_key: string | null;
  toponym_raw: string | null;
  launch_key: string | null;
  count: number | null;
  confidence?: number;
  text: string;
  source: EventSource;
  sources: EventSource[];
  consensus: number;
  lineage?: { extractor: string; prompt_version: string | null };
}

export interface EventsResponse {
  version: string;
  region: string;
  updated_at: string;
  channels: string[];
  posts_scanned: number;
  events_count: number;
  events: ThreatEvent[];
  groq?: { calls: number; cache_hits: number; errors: string[]; model: string };
  debug_unmatched?: { channel: string; ts: string | null; text: string }[];
  errors: string[];
  from_cache?: boolean;
  partial?: boolean;
  error?: string;
}

// Агрегат з D1 для звіту за вікно (ніч / доба)
export interface NightTypeStat { type: ThreatType; count: number; confirmed: number; }
export interface NightToponym { key: string; name: string; count: number; }
export interface NightWindow { region: string; started: string | null; ended: string | null; alert: boolean; }
export interface NightResponse {
  version: string;
  hours: number;
  from: string;
  to: string;
  stored_events: number;
  by_type: NightTypeStat[];
  top_toponyms: NightToponym[];
  channels: { channel: string; count: number }[];
  windows: NightWindow[];
  alerts_now: number;
}
