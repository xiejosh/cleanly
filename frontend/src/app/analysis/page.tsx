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
      <div className="mb-6 flex items-center gap-3">
        <input
          type="number"
          placeholder="Image ID"
          value={imageId}
          onChange={(e) => setImageId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !imageId}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Annotations" value={result.annotation_count} />
            <Stat
              label="Detected Pixels"
              value={result.total_detected_pixels.toLocaleString()}
            />
            <Stat label="Area" value={`${result.area_cm2.toFixed(1)} cm²`} />
            <Stat
              label="Est. Weight"
              value={`${result.estimated_weight_kg.toFixed(3)} kg`}
            />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/map?id=${result.image_id}`}
              className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              View on Map →
            </Link>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">Annotations</h2>
            <div className="space-y-2">
              {result.annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
                >
                  <span className="font-medium">#{ann.id}</span> &middot;
                  Label: {ann.label} &middot; Pixel area:{" "}
                  {ann.pixel_area?.toFixed(1) ?? "—"}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Image Analysis</h1>
      <Suspense fallback={<p className="text-sm text-gray-500">Loading...</p>}>
        <AnalysisContent />
      </Suspense>
    </div>
  );
}
