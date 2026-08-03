import L from "leaflet";
import type { Region, ThreatEvent } from "./types";

// ============================================================
// ЦВЕТА РЕГИОНОВ
// ============================================================

const REGION_COLORS = {
  calm: { fill: "#1e3a5f", stroke: "#35c4ff", opacity: 0.5 },
  alert: { fill: "#ff3b3b", stroke: "#ff6b6b", opacity: 0.8 },
  hover: { fill: "#35c4ff", stroke: "#ffd700", opacity: 0.6 }
};

// ============================================================
// GEOJSON ГРАНИЦЫ ОБЛАСТЕЙ УКРАИНЫ (упрощённые полигоны)
// ============================================================

const UKRAINE_REGIONS_GEOJSON: any = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { key: "kyiv_city", name: "Київ" },
      geometry: {
        type: "Polygon",
        coordinates: [[[30.35, 50.55], [30.65, 50.55], [30.65, 50.35], [30.35, 50.35], [30.35, 50.55]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "kyiv_oblast", name: "Київська область" },
      geometry: {
        type: "Polygon",
        coordinates: [[[29.5, 51.0], [31.5, 51.0], [31.5, 49.8], [29.5, 49.8], [29.5, 51.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "vinnytsia", name: "Вінницька" },
      geometry: {
        type: "Polygon",
        coordinates: [[[27.5, 49.8], [29.5, 49.8], [29.5, 48.5], [27.5, 48.5], [27.5, 49.8]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "volyn", name: "Волинська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[23.5, 51.8], [25.5, 51.8], [25.5, 50.5], [23.5, 50.5], [23.5, 51.8]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "dnipro", name: "Дніпропетровська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[33.5, 49.0], [36.5, 49.0], [36.5, 47.5], [33.5, 47.5], [33.5, 49.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "donetsk", name: "Донецька" },
      geometry: {
        type: "Polygon",
        coordinates: [[[36.5, 49.0], [39.0, 49.0], [39.0, 47.0], [36.5, 47.0], [36.5, 49.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "zhytomyr", name: "Житомирська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[27.5, 51.5], [30.0, 51.5], [30.0, 50.0], [27.5, 50.0], [27.5, 51.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "zakarpattia", name: "Закарпатська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[22.0, 49.0], [24.5, 49.0], [24.5, 48.0], [22.0, 48.0], [22.0, 49.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "zaporizhzhia", name: "Запорізька" },
      geometry: {
        type: "Polygon",
        coordinates: [[[34.5, 48.0], [37.0, 48.0], [37.0, 46.5], [34.5, 46.5], [34.5, 48.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "ivano_frankivsk", name: "Івано-Франківська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[23.5, 49.5], [25.5, 49.5], [25.5, 48.5], [23.5, 48.5], [23.5, 49.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "kirovohrad", name: "Кіровоградська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[30.5, 49.5], [33.5, 49.5], [33.5, 48.0], [30.5, 48.0], [30.5, 49.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "luhansk", name: "Луганська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[37.5, 49.5], [40.0, 49.5], [40.0, 48.0], [37.5, 48.0], [37.5, 49.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "lviv", name: "Львівська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[23.0, 50.5], [25.0, 50.5], [25.0, 49.5], [23.0, 49.5], [23.0, 50.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "mykolaiv", name: "Миколаївська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[30.5, 48.0], [33.0, 48.0], [33.0, 46.5], [30.5, 46.5], [30.5, 48.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "odesa", name: "Одеська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[28.5, 48.0], [31.5, 48.0], [31.5, 45.5], [28.5, 45.5], [28.5, 48.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "poltava", name: "Полтавська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[31.5, 50.5], [35.0, 50.5], [35.0, 49.0], [31.5, 49.0], [31.5, 50.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "rivne", name: "Рівненська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[25.5, 51.5], [27.5, 51.5], [27.5, 50.5], [25.5, 50.5], [25.5, 51.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "sumy", name: "Сумська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[32.5, 52.0], [35.5, 52.0], [35.5, 50.5], [32.5, 50.5], [32.5, 52.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "ternopil", name: "Тернопільська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[24.5, 50.0], [26.5, 50.0], [26.5, 49.0], [24.5, 49.0], [24.5, 50.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "kharkiv", name: "Харківська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[34.5, 51.0], [38.0, 51.0], [38.0, 49.0], [34.5, 49.0], [34.5, 51.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "kherson", name: "Херсонська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[32.5, 47.5], [35.5, 47.5], [35.5, 45.5], [32.5, 45.5], [32.5, 47.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "khmelnytskyi", name: "Хмельницька" },
      geometry: {
        type: "Polygon",
        coordinates: [[[25.5, 50.5], [28.0, 50.5], [28.0, 49.0], [25.5, 49.0], [25.5, 50.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "cherkasy", name: "Черкаська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[30.5, 50.0], [33.5, 50.0], [33.5, 48.5], [30.5, 48.5], [30.5, 50.0]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "chernivtsi", name: "Чернівецька" },
      geometry: {
        type: "Polygon",
        coordinates: [[[24.5, 48.5], [26.5, 48.5], [26.5, 47.5], [24.5, 47.5], [24.5, 48.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "chernihiv", name: "Чернігівська" },
      geometry: {
        type: "Polygon",
        coordinates: [[[30.0, 52.5], [33.5, 52.5], [33.5, 51.0], [30.0, 51.0], [30.0, 52.5]]]
      }
    },
    {
      type: "Feature",
      properties: { key: "crimea", name: "Крим" },
      geometry: {
        type: "Polygon",
        coordinates: [[[32.5, 46.2], [36.5, 46.2], [36.5, 44.5], [32.5, 44.5], [32.5, 46.2]]]
      }
    }
  ]
};

// ============================================================
// THREAT MAP CLASS
// ============================================================

export class ThreatMap {
  private map: L.Map;
  private regionLayers: Map<string, L.GeoJSON> = new Map();
  private eventMarkers: L.LayerGroup;
  private onRegionClick: (key: string) => void;
  private hoveredRegion: string | null = null;

  constructor(container: string, onRegionClick: (key: string) => void) {
    this.onRegionClick = onRegionClick;

    this.map = L.map(container, {
      center: [49.0, 31.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
      minZoom: 5,
      maxZoom: 10
    });

    // Тёмный tile слой
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      maxZoom: 19
    }).addTo(this.map);

    this.eventMarkers = L.layerGroup().addTo(this.map);
    this.createRegionPolygons();
  }

  private createRegionPolygons() {
    for (const feature of UKRAINE_REGIONS_GEOJSON.features) {
      const key = feature.properties.key;
      
      const geoLayer = L.geoJSON(feature, {
        style: {
          color: REGION_COLORS.calm.stroke,
          fillColor: REGION_COLORS.calm.fill,
          fillOpacity: REGION_COLORS.calm.opacity,
          weight: 2
        },
        onEachFeature: (feat, layer) => {
          layer.on({
            click: () => this.onRegionClick(key),
            mouseover: (e) => {
              this.hoveredRegion = key;
              const target = e.target as L.Path;
              if (!this.isRegionAlert(key)) {
                target.setStyle({
                  color: REGION_COLORS.hover.stroke,
                  fillColor: REGION_COLORS.hover.fill,
                  fillOpacity: REGION_COLORS.hover.opacity,
                  weight: 3
                });
              }
            },
            mouseout: (e) => {
              this.hoveredRegion = null;
              const target = e.target as L.Path;
              if (!this.isRegionAlert(key)) {
                target.setStyle({
                  color: REGION_COLORS.calm.stroke,
                  fillColor: REGION_COLORS.calm.fill,
                  fillOpacity: REGION_COLORS.calm.opacity,
                  weight: 2
                });
              }
            }
          });
        }
      });

      geoLayer.addTo(this.map);
      this.regionLayers.set(key, geoLayer);
    }
  }

  private isRegionAlert(key: string): boolean {
    const layer = this.regionLayers.get(key);
    if (!layer) return false;
    
    // Проверяем текущий стиль
    const style = (layer as any).options?.style;
    return style?.fillColor === REGION_COLORS.alert.fill;
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
        weight: region.alert ? 3 : 2
      });

      // Пульсация для активных тривог
      layer.eachLayer((l: any) => {
        const el = l.getElement?.();
        if (el) {
          const htmlEl = el as HTMLElement;
          if (region.alert) {
            htmlEl.style.animation = "regionPulse 1.5s ease-in-out infinite";
            htmlEl.style.filter = "drop-shadow(0 0 8px rgba(255,59,59,0.8))";
          } else {
            htmlEl.style.animation = "none";
            htmlEl.style.filter = "none";
          }
        }
      });
    }
  }

  updateEvents(events: ThreatEvent[]) {
    this.eventMarkers.clearLayers();

    for (const event of events) {
      if (!event.toponym_key) continue;

      // Находим центр региона для маркера
      const feature = UKRAINE_REGIONS_GEOJSON.features.find(
        (f: any) => f.properties.key === event.toponym_key
      );
      if (!feature) continue;

      const coords = this.getPolygonCenter(feature.geometry.coordinates[0]);
      const icon = this.getEventIcon(event.threat_type);
      const marker = L.marker([coords[1], coords[0]], { icon })
        .bindPopup(this.getEventPopup(event));
      
      this.eventMarkers.addLayer(marker);
    }
  }

  private getPolygonCenter(coords: number[][]): [number, number] {
    let sumX = 0, sumY = 0;
    for (const [x, y] of coords) {
      sumX += x;
      sumY += y;
    }
    return [sumX / coords.length, sumY / coords.length];
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

  setHighlight(regionKey: string | null) {
    // Подсветка при hover из drawer
    if (regionKey) {
      const layer = this.regionLayers.get(regionKey);
      if (layer && !this.isRegionAlert(regionKey)) {
        layer.setStyle({
          color: REGION_COLORS.hover.stroke,
          weight: 3
        });
      }
    }
  }

  flyToponym(regionKey: string | null) {
    if (!regionKey) return;
    
    const feature = UKRAINE_REGIONS_GEOJSON.features.find(
      (f: any) => f.properties.key === regionKey
    );
    if (!feature) return;

    const coords = this.getPolygonCenter(feature.geometry.coordinates[0]);
    this.map.flyTo([coords[1], coords[0]], 8, { duration: 0.8 });
  }

  invalidateSize() {
    this.map.invalidateSize();
  }
}
