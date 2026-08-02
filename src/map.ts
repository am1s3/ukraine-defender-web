import L from "leaflet";
import type { Region, ThreatEvent } from "./types";
import { TOPONYM_CENTERS } from "./data/toponym-centers";
import { LAUNCH_CENTERS, SPEED_KMH, TYPE_COLOR, TYPE_ICON, TYPE_DUR } from "./data/launch-points";

const GEOJSON_URLS = [
  "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson",
  "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson",
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/ukraine.geojson",
];

const ISO_MAP: Record<string, string> = {
  "UA-71": "cherkasy", "UA-74": "chernihiv", "UA-77": "chernivtsi", "UA-12": "dnipro",
  "UA-14": "donetsk", "UA-26": "ivano_frankivsk", "UA-63": "kharkiv", "UA-65": "kherson",
  "UA-68": "khmelnytskyi", "UA-35": "kirovohrad", "UA-30": "kyiv_city", "UA-32": "kyiv_oblast",
  "UA-09": "luhansk", "UA-46": "lviv", "UA-48": "mykolaiv", "UA-51": "odesa", "UA-53": "poltava",
  "UA-56": "rivne", "UA-59": "sumy", "UA-61": "ternopil", "UA-04": "vinnytsia", "UA-07": "volyn",
  "UA-21": "zakarpattia", "UA-23": "zaporizhzhia", "UA-18": "zhytomyr",
};

const REGION_CENTERS: Record<string, [number, number]> = {
  vinnytsia: [49.23, 28.47], volyn: [50.75, 25.33], dnipro: [48.46, 35.05],
  donetsk: [48.02, 37.80], zhytomyr: [50.25, 28.66], zakarpattia: [48.62, 22.30],
  zaporizhzhia: [47.84, 35.14], ivano_frankivsk: [48.92, 24.71],
  kyiv_oblast: [50.05, 30.78], kirovohrad: [48.51, 32.26], luhansk: [48.57, 39.33],
  lviv: [49.84, 24.03], mykolaiv: [46.97, 31.99], odesa: [46.48, 30.72],
  poltava: [49.59, 34.55], rivne: [50.62, 26.25], sumy: [50.91, 34.80],
  ternopil: [49.55, 25.59], kharkiv: [49.99, 36.23], kherson: [46.64, 32.62],
  khmelnytskyi: [49.42, 26.99], cherkasy: [49.44, 32.06], chernivtsi: [48.29, 25.94],
  chernihiv: [51.49, 31.29], kyiv_city: [50.45, 30.52],
};

const UA_NAMES: Record<string, string> = {
  vinnytsia: "Вінницька", volyn: "Волинська", dnipro: "Дніпропетровська", donetsk: "Донецька",
  zhytomyr: "Житомирська", zakarpattia: "Закарпатська", zaporizhzhia: "Запорізька",
  ivano_frankivsk: "Івано-Франківська", kyiv_oblast: "Київська область", kirovohrad: "Кіровоградська",
  luhansk: "Луганська", lviv: "Львівська", mykolaiv: "Миколаївська", odesa: "Одеська",
  poltava: "Полтавська", rivne: "Рівненська", sumy: "Сумська", ternopil: "Тернопільська",
  kharkiv: "Харківська", kherson: "Херсонська", khmelnytskyi: "Хмельницька", cherkasy: "Черкаська",
  chernivtsi: "Чернівецька", chernihiv: "Чернігівська", kyiv_city: "Київ",
};

