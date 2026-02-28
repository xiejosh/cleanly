"use client";

import { useState, useEffect } from "react";
import { syncCvat, getImages, getAnnotations, registerGlobalOrigin, getGeorefs } from "@/lib/api";
import type { CvatSyncResponse, CvatImage, CvatAnnotation, GeorefInfo } from "@/lib/types";

// Matches backend: 0.5 cm/px → 0.25 cm²/px, density 0.48 g/cm² → 0.12 g/px
const WEIGHT_PER_PIXEL_G = 0.12;
const AREA_PER_PIXEL_CM2 = 0.25;

interface ImageStats {
  annotationCount: number;
  totalPixelArea: number;
  areaCm2: number;
  weightG: number;
  weightKg: number;
}

export default function ImagesPage() {
  const [images, setImages] = useState<CvatImage[]>([]);
  const [stats, setStats] = useState<Record<number, ImageStats>>({});
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState("");

  // Origin + georef state
  const [originLat, setOriginLat] = useState("");
  const [originLng, setOriginLng] = useState("");
  const [originSet, setOriginSet] = useState(false);
  const [originLoading, setOriginLoading] = useState(false);
  const [georefs, setGeorefs] = useState<Record<number, { lat: number; lng: number }>>({});

  async function fetchStats(imgs: CvatImage[]) {
    const entries = await Promise.all(
      imgs.map(async (img) => {
        try {
          const anns = (await getAnnotations(img.id)) as CvatAnnotation[];
          const totalPixelArea = anns.reduce(
            (sum, a) => sum + (a.pixel_area ?? 0),
            0
          );
          return [
            img.id,
            {
              annotationCount: anns.length,
              totalPixelArea,
              areaCm2: totalPixelArea * AREA_PER_PIXEL_CM2,
              weightG: totalPixelArea * WEIGHT_PER_PIXEL_G,
              weightKg: (totalPixelArea * WEIGHT_PER_PIXEL_G) / 1000,
            },
          ] as const;
        } catch {
          return null;
        }
      })
    );
    const newStats: Record<number, ImageStats> = {};
    for (const entry of entries) {
      if (entry) newStats[entry[0]] = entry[1];
    }
    setStats(newStats);
  }

  async function loadGeorefs() {
    try {
      const data = (await getGeorefs()) as GeorefInfo;
      setGeorefs(data.georefs);
      if (data.origin) {
        setOriginLat(String(data.origin.lat));
        setOriginLng(String(data.origin.lng));
        setOriginSet(true);
      }
    } catch {
      // georefs not available yet
    }
  }

  useEffect(() => {
    getImages()
      .then((data) => {
        const imgs = data as CvatImage[];
        setImages(imgs);
        if (imgs.length > 0) fetchStats(imgs);
      })
      .catch(() => {});
    loadGeorefs();
  }, []);

  async function handleSync() {
    setLoading(true);
    try {
      const data = (await syncCvat(
        taskId ? parseInt(taskId) : undefined
      )) as CvatSyncResponse;
      setImages(data.images);
      if (data.images.length > 0) fetchStats(data.images);
    } catch (err) {
      console.error(err);
      alert("Sync failed — check backend connection and CVAT credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetOrigin() {
    const lat = parseFloat(originLat);
    const lng = parseFloat(originLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid latitude and longitude values.");
      return;
    }
    setOriginLoading(true);
    try {
      await registerGlobalOrigin(lat, lng);
      const data = (await getGeorefs()) as GeorefInfo;
      setGeorefs(data.georefs);
      setOriginSet(true);
    } catch (err) {
      console.error(err);
      alert("Failed to set origin.");
    } finally {
      setOriginLoading(false);
    }
  }

  function formatWeight(g: number): string {
    if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`;
    return `${g.toFixed(1)} g`;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">CVAT Images</h1>

      {/* Mosaic Origin Input */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Mosaic Origin (bottom-left GPS)
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            value={originLat}
            onChange={(e) => setOriginLat(e.target.value)}
            className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            value={originLng}
            onChange={(e) => setOriginLng(e.target.value)}
            className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            onClick={handleSetOrigin}
            disabled={originLoading || !originLat || !originLng}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {originLoading ? "Setting..." : originSet ? "Update Origin" : "Set Origin"}
          </button>
          {originSet && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Origin set — coordinates shown on image cards
            </span>
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          placeholder="Task ID (optional)"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          onClick={handleSync}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Sync from CVAT"}
        </button>
      </div>

      {(() => {
        const annotatedImages = images.filter(
          (img) => stats[img.id] && stats[img.id].annotationCount > 0
        );
        if (images.length === 0) {
          return (
            <p className="text-gray-500">
              No images loaded. Click &quot;Sync from CVAT&quot; to pull imagery.
            </p>
          );
        }
        if (annotatedImages.length === 0) {
          return (
            <p className="text-gray-500">
              No annotated images found. Images without annotations are hidden.
            </p>
          );
        }
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {annotatedImages.map((img) => {
              const s = stats[img.id];
              return (
                <div
                  key={img.id}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                >
                  <p className="break-all font-medium">{img.name}</p>
                  <p className="text-sm text-gray-500">
                    {img.width} x {img.height} &middot; Task {img.task_id}
                  </p>
                  <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm dark:border-gray-800">
                    <p>
                      <span className="text-gray-500">Annotations:</span>{" "}
                      {s.annotationCount}
                    </p>
                    <p>
                      <span className="text-gray-500">Pixel area:</span>{" "}
                      {s.totalPixelArea.toLocaleString()} px
                    </p>
                    <p>
                      <span className="text-gray-500">Real area:</span>{" "}
                      {s.areaCm2.toFixed(1)} cm²
                    </p>
                    <p>
                      <span className="text-gray-500">Est. plastic:</span>{" "}
                      <span className="font-semibold text-red-500">
                        {formatWeight(s.weightG)}
                      </span>
                    </p>
                  </div>
                  {georefs[img.id] && (
                    <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800">
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {georefs[img.id].lat.toFixed(6)}, {georefs[img.id].lng.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
