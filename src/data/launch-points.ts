// Координати + назви джерел запуску (зона агресора) для траєкторій
export interface LaunchMeta { coord: [number, number]; name: string; carrier: string; }

export const LAUNCH_CENTERS: Record<string, LaunchMeta> = {
  bryansk:   { coord: [53.25, 34.37], name: "Брянськ",     carrier: "наземний пуск · балістика" },
  belgorod:  { coord: [50.60, 36.59], name: "Бєлгород",    carrier: "наземний пуск" },
  kursk:     { coord: [51.73, 36.19], name: "Курськ",      carrier: "шахеди / балістика" },
  engels:    { coord: [51.47, 46.20], name: "Енгельс",     carrier: "Ту-95 · крилаті" },
  black_sea: { coord: [44.50, 33.50], name: "Чорне море",  carrier: "морські носії · Калібр" },
  caspian:   { coord: [43.00, 49.00], name: "Каспій",      carrier: "Ту-95 / кораблі" },
  crimea:    { coord: [45.30, 34.00], name: "Крим",        carrier: "пуски з Криму" },
};

// Середні швидкості для оцінки ETA (км/год)
export const SPEED_KMH: Record<string, number> = {
  ballistic: 4000, cruise: 800, shahed: 180, kab: 900, aviation: 900, recon: 200, unknown: 500,
};

// Палітра + іконки типів (дубль з панелі, щоб карта була автономною)
export const TYPE_COLOR: Record<string, string> = {
  shahed: "#35c4ff", ballistic: "#ff3b3b", cruise: "#ffb020", kab: "#ff7a18",
  aviation: "#ff5fa2", recon: "#7aa2ff", unknown: "#8aa0c0",
};
export const TYPE_ICON: Record<string, string> = {
  shahed: "🛸", ballistic: "🚀", cruise: "☄️", kab: "💣", aviation: "✈️", recon: "👁", unknown: "⚠️",
};
// Тривалість анімації трасера (балістика швидко, шахед повільно)
export const TYPE_DUR: Record<string, string> = {
  ballistic: "0.5s", cruise: "1.1s", shahed: "1.7s", kab: "1.2s", aviation: "1.2s", recon: "1.5s", unknown: "1.3s",
};
