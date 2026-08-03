// ============================================================
// Ukraine Defender — map.ts
// FULL FILE
//
// - Leaflet;
// - Крим = жовто-синій прапор (pattern);
// - тривога = червона штриховка;
// - немає тривоги = НЕ позначаємо нічим;
// - траєкторії увімкнені за замовчуванням, без кнопки;
// - SVG-іконки замість емодзі;
// - TTL старих цілей.
// ============================================================

import L from "leaflet";

import type { Region, ThreatEvent, ThreatType } from "./types";

import { TOPONYM_CENTERS } from "./data/toponym-centers";

import {
  LAUNCH_CENTERS,
  SPEED_KMH,
  TYPE_COLOR,
  TYPE_ICON,
  TYPE_DUR
} from "./data/launch-points";

// ============================================================
// GEOJSON SOURCES
// ============================================================

const GEOJSON_URLS = [
  "/ukraine.geojson",
  "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson",
  "https://cdn.jsdelivr.net/gh/codeforgermany/click_that_hood@main/public/data/ukraine.geojson",
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/ukraine.geojson",
  "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_UKR_1.json"
];

// ============================================================
// ISO / REGION MAP
// ============================================================

const ISO_MAP: Record<string, string> = {
  "UA-71": "cherkasy",
  "UA-74": "chernihiv",
  "UA-77": "chernivtsi",
  "UA-12": "dnipro",
  "UA-14": "donetsk",
  "UA-26": "ivano_frankivsk",
  "UA-63": "kharkiv",
  "UA-65": "kherson",
  "UA-68": "khmelnytskyi",
  "UA-35": "kirovohrad",
  "UA-30": "kyiv_city",
  "UA-32": "kyiv_oblast",
  "UA-09": "luhansk",
  "UA-46": "lviv",
  "UA-48": "mykolaiv",
  "UA-51": "odesa",
  "UA-53": "poltava",
  "UA-56": "rivne",
  "UA-59": "sumy",
  "UA-61": "ternopil",
  "UA-04": "vinnytsia",
  "UA-07": "volyn",
  "UA-21": "zakarpattia",
  "UA-23": "zaporizhzhia",
  "UA-18": "zhytomyr",
  "UA-43": "crimea",
  "UA-40": "crimea"
};

const REGION_CENTERS: Record<string, [number, number]> = {
  vinnytsia: [49.23, 28.47],
  volyn: [50.75, 25.33],
  dnipro: [48.46, 35.05],
  donetsk: [48.02, 37.8],
  zhytomyr: [50.25, 28.66],
  zakarpattia: [48.62, 22.3],
  zaporizhzhia: [47.84, 35.14],
  ivano_frankivsk: [48.92, 24.71],
  kyiv_oblast: [50.05, 30.78],
  kirovohrad: [48.51, 32.26],
  luhansk: [48.57, 39.33],
  lviv: [49.84, 24.03],
  mykolaiv: [46.97, 31.99],
  odesa: [46.48, 30.72],
  poltava: [49.59, 34.55],
  rivne: [50.62, 26.25],
  sumy: [50.91, 34.8],
  ternopil: [49.55, 25.59],
  kharkiv: [49.99, 36.23],
  kherson: [46.64, 32.62],
  khmelnytskyi: [49.42, 26.99],
  cherkasy: [49.44, 32.06],
  chernivtsi: [48.29, 25.94],
  chernihiv: [51.49, 31.29],
  kyiv_city: [50.45, 30.52],
  crimea: [45.3, 34.0]
};

const UA_NAMES: Record<string, string> = {
  vinnytsia: "Вінницька",
  volyn: "Волинська",
  dnipro: "Дніпропетровська",
  donetsk: "Донецька",
  zhytomyr: "Житомирська",
  zakarpattia: "Закарпатська",
  zaporizhzhia: "Запорізька",
  ivano_frankivsk: "Івано-Франківська",
  kyiv_oblast: "Київська область",
  kirovohrad: "Кіровоградська",
  luhansk: "Луганська",
  lviv: "Львівська",
  mykolaiv: "Миколаївська",
  odesa: "Одеська",
  poltava: "Полтавська",
  rivne: "Рівненська",
  sumy: "Сумська",
  ternopil: "Тернопільська",
  kharkiv: "Харківська",
  kherson: "Херсонська",
  khmelnytskyi: "Хмельницька",
  cherkasy: "Черкаська",
  chernivtsi: "Чернівецька",
  chernihiv: "Чернігівська",
  kyiv_city: "Київ",
  crimea: "Крим · це Україна"
};

