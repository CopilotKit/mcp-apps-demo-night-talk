import { ModelContext, useToolContext } from "mcp-use/react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import "../styles.css";
import type { MapState, Marker } from "./schema";

const COLORS: Record<NonNullable<Marker["color"]>, string> = {
  red: "#e74c3c", blue: "#3498db", green: "#2ecc71", orange: "#f39c12", purple: "#9b59b6",
};
const EMPTY_MAP: MapState = { center: { lat: 0, lng: 0 }, zoom: 2, markers: [] };

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export default function MapView() {
  const view = useToolContext<"show-map">();
  const map: MapState = view.status === "ready" ? view.toolOutput : EMPTY_MAP;
  const [selected, setSelected] = useState<Marker | null>(null);

  const container = useRef<HTMLDivElement>(null);
  const leaflet = useRef<{ map: L.Map; markers: L.LayerGroup } | null>(null);

  // Create the Leaflet map once, and keep it sized to the iframe the host gives us.
  useEffect(() => {
    if (!container.current || leaflet.current) return;
    const instance = L.map(container.current, { zoomControl: false, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(instance);
    leaflet.current = { map: instance, markers: L.layerGroup().addTo(instance) };
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(container.current);
    return () => { resize.disconnect(); instance.remove(); leaflet.current = null; };
  }, []);

  useEffect(() => {
    leaflet.current?.map.setView([map.center.lat, map.center.lng], map.zoom);
  }, [map.center.lat, map.center.lng, map.zoom]);

  useEffect(() => {
    const layer = leaflet.current?.markers;
    if (!layer) return;
    layer.clearLayers();
    for (const marker of map.markers) {
      const pin = L.circleMarker([marker.lat, marker.lng], {
        radius: 10, weight: 2, color: "#fff", fillOpacity: 0.85,
        fillColor: COLORS[marker.color ?? "blue"],
      });
      pin.bindPopup(`<div class="marker-popup"><strong>${escapeHtml(marker.title)}</strong>${marker.description ? `<span>${escapeHtml(marker.description)}</span>` : ""}</div>`);
      pin.on("mouseover", () => pin.openPopup());
      pin.on("mouseout", () => pin.closePopup());
      pin.on("click", () => setSelected(marker));
      layer.addLayer(pin);
    }
  }, [map.markers]);

  if (view.status === "error") return <div role="alert" style={{ padding: 16, color: "#c0392b" }}>{view.error.message}</div>;

  return <>
    {selected && <ModelContext content={`Selected marker: "${selected.title}" at ${selected.lat},${selected.lng}`} />}
    <div className="map-view">
      {map.title && <div className="map-title">{map.title}</div>}
      <div ref={container} style={{ width: "100%", height: "100%" }} />
    </div>
  </>;
}
