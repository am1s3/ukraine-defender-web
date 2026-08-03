// ============================================================
// Ukraine Defender — launch-points.ts
// FULL FILE
//
// Источники запусков + мета для траекторий:
// - LAUNCH_CENTERS;
// - SPEED_KMH;
// - TYPE_COLOR;
// - TYPE_ICON;
// - TYPE_DUR.
// ============================================================

import type { LaunchMeta, ThreatType } from "../types";

// ============================================================
// LAUNCH CENTERS
// ============================================================

export const LAUNCH_CENTERS: Record<string, LaunchMeta> = {
  bryansk: {
    coord: [53.25, 34.37],
    name: "Брянськ",
    carrier: "наземний пуск · балістика"
  },

  belgorod: {
    coord: [50.6, 36.59],
    name: "Бєлгород",
    carrier: "наземний пуск"
  },

  kursk: {
    coord: [51.73, 36.19],
    name: "Курськ",
    carrier: "шахеди / балістика"
  },

  engels: {
    coord: [51.47, 46.2],
    name: "Енгельс",
    carrier: "Ту-95 · крилаті"
  },

  black_sea: {
    coord: [44.5, 33.5],
    name: "Чорне море",
    carrier: "морські носії · Калібр"
  },

  caspian: {
    coord: [43.0, 49.0],
    name: "Каспій",
    carrier: "Ту-95 / кораблі"
  },

  crimea: {
    coord: [45.3, 34.0],
    name: "Крим",
    carrier: "пуски з Криму"
  },

  primorsko_akhtarsk: {
    coord: [46.05, 38.17],
    name: "Приморсько-Ахтарськ",
    carrier: "шахеди"
  },

  voronezh: {
    coord: [51.66, 39.2],
    name: "Воронеж",
    carrier: "шахеди / балістика"
  },

  oryol: {
    coord: [52.97, 36.07],
    name: "Орьол",
    carrier: "шахеди"
  },

  millerovo: {
    coord: [48.92, 40.4],
    name: "Міллерово",
    carrier: "Іскандери / авіація"
  },

  rostov: {
    coord: [47.23, 39.72],
    name: "Ростов",
    carrier: "балістика / авіація"
  },

  taganrog: {
    coord: [47.21, 38.9],
    name: "Таганрог",
    carrier: "авіація"
  }
};

// ============================================================
// SPEEDS (KM/H) FOR ETA
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
// COLORS BY THREAT TYPE
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
// ICONS BY THREAT TYPE
// ============================================================

export const TYPE_ICON: Record<ThreatType, string> = {
  shahed: "🛸",
  ballistic: "🚀",
  cruise: "☄️",
  kab: "💣",
  aviation: "✈️",
  recon: "👁",
  unknown: "⚠️"
};

// ============================================================
// ANIMATION DURATION BY THREAT TYPE
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