// ============================================================
// MATCHING
// ============================================================

function matchByName(raw: string): string | null {
  const low = (raw || "").toLowerCase();

  if (!low) return null;

  const TABLE: Array<[string, string[]]> = [
    ["crimea", ["crimea", "крим", "севастопол", "ар крим"]],
    ["kyiv_city", ["kyiv city", "kiev city", "kyyiv city", "місто київ", "м. київ", "м київ", "kyiv municipality"]],
    ["kyiv_oblast", ["kyiv oblast", "kiev oblast", "kyyivs", "київськ", "київщин"]],
    ["cherkasy", ["cherkas", "черкаськ"]],
    ["chernihiv", ["chernih", "чернігівськ"]],
    ["chernivtsi", ["cherniv", "чернівецьк"]],
    ["dnipro", ["dniprop", "дніпропетровськ"]],
    ["donetsk", ["donets", "донецьк"]],
    ["ivano_frankivsk", ["ivano", "івано-франк"]],
    ["kharkiv", ["kharkiv", "харківськ"]],
    ["kherson", ["kherson", "херсонськ"]],
    ["khmelnytskyi", ["khmel", "хмельницьк"]],
    ["kirovohrad", ["kirovoh", "кіровоградськ"]],
    ["luhansk", ["luhans", "луганськ"]],
    ["lviv", ["lviv", "l'viv", "львівськ"]],
    ["mykolaiv", ["mykola", "миколаївськ"]],
    ["odesa", ["odes", "odessa", "одеськ"]],
    ["poltava", ["poltav", "полтавськ"]],
    ["rivne", ["rivne", "rovno", "рівненськ"]],
    ["sumy", ["sumy", "сумськ"]],
    ["ternopil", ["ternop", "тернопільськ"]],
    ["zakarpattia", ["zakarp", "transcarpath", "закарпатськ"]],
    ["vinnytsia", ["vinny", "вінницьк"]],
    ["volyn", ["volyn", "волинськ"]],
    ["zaporizhzhia", ["zaporiz", "запорізьк"]],
    ["zhytomyr", ["zhytom", "житомирськ"]]
  ];

  for (const [key, pats] of TABLE) {
    if (pats.some((p) => low.includes(p))) return key;
  }

  return null;
}

function matchFeature(props: any): string | null {
  if (!props) return null;

  const iso =
    props.shapeISO ||
    props.iso ||
    props.iso_3166_2 ||
    props.ISO_3166_2 ||
    props.id;

  if (typeof iso === "string") {
    const up = iso.toUpperCase();

    if (ISO_MAP[up]) return ISO_MAP[up];

    const m = up.match(/UA-?(\d{1,2})/);

    if (m && ISO_MAP[`UA-${m[1].padStart(2, "0")}`]) {
      return ISO_MAP[`UA-${m[1].padStart(2, "0")}`];
    }
  }

  const candidates = [
    props.shapeName,
    props.name,
    props.NAME_1,
    props.NAME_2,
    props.ua,
    props.ukr,
    props.VARNAME_1
  ];

  for (const c of candidates) {
    const k = matchByName(String(c || ""));

    if (k) return k;
  }

  return null;
}

// ============================================================
// GEO HELPERS
// ============================================================

function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;

  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

function etaLabel(type: ThreatType, km: number): string {
  const speed = SPEED_KMH[type] || 500;

  const min = Math.round((km / speed) * 60);

  if (min < 60) return `~${min} хв`;

  const h = Math.floor(min / 60);

  return `~${h} год ${min % 60} хв`;
}

function arcPoints(
  a: [number, number],
  b: [number, number],
  segments = 26,
  curvature = 0.18
): [number, number][] {
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];

  const dist = Math.hypot(dx, dy) || 1;

  const mx = (a[1] + b[1]) / 2;
  const my = (a[0] + b[0]) / 2;

  const nx = -dy / dist;
  const ny = dx / dist;

  const cx = mx + nx * dist * curvature;
  const cy = my + ny * dist * curvature;

  const pts: [number, number][] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    const lat =
      (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cy + t * t * b[0];

    const lng =
      (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cx + t * t * b[1];

    pts.push([lat, lng]);
  }

  return pts;
}

