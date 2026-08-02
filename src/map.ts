import L from "leaflet";
import type { Region } from "./types";
import { REGION_CENTERS } from "./data/region-centers";

export class ThreatMap {
  private map: L.Map;
  private markers = new Map<string, L.CircleMarker>();
  private onSelect: (key: string) => void;

  constructor(el: string, onSelect: (key: string) => void) {
    this.onSelect = onSelect;
    this.map = L.map(el, { zoomControl: true, attributionControl: false }).setView([48.8, 31.5], 6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 12, minZoom: 5,
    }).addTo(this.map);
  }

  render(regions: Region[]) {
    for (const r of regions) {
      const center = REGION_CENTERS[r.key];
      if (!center) continue;

      const color = !r.active ? "#3a4a63"      // сірий (не підключено)
                  : r.alert ? "#ff3b3b"        // червоний (тривога)
                  : "#2ee6a6";                 // зелений (чисто)

      let m = this.markers.get(r.key);
      if (!m) {
        m = L.circleMarker(center, { radius: 12, weight: 2 }).addTo(this.map);
        m.on("click", () => this.onSelect(r.key));
        this.markers.set(r.key, m);
      }
      m.setStyle({
        color,
        fillColor: color,
        fillOpacity: r.alert && r.active ? 0.55 : 0.25,
        opacity: r.active ? 1 : 0.5,
      });
      m.bindTooltip(
        `${r.name_uk}${r.active ? "" : " · у черзі"}${r.alert ? " · 🔴 ТРИВОГА" : ""}`,
        { direction: "top" }
      );

      // Пульс для активних регіонів під тривогою
      const el = (m as any)._path as SVGElement | undefined;
      if (el) el.classList.toggle("pulse", r.alert && r.active);
    }
  }
}
