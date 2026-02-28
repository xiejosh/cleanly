"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { syncCvat, getImages, getAnnotations } from "@/lib/api";
import type { CvatSyncResponse, CvatImage, CvatAnnotation } from "@/lib/types";

const WEIGHT_PER_PIXEL_G = 0.12;
const AREA_PER_PIXEL_CM2 = 0.25;

interface ImageStats {
  annotationCount: number;
  totalPixelArea: number;
  areaCm2: number;
  weightG: number;
  weightKg: number;
}

function SyncIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function DroneIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ocean">
      <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M4 8l2.1 2.1" />
      <path d="M17.9 10.1L20 8" />
      <path d="M4 16l2.1-2.1" />
      <path d="M17.9 13.9L20 16" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="20" cy="8" r="2" />
      <circle cx="4" cy="16" r="2" />
      <circle cx="20" cy="16" r="2" />
      <path d="M9 12h6" />
    </svg>
  );
}

export default function ImagesPage() {
  const [images, setImages] = useState<CvatImage[]>([]);
  const [stats, setStats] = useState<Record<number, ImageStats>>({});
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState("");

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

  useEffect(() => {
    getImages()
      .then((data) => {
        const imgs = data as CvatImage[];
        setImages(imgs);
        if (imgs.length > 0) fetchStats(imgs);
      })
      .catch(() => {});
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

  function formatWeight(g: number): string {
    if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`;
    return `${g.toFixed(1)} g`;
  }

  const totalAnnotations = Object.values(stats).reduce((s, v) => s + v.annotationCount, 0);
  const totalWeightG = Object.values(stats).reduce((s, v) => s + v.weightG, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">CVAT Images</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sync and review annotated drone imagery from your CVAT project.
        </p>
      </div>

      {/* Sync panel */}
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-mid/60 dark:bg-navy-light">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Pull from CVAT
        </p>
        <div className="flex w-full items-center gap-2">
          <input
            type="text"
            placeholder="Task ID (optional)"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean dark:border-navy-mid dark:bg-navy-light dark:text-gray-100"
          />
          <button
            onClick={handleSync}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-ocean px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ocean-dark disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Syncing...
              </>
            ) : (
              <>
                <SyncIcon />
                Sync Images
              </>
            )}
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-14 text-center dark:border-navy-mid dark:bg-navy-light">
          <DroneIcon />
          <div>
            <p className="font-semibold text-navy dark:text-gray-200">
              No images loaded yet
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Use the sync button above to pull annotated drone imagery from your CVAT project.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 rounded-xl border border-ocean/20 bg-ocean/10 px-5 py-3 text-sm">
            <span>
              <span className="font-bold text-navy dark:text-gray-100">
                {images.length}
              </span>{" "}
              <span className="text-gray-500">images</span>
            </span>
            <span className="text-gray-300 dark:text-navy-mid">|</span>
            <span>
              <span className="font-bold text-navy dark:text-gray-100">
                {totalAnnotations.toLocaleString()}
              </span>{" "}
              <span className="text-gray-500">annotations</span>
            </span>
            <span className="text-gray-300 dark:text-navy-mid">|</span>
            <span>
              <span className="font-bold text-coral">
                {formatWeight(totalWeightG)}
              </span>{" "}
              <span className="text-gray-500">estimated plastic</span>
            </span>
          </div>

          {/* Image grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => {
              const s = stats[img.id];
              return (
                <div
                  key={img.id}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-ocean/30 hover:shadow-md dark:border-navy-mid/60 dark:bg-navy-light dark:hover:border-ocean/40"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-navy dark:text-gray-100">
                      {img.name}
                    </p>
                    <span className="shrink-0 rounded-full bg-ocean/10 px-2 py-0.5 text-xs text-ocean-dark dark:text-ocean-light">
                      #{img.id}
                    </span>
                  </div>
                  <p className="mb-3 text-sm text-gray-500">
                    {img.width} × {img.height} px &middot; Task {img.task_id}
                  </p>

                  {s && s.annotationCount > 0 && (
                    <div className="space-y-1.5 border-t border-gray-100 pt-3 text-sm dark:border-navy-mid/40">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Annotations</span>
                        <span className="font-medium">{s.annotationCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pixel area</span>
                        <span className="font-medium">{s.totalPixelArea.toLocaleString()} px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Real area</span>
                        <span className="font-medium">{s.areaCm2.toFixed(1)} cm²</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-100 pt-1.5 dark:border-navy-mid/40">
                        <span className="text-gray-500">Est. plastic</span>
                        <span className="font-bold text-coral">
                          {formatWeight(s.weightG)}
                        </span>
                      </div>
                      <Link
                        href={`/analysis?id=${img.id}`}
                        className="mt-2 block text-center text-xs font-semibold text-ocean hover:text-ocean-dark dark:text-ocean-light dark:hover:text-ocean"
                      >
                        Run Analysis →
                      </Link>
                    </div>
                  )}
                  {s && s.annotationCount === 0 && (
                    <p className="border-t border-gray-100 pt-3 text-sm text-gray-400 dark:border-navy-mid/40">
                      No annotations found
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
