import type { AlertResponse } from "./types";

// TODO: замініть на свій домен воркера
const API_BASE = "https://ukraine-defender-api.shushko-art.workers.dev";

export async function fetchAlerts(): Promise<AlertResponse> {
  const res = await fetch(`${API_BASE}/api/alerts`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  return (await res.json()) as AlertResponse;
}
