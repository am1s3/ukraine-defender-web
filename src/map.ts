import L from "leaflet";
import type { Region, ThreatEvent } from "./types";

// ============================================================
// ЦВЕТА РЕГИОНОВ
// ============================================================

const REGION_COLORS = {
  calm: { fill: "#1e3a5f", stroke: "#35c4ff", opacity: 0.4 },
  alert: { fill: "#ff3b3b", stroke: "#ff6b6b", opacity: 0.7 },
  unknown: { fill: "#2a2a3e", stroke: "#4a4a5e", opacity: 0.3 }
};

// ============================================================
// КООРДИНАТЫ ОБЛАСТНЫХ ЦЕНТРОВ
// ============================================================

const REGION_CENTERS: Record<string, [number, number]> = {
  kyiv_city: [50.4501, 30.5234],
  kyiv_oblast: [50.3500, 30.9000],
  vinnytsia: [49.2331, 28.4682],
  volyn: [50.7472, 25.3254],
  dnipro: [48.4647, 35.0462],
  donetsk: [48.0159, 37.8028],
  zhytomyr: [50.2547, 28.6587],
  zakarpattia: [48.6208, 22.3083],
  zaporizhzhia: [47.8388, 35.1396],
  ivano_frankivsk: [48.9226, 24.7111],
  kirovohrad: [48.5079, 32.2623],
  luhansk: [48.5740, 39.3078],
  lviv: [49.8397, 24.0297],
  mykolaiv: [46.9750, 31.9946],
  odesa: [46.4825, 30.7233],
  poltava: [49.5883, 34.5514],
  rivne: [50.6199, 26.2516],
  sumy: [50.9077, 34.7981],
  ternopil: [49.5535, 25.5948],
  kharkiv: [49.9935, 36.2304],
  kherson: [46.6354, 32.6169],
  khmelnytskyi: [49.4229, 26.9871],
  cherkasy: [49.4444, 32.0598],
  chernivtsi: [48.2920, 25.9358],
  chernihiv: [51.4982, 31.2893],
  crimea: [44.9521, 34.1024]
};

// ============================================================
// THREAT MAP CLASS
// ============================================================

export class ThreatMap {
  private map: L.Map;
  private regionLayers: Map<string, L.Circle> = new Map();
  private eventMarkers: L.LayerGroup;
  private onRegionClick: (key: string) => void;

  constructor(container: string, onRegionClick: (key: string) => void) {
    this.onRegionClick = onRegionClick;

    this.map = L.map(container, {
      center: [49.0, 31.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      maxZoom: 19
    }).addTo(this.map);

    this.eventMarkers = L.layerGroup().addTo(this.map);
    this.createRegionCircles();
  }

  private createRegionCircles() {
    for (const [key, coords] of Object.entries(REGION_CENTERS)) {
      const circle = L.circle(coords, {
        radius: 50000,
        color: REGION_COLORS.unknown.stroke,
        fillColor: REGION_COLORS.unknown.fill,
        fillOpacity: REGION_COLORS.unknown.opacity,
        weight: 2
      });

      circle.on("click", () => this.onRegionClick(key));
      circle.addTo(this.map);
      this.regionLayers.set(key, circle);
    }
  }

  // 🔥 ГЛАВНЫЙ МЕТОД: обновление цветов регионов по тривогам
  updateAlerts(regions: Region[]) {
    console.log(`[Map] Updating ${regions.length} regions, ${regions.filter(r => r.alert).length} alerts`);

    for (const region of regions) {
      const layer = this.regionLayers.get(region.key);
      if (!layer) continue;

      const colors = region.alert ? REGION_COLORS.alert : REGION_COLORS.calm;

      layer.setStyle({
        color: colors.stroke,
        fillColor: colors.fill,
        fillOpacity: colors.opacity,
        weight: region.alert ? 4 : 2
      });

      // Пульсация для активных тривог
      const el = layer.getElement();
      if (el) {
        const htmlEl = el as HTMLElement;
        if (region.alert) {
          htmlEl.style.animation = "regionPulse 1.5s ease-in-out infinite";
        } else {
          htmlEl.style.animation = "none";
        }
      }
    }
  }

  updateEvents(events: ThreatEvent[]) {
    this.eventMarkers.clearLayers();

    for (const event of events) {
      if (!event.toponym_key) continue;

      const coords = REGION_CENTERS[event.toponym_key];
      if (!coords) continue;

      const icon = this.getEventIcon(event.threat_type);
      const marker = L.marker(coords, { icon }).bindPopup(this.getEventPopup(event));
      this.eventMarkers.addLayer(marker);
    }
  }

  private getEventIcon(type: string): L.DivIcon {
    const emojis: Record<string, string> = {
      shahed: "🚁",
      ballistic: "🚀",
      cruise: "💫",
      kab: "💣",
      aviation: "✈️",
      recon: "👁",
      unknown: "⚠️"
    };

    return L.divIcon({
      html: `<div style="font-size: 24px; text-shadow: 0 0 8px rgba(255,59,59,0.8);">${emojis[type] || "⚠️"}</div>`,
      className: "event-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  private getEventPopup(event: ThreatEvent): string {
    return `
      <div style="font-family: monospace; font-size: 12px;">
        <b>${event.threat_type.toUpperCase()}</b>
        ${event.count ? ` • ${event.count} шт.` : ""}
        <br>
        ${event.text || "—"}
        <br>
        <small>${event.source.channel}</small>
      </div>
    `;
  }

  setHighlight(regionKey: string) {
    const layer = this.regionLayers.get(regionKey);
    if (layer) layer.setStyle({ weight: 5 });
  }

  flyToponym(regionKey: string) {
    const coords = REGION_CENTERS[regionKey];
    if (coords) this.map.flyTo(coords, 8, { duration: 0.8 });
  }

  invalidateSize() {
    this.map.invalidateSize();
  }
}