// ============================================================
// TRAJECTORY TTL
// ============================================================

const TRAJ_TTL_MIN: Record<ThreatType, number> = {
  ballistic: 20,
  cruise: 30,
  shahed: 90,
  kab: 30,
  aviation: 40,
  recon: 30,
  unknown: 30
};

function isEventFresh(e: ThreatEvent): boolean {
  const ts = e.source?.ts;

  if (!ts) return true;

  const time = Date.parse(ts);

  if (!Number.isFinite(time)) return true;

  const ttlMin = TRAJ_TTL_MIN[e.threat_type] ?? 30;

  const ageMin = (Date.now() - time) / 60000;

  return ageMin <= ttlMin;
}

// ============================================================
// SVG DEFS (hatch + crimea flag)
// ============================================================

function injectSvgDefs(): void {
  if (typeof document === "undefined") return;

  if (document.getElementById("ud-svg-defs")) return;

  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );

  svg.setAttribute("id", "ud-svg-defs");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.style.pointerEvents = "none";

  svg.innerHTML = `
    <defs>
      <pattern
        id="ud-alert-hatch"
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="8" height="8" fill="rgba(255,45,45,0.10)"></rect>
        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,45,45,0.75)" stroke-width="3"></line>
      </pattern>

      <pattern
        id="ud-crimea-flag"
        patternUnits="objectBoundingBox"
        width="1"
        height="1"
      >
        <rect x="0" y="0" width="1" height="0.5" fill="#0057b7"></rect>
        <rect x="0" y="0.5" width="1" height="0.5" fill="#ffd700"></rect>
      </pattern>
    </defs>
  `;

  document.body.appendChild(svg);
}

// ============================================================
// THREAT MAP
// ============================================================

export class ThreatMap {
  private map: L.Map;

  private geoLayer: L.GeoJSON | null = null;

  private markers = new Map<string, L.CircleMarker>();

  private regionMap = new Map<string, Region>();

  private hoverLayer: L.LayerGroup = L.layerGroup();

  private pinLayer: L.LayerGroup = L.layerGroup();

  private pinnedKey: string | null = null;

  private trajLayer: L.LayerGroup = L.layerGroup();

  private trajEnabled = true;

  private lastTrajKey = "";

  private lastEvents: ThreatEvent[] = [];

  private useFallback = false;

  private onSelect: (key: string) => void;

