"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getMapFeatures } from "@/lib/api";
import type { MapFeatureCollection } from "@/lib/types";
import Raccoon from "@/components/Raccoon";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="3" />
      <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 11.5 7.3 11.8a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ocean">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

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
    <div className="flex flex-col gap-5">
      {/* Load data panel */}
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-navy-mid/60 dark:bg-navy-light">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Load Map Data
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Image ID"
            value={imageId}
            onChange={(e) => setImageId(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean dark:border-navy-mid dark:bg-navy-light dark:text-gray-100"
          />
          <button
            onClick={handleLoad}
            disabled={loading || !imageId}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-ocean px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ocean-dark disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Loading...
              </>
            ) : (
              <>
                <MapIcon />
                Load Map
              </>
            )}
          </button>
        </div>

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
          <p className="mt-2 text-center text-xs text-coral">{uploadError}</p>
        )}
      </div>

      {/* Stats bar + expedition CTA */}
      {stats && (
        <div className="flex flex-wrap items-center justify-center gap-6 rounded-xl border border-ocean/20 bg-ocean/10 px-5 py-3 text-sm">
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
        <div className="flex-[65] overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-navy-mid/60">
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
