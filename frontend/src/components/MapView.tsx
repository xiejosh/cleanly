"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapFeatureCollection } from "@/lib/types";
import * as L from "leaflet";

interface Props {
  geojson: MapFeatureCollection | null;
}

// Interpolates between green → yellow → red based on a 0–1 ratio
function weightColor(ratio: number): string {
  if (ratio < 0.5) {
    // green → yellow
    const r = Math.round(255 * (ratio * 2));
    return `rgb(${r}, 200, 50)`;
  } else {
    // yellow → red
    const g = Math.round(200 * (1 - (ratio - 0.5) * 2));
    return `rgb(255, ${g}, 20)`;
  }
}

function FitBounds({ geojson }: { geojson: MapFeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson || geojson.features.length === 0) return;
    try {
      const layer = L.geoJSON(geojson as unknown as GeoJSON.FeatureCollection);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    } catch {
      // ignore invalid bounds
    }
  }, [geojson, map]);
  return null;
}

function Legend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 12,
        zIndex: 1000,
        background: "rgba(255,255,255,0.92)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        pointerEvents: "none",
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 6 }}>Plastic weight</p>
      {[
        { label: "Low", color: "rgb(50, 200, 50)" },
        { label: "Medium", color: "rgb(255, 200, 20)" },
        { label: "High", color: "rgb(255, 20, 20)" },
      ].map(({ label, color }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 14,
              borderRadius: 3,
              background: color,
              border: "1px solid rgba(0,0,0,0.15)",
            }}
          />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function MapView({ geojson }: Props) {
  const maxWeight =
    geojson && geojson.features.length > 0
      ? Math.max(...geojson.features.map((f) => f.properties.weight_g ?? 0))
      : 1;

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer center={[0, 0]} zoom={2} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds geojson={geojson} />
        {geojson && (
          <GeoJSON
            key={JSON.stringify(geojson)}
            data={geojson as unknown as GeoJSON.FeatureCollection}
            style={(feature) => {
              const weight = feature?.properties?.weight_g ?? 0;
              const ratio = maxWeight > 0 ? weight / maxWeight : 0;
              const color = weightColor(ratio);
              return {
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.45,
              };
            }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties;
              layer.bindPopup(
                `<strong>Annotation #${p.annotation_id}</strong><br/>` +
                  `Label: ${p.label}<br/>` +
                  `Weight: ${p.weight_g?.toFixed(1) ?? "—"} g<br/>` +
                  `Area: ${p.pixel_area != null ? p.pixel_area.toLocaleString() + " px²" : "—"}`
              );
            }}
          />
        )}
      </MapContainer>
      {geojson && geojson.features.length > 0 && <Legend />}
    </div>
  );
}
