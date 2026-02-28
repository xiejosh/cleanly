"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { runAnalysis } from "@/lib/api";
import type { AnalysisResult } from "@/lib/types";

function AnalysisContent() {
  const searchParams = useSearchParams();
  const [imageId, setImageId] = useState(searchParams.get("id") ?? "");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setImageId(id);
      runAnalysisFor(parseInt(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAnalysisFor(id: number) {
    setLoading(true);
    try {
      const data = (await runAnalysis(id)) as AnalysisResult;
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Analysis failed — ensure image has been synced first.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!imageId) return;
    await runAnalysisFor(parseInt(imageId));
  }

  return (
    <>
      <div className="mb-6 flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            Image ID
          </label>
          <input
            type="number"
            placeholder="Enter image ID"
            value={imageId}
            onChange={(e) => setImageId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean dark:border-navy-mid dark:bg-navy-light dark:text-gray-100"
          />
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || !imageId}
          className="flex items-center gap-2 rounded-lg bg-ocean px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ocean-dark disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Analyzing...
            </>
          ) : (
            "Run Analysis"
          )}
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Annotations"
              value={result.annotation_count}
              accent="bg-ocean/10 dark:bg-ocean/10"
            />
            <Stat
              label="Detected Pixels"
              value={result.total_detected_pixels.toLocaleString()}
              accent="bg-ocean-light/10 dark:bg-ocean-light/10"
            />
            <Stat
              label="Area"
              value={`${result.area_cm2.toFixed(1)} cm²`}
              accent="bg-coral-light/15 dark:bg-coral-light/10"
            />
            <Stat
              label="Est. Weight"
              value={`${result.estimated_weight_kg.toFixed(3)} kg`}
              accent="bg-emerald-500/10 dark:bg-emerald-500/10"
            />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/map?id=${result.image_id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-coral px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-coral/90"
            >
              View on Map →
            </Link>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Detected Annotations</h2>
            <div className="space-y-2">
              {result.annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-navy-mid/60 dark:bg-navy-light"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Annotation #{ann.id}
                  </span>
                  <div className="flex items-center gap-4 text-gray-500">
                    <span>
                      Label:{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {ann.label}
                      </span>
                    </span>
                    <span>
                      Area:{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {ann.pixel_area?.toFixed(1) ?? "—"} px
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  accent = "bg-ocean/10 dark:bg-ocean/10",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-200 p-4 shadow-sm dark:border-navy-mid/60 ${accent}`}>
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="text-xl font-bold text-navy dark:text-gray-100">{value}</p>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Image Analysis</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Compute plastic weight, area, and coordinates for a synced image.
      </p>
      <Suspense
        fallback={
          <div className="flex items-center gap-3 py-8 text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-ocean/30 border-t-ocean" />
            <p className="text-sm">Loading...</p>
          </div>
        }
      >
        <AnalysisContent />
      </Suspense>
    </div>
  );
}
