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
  text: string;
  source: EventSource;
  sources: EventSource[];
  consensus: number;
}

export interface EventsResponse {
  version: string;
  region: string;
  updated_at: string;
  channels: string[];
  posts_scanned: number;
  events_count: number;
  events: ThreatEvent[];
  errors: string[];
  from_cache?: boolean;
}
