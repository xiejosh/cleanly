"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getMapFeatures, getHeatmapData } from "@/lib/api";
import type { MapFeatureCollection, HeatmapResponse, HeatmapPoint } from "@/lib/types";
import Raccoon from "@/components/Raccoon";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type ViewMode = "geojson" | "heatmap";

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

  // Heatmap state
  const [heatmapData, setHeatmapData] = useState<HeatmapResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("heatmap");

  useEffect(() => {
    // Auto-load heatmap on mount
    getHeatmapData()
      .then((data) => {
        const hm = data as HeatmapResponse;
        if (hm.points.length > 0) {
          setHeatmapData(hm);
          setViewMode("heatmap");
        }
      })
      .catch(() => {
        // Origin not set or no data — leave empty
      });

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
      setViewMode("geojson");
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
        setViewMode("geojson");
      } catch {
        setUploadError("Could not parse file — make sure it's valid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const stats = geojson ? deriveStats(geojson) : null;
  const hasHeatmap = heatmapData && heatmapData.points.length > 0;
  const hasGeojson = geojson && geojson.features.length > 0;
  const canToggle = hasHeatmap && hasGeojson;

  // Derive heatmap stats
  const heatmapStats = heatmapData
    ? {
        annotatedImages: heatmapData.points.length,
        totalGeoreferenced: heatmapData.total_images_georeferenced,
        totalWeightKg:
          heatmapData.points.reduce((sum, p) => sum + p.total_weight_g, 0) / 1000,
      }
    : null;

  // Determine what to pass to MapView
  const activeHeatmapPoints: HeatmapPoint[] | null =
    viewMode === "heatmap" && hasHeatmap ? heatmapData.points : null;
  const activeGeojson: MapFeatureCollection | null =
    viewMode === "geojson" ? geojson : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Single Image + View Toggle Controls */}
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

        <div className="mt-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-navy-mid/40" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-navy-mid/40" />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-ocean hover:text-ocean dark:border-navy-mid dark:text-gray-300 dark:hover:border-ocean dark:hover:text-ocean-light"
        >
          <UploadIcon />
          Upload GeoJSON File
        </button>

        {uploadError && (
          <span className="text-xs text-red-500">{uploadError}</span>
        )}

        {/* View mode toggle */}
        {canToggle && (
          <div className="ml-auto flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
            <button
              onClick={() => setViewMode("heatmap")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "heatmap"
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              Heatmap View
            </button>
            <button
              onClick={() => setViewMode("geojson")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "geojson"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              Polygon View
            </button>
          </div>
        )}

        {(hasGeojson || hasHeatmap) && (
          <button
            onClick={() => router.push("/expedition")}
            className={`${canToggle ? "" : "ml-auto "}rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700`}
          >
            Plan Expedition →
          </button>
        )}
      </div>

      {/* Heatmap Stats */}
      {viewMode === "heatmap" && heatmapStats && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm dark:border-purple-900 dark:bg-purple-950">
          <span>
            <span className="font-semibold">{heatmapStats.annotatedImages}</span>{" "}
            <span className="text-gray-500">annotated images</span>
          </span>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span>
            <span className="font-semibold">{heatmapStats.totalGeoreferenced}</span>{" "}
            <span className="text-gray-500">total georeferenced</span>
          </span>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span>
            <span className="font-semibold">{heatmapStats.totalWeightKg.toFixed(2)} kg</span>{" "}
            <span className="text-gray-500">estimated total weight</span>
          </span>
        </div>
      )}

      {/* Polygon Stats */}
      {viewMode === "geojson" && stats && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
          <span>
            <span className="font-bold text-navy dark:text-gray-100">
              {stats.features.toLocaleString()}
            </span>{" "}
            <span className="text-gray-500">hotspots</span>
          </span>
          <span className="text-gray-300 dark:text-navy-mid">|</span>
          <span>
            <span className="font-bold text-navy dark:text-gray-100">
              {stats.totalWeightKg.toFixed(2)} kg
            </span>{" "}
            <span className="text-gray-500">estimated weight</span>
          </span>
          <span className="text-gray-300 dark:text-navy-mid">|</span>
          <span>
            <span className="font-bold text-navy dark:text-gray-100">
              {stats.totalAreaM2.toFixed(2)} m²
            </span>{" "}
            <span className="text-gray-500">total area</span>
          </span>
          <button
            onClick={() => router.push("/expedition")}
            className="ml-auto rounded-lg bg-coral px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-coral/90"
          >
            Plan Expedition →
          </button>
        </div>
      )}

      {/* No-data notice */}
      {!geojson && (
        <div className="flex items-center gap-2 rounded-xl border border-coral-light/30 bg-coral-light/10 px-4 py-3 text-sm text-coral dark:text-coral-light">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          No live data loaded — load an image ID or upload GeoJSON above to populate the map and give Raccoon survey data to analyze.
        </div>
      )}

      {/* Map + Raccoon — always visible */}
      <div className="flex gap-4" style={{ height: 520 }}>
        <div className="flex-[65] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <MapView geojson={activeGeojson} heatmapPoints={activeHeatmapPoints} />
        </div>
        <div className="flex-[35]">
          <Raccoon mapContext={geojson ?? heatmapData} />
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Trash Hotspot Map</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Visualize plastic hotspots and chat with Raccoon to plan your cleanup.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-3 py-8 text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-ocean/30 border-t-ocean" />
            <p className="text-sm">Loading...</p>
          </div>
        }
      >
        <MapContent />
      </Suspense>
    </div>
  );
}
