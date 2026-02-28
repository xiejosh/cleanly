"use client";

import { useState } from "react";
import { runAnalysis } from "@/lib/api";
import type { AnalysisResult } from "@/lib/types";

export default function AnalysisPage() {
  const [imageId, setImageId] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!imageId) return;
    setLoading(true);
    try {
      const data = (await runAnalysis(parseInt(imageId))) as AnalysisResult;
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Analysis failed — ensure image has been synced first.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Image Analysis</h1>
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
            <Stat
              label="Area"
              value={`${result.area_cm2.toFixed(1)} cm²`}
            />
            <Stat
              label="Est. Weight"
              value={`${result.estimated_weight_kg.toFixed(3)} kg`}
            />
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
    </div>
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
