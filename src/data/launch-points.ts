// ============================================================
// Ukraine Defender — launch-points.ts
// FULL FILE
// ============================================================

import type { LaunchMeta, ThreatType } from "../types";

// ============================================================
// LAUNCH CENTERS
// ============================================================

export const LAUNCH_CENTERS: Record<string, LaunchMeta> = {
  bryansk: { coord: [53.25, 34.37], name: "Брянськ", carrier: "наземний пуск · балістика" },
  belgorod: { coord: [50.6, 36.59], name: "Бєлгород", carrier: "наземний пуск" },
  kursk: { coord: [51.73, 36.19], name: "Курськ", carrier: "шахеди / балістика" },
  engels: { coord: [51.47, 46.2], name: "Енгельс", carrier: "Ту-95 · крилаті" },
  black_sea: { coord: [44.5, 33.5], name: "Чорне море", carrier: "морські носії · Калібр" },
  caspian: { coord: [43.0, 49.0], name: "Каспій", carrier: "Ту-95 / кораблі" },
  crimea: { coord: [45.3, 34.0], name: "Крим", carrier: "пуски з Криму" },
  primorsko_akhtarsk: { coord: [46.05, 38.17], name: "Приморсько-Ахтарськ", carrier: "шахеди" },
  voronezh: { coord: [51.66, 39.2], name: "Воронеж", carrier: "шахеди / балістика" },
  oryol: { coord: [52.97, 36.07], name: "Орьол", carrier: "шахеди" },
  millerovo: { coord: [48.92, 40.4], name: "Міллерово", carrier: "Іскандери / авіація" },
  rostov: { coord: [47.23, 39.72], name: "Ростов", carrier: "балістика / авіація" },
  taganrog: { coord: [47.21, 38.9], name: "Таганрог", carrier: "авіація" }
};

// ============================================================
// SPEEDS (KM/H)
// ============================================================

export const SPEED_KMH: Record<ThreatType, number> = {
  ballistic: 4000,
  cruise: 800,
  shahed: 180,
  kab: 900,
  aviation: 900,
  recon: 200,
  unknown: 500
};

// ============================================================
// COLORS
// ============================================================

export const TYPE_COLOR: Record<ThreatType, string> = {
  shahed: "#35c4ff",
  ballistic: "#ff3b3b",
  cruise: "#ffb020",
  kab: "#ff7a18",
  aviation: "#ff5fa2",
  recon: "#7aa2ff",
  unknown: "#8aa0c0"
};

// ============================================================
// SVG ICONS (instead of emoji)
// ============================================================

function svg(color: string, path: string): string {
  return (
    `<svg viewBox="0 0 24 24" width="14" height="14" ` +
    `style="vertical-align:-2px;display:inline-block;" aria-hidden="true">` +
    `<path fill="${color}" d="${path}"></path></svg>`
  );
}

const P_SHAHED = "M12 3 L21 20 L12 15 L3 20 Z";
const P_BALLISTIC =
  "M12 2 L15 9 L15 16 L9 16 L9 9 Z M9 16 L7 21 L12 18.5 L17 21 L15 16 Z";
const P_CRUISE =
  "M2 12 L13 12 L13 9 L21 12 L13 15 L13 12 Z M13 10.5 L16 8 L16 10.5 Z M13 13.5 L16 16 L16 13.5 Z";
const P_KAB = "M12 2 C16 6 17 11 15 15 L9 15 C7 11 8 6 12 2 Z M9 15 L8 20 L12 17.5 L16 20 L15 15 Z";
const P_AVIATION =
  "M21 12 L14 10 L9 4 L7 4 L10 10 L4 10 L2.5 8 L1.5 8 L3 12 L1.5 16 L2.5 16 L4 14 L10 14 L7 20 L9 20 L14 14 L21 12 Z";
const P_RECON =
  "M12 5 C6 5 2.5 12 2.5 12 C2.5 12 6 19 12 19 C18 19 21.5 12 21.5 12 C21.5 12 18 5 12 5 Z M12 15.5 A3.5 3.5 0 1 1 12 8.5 A3.5 3.5 0 0 1 12 15.5 Z";
const P_UNKNOWN = "M12 2 L22 20 L2 20 Z M11 9 L13 9 L13 15 L11 15 Z M11 16.5 L13 16.5 L13 18.5 L11 18.5 Z";

export const TYPE_ICON: Record<ThreatType, string> = {
  shahed: svg(TYPE_COLOR.shahed, P_SHAHED),
  ballistic: svg(TYPE_COLOR.ballistic, P_BALLISTIC),
  cruise: svg(TYPE_COLOR.cruise, P_CRUISE),
  kab: svg(TYPE_COLOR.kab, P_KAB),
  aviation: svg(TYPE_COLOR.aviation, P_AVIATION),
  recon: svg(TYPE_COLOR.recon, P_RECON),
  unknown: svg(TYPE_COLOR.unknown, P_UNKNOWN)
};

// ============================================================
// ANIMATION DURATION
// ============================================================

export const TYPE_DUR: Record<ThreatType, string> = {
  ballistic: "0.5s",
  cruise: "1.1s",
  shahed: "1.7s",
  kab: "1.2s",
  aviation: "1.2s",
  recon: "1.5s",
  unknown: "1.3s"
};
