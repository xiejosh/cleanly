"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { getMapFeatures } from "@/lib/api";
import type { MapFeatureCollection } from "@/lib/types";

// Leaflet must be loaded client-side only
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const [imageId, setImageId] = useState("");
  const [geojson, setGeojson] = useState<MapFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLoad() {
    if (!imageId) return;
    setLoading(true);
    try {
      const data = (await getMapFeatures(
        parseInt(imageId)
      )) as MapFeatureCollection;
      setGeojson(data);
    } catch (err) {
      console.error(err);
      alert(
        "Failed to load map data — ensure image is analyzed and georeferenced."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Trash Hotspot Map</h1>
      <div className="mb-6 flex items-center gap-3">
        <input
          type="number"
          placeholder="Image ID"
          value={imageId}
          onChange={(e) => setImageId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          onClick={handleLoad}
          disabled={loading || !imageId}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load Map"}
        </button>
      </div>

      <div className="h-[500px] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <MapView geojson={geojson} />
      </div>
    </div>
  );
}
