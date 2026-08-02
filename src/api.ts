import type { AlertResponse, EventsResponse } from "./types";

const API_BASE = "https://ukraine-defender-api.shushko-art.workers.dev";

export async function fetchAlerts(): Promise<AlertResponse> {
  const res = await fetch(`${API_BASE}/api/alerts`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API alerts HTTP ${res.status}`);
  return (await res.json()) as AlertResponse;
}

export async function fetchEvents(region = "kyiv"): Promise<EventsResponse> {
  const res = await fetch(`${API_BASE}/api/events?region=${encodeURIComponent(region)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API events HTTP ${res.status}`);
  return (await res.json()) as EventsResponse;
}
