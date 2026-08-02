export interface Region {
  key: string;
  name_uk: string;
  source_name: string;
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
}

// З'явиться на ШАГІ 3 (події з ТГ-каналів)
export interface ThreatEvent {
  id: string;
  ts: string;
  threat_type: "shahed" | "ballistic" | "cruise" | "kab" | "aviation" | "recon" | "unknown";
  toponym_key: string | null;
  toponym_raw: string | null;
  launch_key: string | null;
  count: number | null;
  confidence: number;
  sources: { channel: string; ts: string; url: string }[];
  consensus: number;
}
