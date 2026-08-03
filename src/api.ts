// ============================================================
// Ukraine Defender — api.ts (FIXED)
// Додано: валідація API-відповідей
// ============================================================

import type {
  AlertResponse,
  EventsResponse,
  NightResponse,
} from "./types";

const API_BASE = "https://ukraine-defender-api.shushko-art.workers.dev";

// 🔧 НОВІ ФУНКЦІЇ: валідація типів
function isValidRegion(r: any): boolean {
  return (
    typeof r === "object" &&
    r !== null &&
    typeof r.key === "string" &&
    typeof r.name_uk === "string" &&
    typeof r.alert === "boolean" &&
    typeof r.active === "boolean"
  );
}

function isValidAlertResponse(data: any): data is AlertResponse {
  if (typeof data !== "object" || data === null) return false;
  if (typeof data.updated_at !== "string") return false;
  if (!Array.isArray(data.regions)) return false;
  if (!data.regions.every(isValidRegion)) return false;
  if (typeof data.active_alerts !== "number") return false;
  return true;
}

function isValidThreatEvent(e: any): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.threat_type === "string" &&
    ["shahed", "ballistic", "cruise", "kab", "aviation", "recon", "unknown"].includes(
      e.threat_type
    ) &&
    typeof e.consensus === "number" &&
    typeof e.source === "object" &&
    typeof e.source.channel === "string"
  );
}

function isValidEventsResponse(data: any): data is EventsResponse {
  if (typeof data !== "object" || data === null) return false;
  if (typeof data.region !== "string") return false;
  if (!Array.isArray(data.events)) return false;
  if (!data.events.every(isValidThreatEvent)) return false;
  return true;
}

async function fetchWithValidation<T>(
  url: string,
  validator: (data: any) => data is T
): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();

  if (!validator(data)) {
    console.error("Invalid API response:", data);
    throw new Error("Invalid API response structure");
  }

  return data;
}

export async function fetchAlerts(): Promise<AlertResponse> {
  return fetchWithValidation(
    `${API_BASE}/api/alerts`,
    isValidAlertResponse
  );
}

export async function fetchEvents(region: string): Promise<EventsResponse> {
  return fetchWithValidation(
    `${API_BASE}/api/events?region=${encodeURIComponent(region)}`,
    isValidEventsResponse
  );
}

export async function fetchNight(hours: number): Promise<NightResponse> {
  const res = await fetch(`${API_BASE}/api/night?hours=${hours}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
