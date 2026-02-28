"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapFeatureCollection, HeatmapPoint } from "@/lib/types";
import * as L from "leaflet";

interface Props {
  geojson: MapFeatureCollection | null;
  heatmapPoints?: HeatmapPoint[] | null;
}

// Interpolates between green -> yellow -> red based on a 0-1 ratio
function weightColor(ratio: number): string {
  if (ratio < 0.5) {
    // green -> yellow
    const r = Math.round(255 * (ratio * 2));
    return `rgb(${r}, 200, 50)`;
  } else {
    // yellow -> red
    const g = Math.round(200 * (1 - (ratio - 0.5) * 2));
    return `rgb(255, ${g}, 20)`;
  }
}

function FitBounds({
  geojson,
  heatmapPoints,
}: {
  geojson: MapFeatureCollection | null;
  heatmapPoints?: HeatmapPoint[] | null;
}) {
  const map = useMap();
  useEffect(() => {
    // Fit to geojson if available
    if (geojson && geojson.features.length > 0) {
      try {
        const layer = L.geoJSON(geojson as unknown as GeoJSON.FeatureCollection);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      } catch {
        // ignore invalid bounds
      }
      return;
    }
    // Otherwise fit to heatmap points
    if (heatmapPoints && heatmapPoints.length > 0) {
      const lats = heatmapPoints.map((p) => p.lat);
      const lngs = heatmapPoints.map((p) => p.lng);
      const bounds = L.latLngBounds(
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [geojson, heatmapPoints, map]);
  return null;
}

function PolygonLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 12,
        zIndex: 1000,
        background: isDark ? "rgba(13,27,42,0.92)" : "rgba(255,255,255,0.92)",
        color: isDark ? "#e2e8f0" : "#0d1b2a",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: isDark ? "0 1px 4px rgba(0,0,0,0.5)" : "0 1px 4px rgba(0,0,0,0.2)",
        border: isDark ? "1px solid rgba(39,64,96,0.5)" : "1px solid rgba(0,0,0,0.08)",
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
              border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)",
            }}
          />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}


export default function MapView({ geojson, heatmapPoints }: Props) {
  const showHeatmap = heatmapPoints && heatmapPoints.length > 0;
  const showGeojson = !showHeatmap && geojson;

  const maxWeight =
    geojson && geojson.features.length > 0
      ? Math.max(...geojson.features.map((f) => f.properties.weight_g ?? 0))
      : 1;

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <MapContainer center={[0, 0]} zoom={2} maxZoom={23} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxNativeZoom={19}
          maxZoom={23}
        />
        <FitBounds geojson={showGeojson ? geojson : null} heatmapPoints={showHeatmap ? heatmapPoints : null} />
        {showHeatmap && heatmapPoints.map((p) => (
          <CircleMarker
            key={p.image_id}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{ color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.85, weight: 2 }}
          >
            <Popup>
              <strong>{p.image_name}</strong><br />
              Annotations: {p.annotation_count}
            </Popup>
          </CircleMarker>
        ))}
        {showGeojson && geojson && (
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
                  `Weight: ${p.weight_g?.toFixed(1) ?? "\u2014"} g<br/>` +
                  `Area: ${p.pixel_area != null ? p.pixel_area.toLocaleString() + " px\u00B2" : "\u2014"}`
              );
            }}
          />
        )}
      </MapContainer>
      {showGeojson && geojson && geojson.features.length > 0 && <PolygonLegend />}
    </div>
  );
}
