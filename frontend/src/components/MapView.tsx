"use client";

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapFeatureCollection } from "@/lib/types";

interface Props {
  geojson: MapFeatureCollection | null;
}

export default function MapView({ geojson }: Props) {
  return (
    <MapContainer
      center={[0, 0]}
      zoom={2}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geojson && (
        <GeoJSON
          // Force re-render on new data
          key={JSON.stringify(geojson)}
          data={geojson as unknown as GeoJSON.FeatureCollection}
          style={() => ({
            color: "#ef4444",
            weight: 2,
            fillColor: "#ef4444",
            fillOpacity: 0.3,
          })}
          onEachFeature={(feature, layer) => {
            const props = feature.properties;
            layer.bindPopup(
              `<strong>Annotation #${props.annotation_id}</strong><br/>` +
                `Label: ${props.label}<br/>` +
                `Weight: ${props.weight_g?.toFixed(1) ?? "—"} g`
            );
          }}
        />
      )}
    </MapContainer>
  );
}
