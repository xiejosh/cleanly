"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getMapFeatures } from "@/lib/api";
import type { MapFeatureCollection } from "@/lib/types";
import Raccoon from "@/components/Raccoon";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

function deriveStats(geojson: MapFeatureCollection) {
  const features = geojson.features.length;
  const totalWeightKg =
    geojson.features.reduce((sum, f) => sum + (f.properties.weight_g ?? 0), 0) / 1000;
  const totalAreaM2 =
    (geojson.features.reduce((sum, f) => sum + (f.properties.pixel_area ?? 0), 0) * 0.25) /
    10000;
  return { features, totalWeightKg, totalAreaM2 };
}

function MapContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [imageId, setImageId] = useState(searchParams.get("id") ?? "");
  const [geojson, setGeojson] = useState<MapFeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      loadMap(parseInt(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMap(id: number) {
    setLoading(true);
    try {
      const data = (await getMapFeatures(id)) as MapFeatureCollection;
      setGeojson(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load map data — ensure image is analyzed and georeferenced.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoad() {
    if (!imageId) return;
    await loadMap(parseInt(imageId));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
          setUploadError("Invalid format — expected a GeoJSON FeatureCollection.");
          return;
        }
        setGeojson(parsed as MapFeatureCollection);
      } catch {
        setUploadError("Could not parse file — make sure it's valid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const stats = geojson ? deriveStats(geojson) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
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

        <span className="text-xs text-gray-400">or</span>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
        >
          Upload JSON
        </button>

        {uploadError && (
          <span className="text-xs text-red-500">{uploadError}</span>
        )}

        {geojson && (
          <button
            onClick={() => router.push("/expedition")}
            className="ml-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Plan Expedition →
          </button>
        )}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
          <span>
            <span className="font-semibold">{stats.features.toLocaleString()}</span>{" "}
            <span className="text-gray-500">hotspots</span>
          </span>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span>
            <span className="font-semibold">{stats.totalWeightKg.toFixed(2)} kg</span>{" "}
            <span className="text-gray-500">estimated weight</span>
          </span>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span>
            <span className="font-semibold">{stats.totalAreaM2.toFixed(2)} m²</span>{" "}
            <span className="text-gray-500">total area</span>
          </span>
        </div>
      )}

      {/* Map + Raccoon */}
      <div className="flex gap-4" style={{ height: 520 }}>
        <div className="flex-[65] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <MapView geojson={geojson} />
        </div>
        <div className="flex-[35]">
          <Raccoon mapContext={geojson} />
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Trash Hotspot Map</h1>
      <Suspense fallback={<p className="text-sm text-gray-500">Loading...</p>}>
        <MapContent />
      </Suspense>
    </div>
  );
}