function matchByName(raw: string): string | null {
  const low = (raw || "").toLowerCase();
  if (!low) return null;
  const TABLE: [string, string[]][] = [
    ["kyiv_city", ["kyiv city", "kiev city", "kyyiv city", "місто київ", "м. київ", "м київ", "kyiv municipality"]],
    ["kyiv_oblast", ["kyiv oblast", "kiev oblast", "kyyivs", "київськ", "київщин"]],
    ["cherkasy", ["cherkas", "черкаськ"]], ["chernihiv", ["chernih", "чернігівськ"]],
    ["chernivtsi", ["cherniv", "чернівецьк"]], ["dnipro", ["dniprop", "дніпропетровськ"]],
    ["donetsk", ["donets", "донецьк"]], ["ivano_frankivsk", ["ivano", "івано-франк"]],
    ["kharkiv", ["kharkiv", "харківськ"]], ["kherson", ["kherson", "херсонськ"]],
    ["khmelnytskyi", ["khmel", "хмельницьк"]], ["kirovohrad", ["kirovoh", "кіровоградськ"]],
    ["luhansk", ["luhans", "луганськ"]], ["lviv", ["lviv", "l'viv", "львівськ"]],
    ["mykolaiv", ["mykola", "миколаївськ"]], ["odesa", ["odes", "odessa", "одеськ"]],
    ["poltava", ["poltav", "полтавськ"]], ["rivne", ["rivne", "rovno", "рівненськ"]],
    ["sumy", ["sumy", "сумськ"]], ["ternopil", ["ternop", "тернопільськ"]],
    ["zakarpattia", ["zakarp", "transcarpath", "закарпатськ"]], ["vinnytsia", ["vinny", "вінницьк"]],
    ["volyn", ["volyn", "волинськ"]], ["zaporizhzhia", ["zaporiz", "запорізьк"]],
    ["zhytomyr", ["zhytom", "житомирськ"]],
  ];
  for (const [key, pats] of TABLE) if (pats.some((p) => low.includes(p))) return key;
  return null;
}

function matchFeature(props: any): string | null {
  if (!props) return null;
  const iso = props.shapeISO || props.iso || props.iso_3166_2 || props.ISO_3166_2 || props.id;
  if (typeof iso === "string") {
    const up = iso.toUpperCase();
    if (ISO_MAP[up]) return ISO_MAP[up];
    const m = up.match(/UA-?(\d{1,2})/);
    if (m && ISO_MAP[`UA-${m[1].padStart(2, "0")}`]) return ISO_MAP[`UA-${m[1].padStart(2, "0")}`];
  }
  const candidates = [props.shapeName, props.name, props.NAME_1, props.NAME_2, props.ua, props.ukr, props.VARNAME_1];
  for (const c of candidates) {
    const k = matchByName(String(c || ""));
    if (k) return k;
  }
  return null;
}

// --- Гео-математика для траєкторій ---
function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function etaLabel(type: string, km: number): string {
  const speed = SPEED_KMH[type] || 500;
  const min = Math.round((km / speed) * 60);
  if (min < 60) return `~${min} хв`;
  const h = Math.floor(min / 60);
  return `~${h} год ${min % 60} хв`;
}
// Дуга (квадратична Безьє) між двома точками — красивіше за пряму
function arcPoints(a: [number, number], b: [number, number], segments = 26, curvature = 0.18): [number, number][] {
  const dx = b[1] - a[1], dy = b[0] - a[0];
  const dist = Math.hypot(dx, dy) || 1;
  const mx = (a[1] + b[1]) / 2, my = (a[0] + b[0]) / 2;
  const nx = -dy / dist, ny = dx / dist;
  const cx = mx + nx * dist * curvature, cy = my + ny * dist * curvature;
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cy + t * t * b[0];
    const lng = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cx + t * t * b[1];
    pts.push([lat, lng]);
  }
  return pts;
}

export class ThreatMap {
  private map: L.Map;
  private geoLayer: L.GeoJSON | null = null;
  private markers = new Map<string, L.CircleMarker>();
  private regionMap = new Map<string, Region>();
  private highlight: L.LayerGroup = L.layerGroup();
  private trajLayer: L.LayerGroup = L.layerGroup();
  private trajEnabled = false;
  private lastTrajKey = "";
  private lastEvents: ThreatEvent[] = [];
  private useFallback = false;
  private onSelect: (key: string) => void;

