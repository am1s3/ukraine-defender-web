import L from "leaflet";
import type { Region } from "./types";
import { TOPONYM_CENTERS } from "./data/toponym-centers";

const GEOJSON_URLS = [
  "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson",
  "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson",
];

function matchKey(shapeName: string): string | null {
  const low = (shapeName || "").toLowerCase();
  if (low.includes("kyiv") || low.includes("kiev") || low.includes("kyyiv")) {
    return low.includes("oblast") || low.includes("kyyivs") ? "kyiv_oblast" : "kyiv_city";
  }
  const MAP: [string, string[]][] = [
    ["cherkasy", ["cherkas"]], ["chernihiv", ["chernih"]], ["chernivtsi", ["cherniv"]],
    ["dnipro", ["dniprop"]], ["donetsk", ["donets"]], ["ivano_frankivsk", ["ivano"]],
    ["kharkiv", ["kharkiv"]], ["kherson", ["kherson"]], ["khmelnytskyi", ["khmel"]],
    ["kirovohrad", ["kirovoh"]], ["luhansk", ["luhans"]], ["lviv", ["lviv"]],
    ["mykolaiv", ["mykola"]], ["odesa", ["odes", "odessa"]], ["poltava", ["poltav"]],
    ["rivne", ["rivne", "rovno"]], ["sumy", ["sumy"]], ["ternopil", ["ternop"]],
    ["zakarpattia", ["zakarp", "transcarpath"]], ["vinnytsia", ["vinny"]],
    ["volyn", ["volyn"]], ["zaporizhzhia", ["zaporiz"]], ["zhytomyr", ["zhytom"]],
  ];
  for (const [key, pats] of MAP) if (pats.some((p) => low.includes(p))) return key;
  return null;
}

export class ThreatMap {
  private map: L.Map;
  private geoLayer: L.GeoJSON | null = null;
  private regionMap = new Map<string, Region>();
  private highlight: L.LayerGroup = L.layerGroup();
  private onSelect: (key: string) => void;

  constructor(el: string, onSelect: (key: string) => void) {
    this.onSelect = onSelect;
    this.map = L.map(el, { zoomControl: true, attributionControl: false }).setView([48.8, 31.5], 6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 12, minZoom: 5,
    }).addTo(this.map);
    this.highlight.addTo(this.map);
    this.loadGeo();
  }

  private async loadGeo() {
    let geojson: unknown = null;
    for (const url of GEOJSON_URLS) {
      try {
        const r = await fetch(url);
        if (r.ok) { geojson = await r.json(); break; }
      } catch { /* наступне джерело */ }
    }
    if (!geojson) { console.error("geojson не завантажено"); return; }

    this.geoLayer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
      style: (f) => this.styleFor(f),
      onEachFeature: (f, layer) => {
        const key = matchKey((f.properties as any)?.shapeName);
        if (!key) return;
        layer.on("click", () => this.onSelect(key));
        layer.on("mouseover", () => { (layer as L.Path).setStyle({ weight: 3 }); });
        layer.on("mouseout", () => { this.geoLayer?.resetStyle(layer); });
        const r = this.regionMap.get(key);
        layer.bindTooltip(r ? r.name_uk : (f.properties as any).shapeName, { sticky: true, direction: "top" });
      },
    }).addTo(this.map);

    if (this.regionMap.size) this.geoLayer.setStyle((f) => this.styleFor(f));
  }

  private styleFor(f: any): L.PathOptions {
    const key = matchKey(f?.properties?.shapeName);
    const r = key ? this.regionMap.get(key) : undefined;
    const active = r?.active ?? false;
    const alert = r?.alert ?? false;
    if (!active) return { color: "#33455f", weight: 1, fillColor: "#16223a", fillOpacity: 0.4 };
    if (alert)   return { color: "#ff6b6b", weight: 2, fillColor: "#ff2d2d", fillOpacity: 0.5 };
    return { color: "#2ee6a6", weight: 1.5, fillColor: "#2ee6a6", fillOpacity: 0.2 };
  }

  render(regions: Region[]) {
    this.regionMap = new Map(regions.map((r) => [r.key, r]));
    if (this.geoLayer) this.geoLayer.setStyle((f) => this.styleFor(f));
  }

  // Підсвітка топоніма при hover рядка стрічки
  setHighlight(toponymKey: string | null) {
    this.highlight.clearLayers();
    if (!toponymKey) return;
    const meta = TOPONYM_CENTERS[toponymKey];
    if (!meta) return;
    const pulse = L.circleMarker(meta.coord, {
      radius: 16, color: "#35c4ff", weight: 2, fillColor: "#35c4ff", fillOpacity: 0.18,
      className: "topo-pulse",
    });
    const dot = L.circleMarker(meta.coord, {
      radius: 5, color: "#fff", weight: 1.5, fillColor: "#35c4ff", fillOpacity: 0.9,
    });
    this.highlight.addLayer(pulse);
    this.highlight.addLayer(dot);
  }

  // Камера летить у топонім при кліку на рядок
  flyToponym(toponymKey: string | null) {
    if (!toponymKey) return;
    const meta = TOPONYM_CENTERS[toponymKey];
    if (!meta) return;
    this.map.flyTo(meta.coord, 9, { duration: 0.8 });
    this.setHighlight(toponymKey);
  }
}