  constructor(el: string, onSelect: (key: string) => void) {
    this.onSelect = onSelect;

    injectSvgDefs();

    this.map = L.map(el, {
      zoomControl: true,
      attributionControl: false,
      worldCopyJump: true
    }).setView([49.0, 31.5], 6);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 12,
      minZoom: 4,
      subdomains: "abcd"
    }).addTo(this.map);

    this.hoverLayer.addTo(this.map);
    this.pinLayer.addTo(this.map);
    this.trajLayer.addTo(this.map);

    this.loadGeo();
  }

  // ----------------------------------------------------------
  // MARKERS
  // ----------------------------------------------------------

  private drawMarkerInto(
    layer: L.LayerGroup,
    coord: [number, number],
    pinned: boolean
  ): void {
    layer.addLayer(
      L.circleMarker(coord, {
        radius: pinned ? 18 : 16,
        color: pinned ? "#ffd700" : "#35c4ff",
        weight: 2,
        fillColor: pinned ? "#ffd700" : "#35c4ff",
        fillOpacity: 0.18,
        className: "topo-pulse"
      })
    );

    layer.addLayer(
      L.circleMarker(coord, {
        radius: 5,
        color: "#fff",
        weight: 1.5,
        fillColor: pinned ? "#ffd700" : "#35c4ff",
        fillOpacity: 0.9
      })
    );
  }

  setHighlight(toponymKey: string | null): void {
    this.hoverLayer.clearLayers();

    if (!toponymKey) return;

    if (toponymKey === this.pinnedKey) return;

    const meta = TOPONYM_CENTERS[toponymKey];

    if (!meta) return;

    this.drawMarkerInto(this.hoverLayer, meta.coord, false);
  }

  flyToponym(toponymKey: string | null): void {
    if (!toponymKey) return;

    const meta = TOPONYM_CENTERS[toponymKey];

    if (!meta) return;

    this.pinnedKey = toponymKey;

    this.pinLayer.clearLayers();

    this.drawMarkerInto(this.pinLayer, meta.coord, true);

    this.hoverLayer.clearLayers();

    this.map.flyTo(meta.coord, 9, { duration: 0.8 });
  }

  clearPin(): void {
    this.pinnedKey = null;

    this.pinLayer.clearLayers();
  }

  // ----------------------------------------------------------
  // TRAJECTORIES
  // ----------------------------------------------------------

  setTrajectories(events: ThreatEvent[]): void {
    this.lastEvents = events;

    if (this.trajEnabled) {
      this.drawTrajectories();
    }
  }

  private trajSignature(events: ThreatEvent[]): string {
    return events
      .filter((e) => e.launch_key && e.toponym_key)
      .map((e) => `${e.threat_type}|${e.launch_key}|${e.toponym_key}`)
      .sort()
      .join(";");
  }

  private drawTrajectories(): void {
    if (!this.trajEnabled) return;

    const fresh = this.lastEvents.filter(
      (e) => e.launch_key && e.toponym_key && isEventFresh(e)
    );

    const sig = this.trajSignature(fresh);

    if (sig === this.lastTrajKey) return;

    this.lastTrajKey = sig;

    this.trajLayer.clearLayers();

    const seenLaunch = new Set<string>();

    for (const e of fresh) {
      const src = LAUNCH_CENTERS[e.launch_key as string];
      const dst = TOPONYM_CENTERS[e.toponym_key as string];

      if (!src || !dst) continue;

      const color = TYPE_COLOR[e.threat_type] || TYPE_COLOR.unknown;
      const dur = TYPE_DUR[e.threat_type] || TYPE_DUR.unknown;

      const pts = arcPoints(src.coord, dst.coord);

      const line = L.polyline(pts, {
        color,
        weight: 2.5,
        opacity: 0.9,
        dashArray: "6 10",
        className: `trajectory trajectory--${e.threat_type}`
      }).addTo(this.trajLayer);

      line.bindTooltip(
        `${e.threat_type} · ${src.name} → ${dst.name}`,
        { sticky: true }
      );

      const pathEl = (line as any)._path as SVGElement | undefined;

      if (pathEl) {
        pathEl.style.setProperty("--dur", dur);
      }

      const km = distanceKm(src.coord, dst.coord);

      const mid = pts[Math.floor(pts.length / 2)];

      L.marker(mid, {
        interactive: false,
        icon: L.divIcon({
          className: "eta-wrap",
          html: `<span style="color:${color};display:inline-flex;gap:4px;align-items:center;">${TYPE_ICON[e.threat_type]}<span class="eta">${etaLabel(e.threat_type, km)}</span></span>`,
          iconSize: [0, 0]
        })
      }).addTo(this.trajLayer);

      const a = pts[Math.floor(pts.length * 0.8)];
      const b = pts[Math.floor(pts.length * 0.9)];

      const dLng = (b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180);
      const dLat = b[0] - a[0];

      const deg = (Math.atan2(-dLat, dLng) * 180) / Math.PI;

      L.marker(b, {
        interactive: false,
        icon: L.divIcon({
          className: "eta-wrap",
          html: `<svg width="16" height="16" viewBox="0 0 16 16" style="transform: rotate(${deg}deg); display:block;"><path d="M0,0 L16,8 L0,16 z" fill="${color}"></path></svg>`,
          iconSize: [0, 0]
        })
      }).addTo(this.trajLayer);

      if (!seenLaunch.has(e.launch_key as string)) {
        seenLaunch.add(e.launch_key as string);

        L.circleMarker(src.coord, {
          radius: 8,
          color: "#ff7a18",
          weight: 2,
          fillColor: "#ff2d2d",
          fillOpacity: 0.7,
          className: "emitter"
        })
          .addTo(this.trajLayer)
          .bindTooltip(`${src.name} · ${src.carrier}`, {
            direction: "top"
          });
      }
    }
  }

  // ----------------------------------------------------------
  // REGION STYLES
  // ----------------------------------------------------------

  private styleFor(key: string | null): L.PathOptions {
    if (key === "crimea") {
      return {
        color: "#0057b7",
        weight: 2,
        fillColor: "url(#ud-crimea-flag)",
        fillOpacity: 0.85
      };
    }

    const r = key ? this.regionMap.get(key) : undefined;

    const alert = r?.alert ?? false;

    if (alert) {
      return {
        color: "#ff5a5a",
        weight: 2,
        fillColor: "url(#ud-alert-hatch)",
        fillOpacity: 1
      };
    }

    // Немає тривоги — НЕ позначаємо нічим.
    return {
      color: "#33455f",
      weight: 1,
      fillColor: "#16223a",
      fillOpacity: 0
    };
  }

  private markerStyle(key: string): L.PathOptions {
    if (key === "crimea") {
      return {
        color: "#0057b7",
        fillColor: "#ffd700",
        fillOpacity: 0.8,
        opacity: 1
      };
    }

    const r = this.regionMap.get(key);

    const alert = r?.alert ?? false;

    if (alert) {
      return {
        color: "#ff5a5a",
        fillColor: "#ff2d2d",
        fillOpacity: 0.5,
        opacity: 1
      };
    }

    return {
      color: "#33455f",
      fillColor: "#16223a",
      fillOpacity: 0,
      opacity: 0.7
    };
  }

  private applyRegions(): void {
    if (this.geoLayer && !this.useFallback) {
      this.geoLayer.setStyle((f) =>
        this.styleFor(matchFeature((f as any)?.properties))
      );
    }

    if (this.useFallback) {
      for (const [key, m] of this.markers) {
        m.setStyle(this.markerStyle(key));

        const r = this.regionMap.get(key);

        const el = (m as any)._path as SVGElement | undefined;

        if (el) {
          el.classList.toggle("pulse", !!r?.alert);
        }
      }
    }
  }

  render(regions: Region[]): void {
    this.regionMap = new Map(regions.map((r) => [r.key, r]));

    this.applyRegions();

    if (this.trajEnabled) {
      this.drawTrajectories();
    }
  }

  // ----------------------------------------------------------
  // GEO LOAD
  // ----------------------------------------------------------

  private async loadGeo(): Promise<void> {
    let geojson: any = null;

    let usedUrl = "";

    for (const url of GEOJSON_URLS) {
      try {
        const r = await fetch(url);

        if (!r.ok) {
          console.warn(`[map] ${url} → HTTP ${r.status}`);
          continue;
        }

        const data = await r.json();

        const feats = data?.features ?? [];

        if (Array.isArray(feats) && feats.length > 0) {
          geojson = data;
          usedUrl = url;
          break;
        }

        console.warn(`[map] ${url} → немає features`);
      } catch (e) {
        console.warn(`[map] ${url} → помилка`, e);
      }
    }

    if (geojson) {
      let matched = 0;

      this.geoLayer = L.geoJSON(geojson as any, {
        style: (f) => this.styleFor(matchFeature((f as any)?.properties)),
        onEachFeature: (f, layer) => {
          const key = matchFeature((f as any)?.properties);

          if (!key) return;

          matched++;

          layer.on("click", () => this.onSelect(key));

          layer.on("mouseover", () =>
            (layer as L.Path).setStyle({ weight: 3 })
          );

          layer.on("mouseout", () => this.geoLayer?.resetStyle(layer));

          layer.bindTooltip(
            UA_NAMES[key] ?? (f.properties as any)?.shapeName ?? "",
            { sticky: true, direction: "top" }
          );
        }
      }).addTo(this.map);

      console.log(`[map] geojson OK (${usedUrl}), областей: ${matched}`);

      if (matched === 0) {
        console.warn("[map] 0 областей → fallback маркери");
        this.buildFallbackMarkers();
      }
    } else {
      console.warn("[map] усі джерела впали → fallback маркери");
      this.buildFallbackMarkers();
    }

    if (this.regionMap.size) {
      this.applyRegions();
    }
  }

  private buildFallbackMarkers(): void {
    this.useFallback = true;

    for (const key of Object.keys(REGION_CENTERS)) {
      const m = L.circleMarker(REGION_CENTERS[key], {
        radius: 13,
        weight: 2
      }).addTo(this.map);

      m.on("click", () => this.onSelect(key));

      m.on("mouseover", () => m.setRadius(17));

      m.on("mouseout", () => m.setRadius(13));

      m.bindTooltip(UA_NAMES[key] ?? key, { direction: "top" });

      this.markers.set(key, m);
    }
  }
}