  constructor(el: string, onSelect: (key: string) => void) {
    this.onSelect = onSelect;
    this.map = L.map(el, { zoomControl: true, attributionControl: false, worldCopyJump: true }).setView([49.0, 31.5], 6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 12, minZoom: 4, subdomains: "abcd",
    }).addTo(this.map);
    this.highlight.addTo(this.map);
    this.trajLayer.addTo(this.map);
    this.buildTrajControl();
    this.loadGeo();
  }

  private buildTrajControl() {
    const ctl = L.control({ position: "topright" });
    ctl.onAdd = () => {
      const div = L.DomUtil.create("div", "traj-toggle");
      div.innerHTML = `<button class="traj-btn" title="Траєкторії цілей від джерел запуску">🎯 Траєкторії</button>`;
      const btn = div.querySelector("button")!;
      L.DomEvent.disableClickPropagation(div);
      btn.addEventListener("click", () => this.toggleTrajectories(btn));
      return div;
    };
    ctl.addTo(this.map);
  }

  private toggleTrajectories(btn: HTMLButtonElement) {
    this.trajEnabled = !this.trajEnabled;
    btn.classList.toggle("traj-btn--on", this.trajEnabled);
    if (this.trajEnabled) {
      this.lastTrajKey = ""; // примусово перемалювати
      this.drawTrajectories();
      this.fitTrajectories();
    } else {
      this.trajLayer.clearLayers();
    }
  }

  setTrajectories(events: ThreatEvent[]) {
    this.lastEvents = events;
    if (this.trajEnabled) this.drawTrajectories();
  }

  private trajSignature(events: ThreatEvent[]): string {
    return events
      .filter((e) => e.launch_key && e.toponym_key)
      .map((e) => `${e.threat_type}|${e.launch_key}|${e.toponym_key}`)
      .sort()
      .join(";");
  }

  private drawTrajectories() {
    if (!this.trajEnabled) return;
    const sig = this.trajSignature(this.lastEvents);
    if (sig === this.lastTrajKey) return; // нічого не змінилось — не дёргаємо
    this.lastTrajKey = sig;
    this.trajLayer.clearLayers();

    const seenLaunch = new Set<string>();
    for (const e of this.lastEvents) {
      if (!e.launch_key || !e.toponym_key) continue;
      const src = LAUNCH_CENTERS[e.launch_key];
      const dst = TOPONYM_CENTERS[e.toponym_key];
      if (!src || !dst) continue;

      const color = TYPE_COLOR[e.threat_type] || TYPE_COLOR.unknown;
      const dur = TYPE_DUR[e.threat_type] || TYPE_DUR.unknown;
      const pts = arcPoints(src.coord, dst.coord);

      // дуга-траєкторія з біжучим трасером
      L.polyline(pts, {
        color, weight: 2.5, opacity: 0.9, dashArray: "6 10",
        className: `trajectory trajectory--${e.threat_type}`,
      }).addTo(this.trajLayer).bindTooltip(
        `${TYPE_ICON[e.threat_type] || ""} ${e.threat_type} · ${src.name} → ${dst.name}`,
        { sticky: true }
      );
      // застосовуємо швидкість анімації через CSS-змінну
      const paths = this.trajLayer.getLayers().slice(-1)[0] as L.Polyline;
      const el = (paths as any)._path as SVGElement | undefined;
      if (el) el.style.setProperty("--dur", dur);

      // ETA-лейбл на середині дуги
      const km = distanceKm(src.coord, dst.coord);
      const mid = pts[Math.floor(pts.length / 2)];
      L.marker(mid, {
        interactive: false,
        icon: L.divIcon({
          className: "eta-wrap",
          html: `<span class="eta" style="border-color:${color};color:${color}">${TYPE_ICON[e.threat_type] || ""} ${etaLabel(e.threat_type, km)}</span>`,
          iconSize: [0, 0],
        }),
      }).addTo(this.trajLayer);

      // емітер (точка пуску) — один раз на джерело
      if (!seenLaunch.has(e.launch_key)) {
        seenLaunch.add(e.launch_key);
        L.circleMarker(src.coord, {
          radius: 8, color: "#ff7a18", weight: 2, fillColor: "#ff2d2d", fillOpacity: 0.7, className: "emitter",
        }).addTo(this.trajLayer).bindTooltip(`${src.name} · ${src.carrier}`, { direction: "top" });
      }
    }
  }

  private fitTrajectories() {
    const pts: [number, number][] = [];
    for (const e of this.lastEvents) {
      if (!e.launch_key || !e.toponym_key) continue;
      const src = LAUNCH_CENTERS[e.launch_key];
      const dst = TOPONYM_CENTERS[e.toponym_key];
      if (src) pts.push(src.coord);
      if (dst) pts.push(dst.coord);
    }
    if (pts.length >= 2) this.map.fitBounds(L.latLngBounds(pts).pad(0.25), { animate: true });
  }

  private async loadGeo() {
    let geojson: any = null;
    let usedUrl = "";
    for (const url of GEOJSON_URLS) {
      try {
        const r = await fetch(url);
        if (!r.ok) { console.warn(`[map] ${url} → HTTP ${r.status}`); continue; }
        const data = await r.json();
        const feats = data?.features ?? [];
        if (Array.isArray(feats) && feats.length > 0) { geojson = data; usedUrl = url; break; }
        console.warn(`[map] ${url} → немає features`);
      } catch (e) { console.warn(`[map] ${url} → помилка`, e); }
    }

    if (geojson) {
      let matched = 0;
      this.geoLayer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
        style: (f) => this.styleFor(matchFeature((f as any)?.properties)),
        onEachFeature: (f, layer) => {
          const key = matchFeature((f as any)?.properties);
          if (!key) return;
          matched++;
          layer.on("click", () => this.onSelect(key));
          layer.on("mouseover", () => (layer as L.Path).setStyle({ weight: 3, fillOpacity: 0.62 }));
          layer.on("mouseout", () => this.geoLayer?.resetStyle(layer));
          layer.bindTooltip(UA_NAMES[key] ?? (f.properties as any)?.shapeName ?? "", { sticky: true, direction: "top" });
        },
      }).addTo(this.map);
      console.log(`[map] geojson OK (${usedUrl}), областей: ${matched}`);
      if (matched === 0) { console.warn("[map] 0 областей → fallback маркери"); this.buildFallbackMarkers(); }
    } else {
      console.warn("[map] усі дзеркала впали → fallback маркери");
      this.buildFallbackMarkers();
    }

    if (this.regionMap.size) this.applyRegions();
  }

  private buildFallbackMarkers() {
    this.useFallback = true;
    for (const key of Object.keys(REGION_CENTERS)) {
      const m = L.circleMarker(REGION_CENTERS[key], { radius: 13, weight: 2 }).addTo(this.map);
      m.on("click", () => this.onSelect(key));
      m.on("mouseover", () => m.setRadius(17));
      m.on("mouseout", () => m.setRadius(13));
      m.bindTooltip(UA_NAMES[key] ?? key, { direction: "top" });
      this.markers.set(key, m);
    }
  }

  private styleFor(key: string | null): L.PathOptions {
    const r = key ? this.regionMap.get(key) : undefined;
    const active = r?.active ?? false;
    const alert = r?.alert ?? false;
    if (!active) return { color: "#33455f", weight: 1, fillColor: "#16223a", fillOpacity: 0.42 };
    if (alert)   return { color: "#ff6b6b", weight: 2.5, fillColor: "#ff2d2d", fillOpacity: 0.55 };
    return { color: "#2ee6a6", weight: 1.5, fillColor: "#2ee6a6", fillOpacity: 0.22 };
  }

  private markerStyle(key: string) {
    const r = this.regionMap.get(key);
    const active = r?.active ?? false;
    const alert = r?.alert ?? false;
    if (!active) return { color: "#33455f", fillColor: "#16223a", fillOpacity: 0.5, opacity: 0.7 };
    if (alert)   return { color: "#ff6b6b", fillColor: "#ff2d2d", fillOpacity: 0.7, opacity: 1 };
    return { color: "#2ee6a6", fillColor: "#2ee6a6", fillOpacity: 0.45, opacity: 1 };
  }

  private applyRegions() {
    if (this.geoLayer && !this.useFallback) this.geoLayer.setStyle((f) => this.styleFor(matchFeature((f as any)?.properties)));
    if (this.useFallback) {
      for (const [key, m] of this.markers) {
        m.setStyle(this.markerStyle(key));
        const r = this.regionMap.get(key);
        const el = (m as any)._path as SVGElement | undefined;
        if (el) el.classList.toggle("pulse", !!(r?.alert && r?.active));
      }
    }
  }

  render(regions: Region[]) {
    this.regionMap = new Map(regions.map((r) => [r.key, r]));
    this.applyRegions();
  }

  setHighlight(toponymKey: string | null) {
    this.highlight.clearLayers();
    if (!toponymKey) return;
    const meta = TOPONYM_CENTERS[toponymKey];
    if (!meta) return;
    this.highlight.addLayer(L.circleMarker(meta.coord, { radius: 16, color: "#35c4ff", weight: 2, fillColor: "#35c4ff", fillOpacity: 0.18, className: "topo-pulse" }));
    this.highlight.addLayer(L.circleMarker(meta.coord, { radius: 5, color: "#fff", weight: 1.5, fillColor: "#35c4ff", fillOpacity: 0.9 }));
  }

  flyToponym(toponymKey: string | null) {
    if (!toponymKey) return;
    const meta = TOPONYM_CENTERS[toponymKey];
    if (!meta) return;
    this.map.flyTo(meta.coord, 9, { duration: 0.8 });
    this.setHighlight(toponymKey);
  }
}
