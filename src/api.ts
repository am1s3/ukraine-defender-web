import type { AlertResponse, EventsResponse } from "./types";

const API_BASE = "https://ukraine-defender-api.shushko-art.workers.dev";

// fetch з жорстким таймаутом, щоб фронт ніколи не висів вічно
function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" })
    .finally(() => clearTimeout(t));
}

export async function fetchAlerts(): Promise<AlertResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/alerts`, 8000);
  if (!res.ok) throw new Error(`API alerts HTTP ${res.status}`);
  return (await res.json()) as AlertResponse;
}

export async function fetchEvents(region = "kyiv"): Promise<EventsResponse> {
  const res = await fetchWithTimeout(
    `${API_BASE}/api/events?region=${encodeURIComponent(region)}`,
    12000
  );
  if (!res.ok) throw new Error(`API events HTTP ${res.status}`);
  return (await res.json()) as EventsResponse;
}
