"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getDashboardSummary } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import Raccoon from "@/components/Raccoon";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function StatCard({ label, value, sub, accent = "bg-blue-50 dark:bg-blue-950" }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 p-5 dark:border-gray-800 ${accent}`}>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummary()
      .then((d) => setData(d as DashboardSummary))
      .catch(() => setError("Could not load dashboard data — is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Mission Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Aggregated plastic survey data across all processed drone imagery.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-gray-500">Loading mission data...</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Plastic & Product Area"
              value={`${data.total_area_m2.toFixed(1)} m²`}
              sub={`${data.total_weight_kg.toFixed(1)} kg estimated weight`}
              accent="bg-blue-50 dark:bg-blue-950"
            />
            <StatCard
              label="Avg Plastic Density"
              value={`${data.avg_density_g_per_cm2.toFixed(3)} g/cm²`}
              sub="Surface density across surveyed area"
              accent="bg-violet-50 dark:bg-violet-950"
            />
            <StatCard
              label="Buried Plastic Estimate"
              value={`${data.buried_estimate_kg.low}–${data.buried_estimate_kg.high} kg`}
              sub="Estimated plastic invisible to drone"
              accent="bg-amber-50 dark:bg-amber-950"
            />
            <StatCard
              label="Hotspots Detected"
              value={data.hotspot_count.toLocaleString()}
              sub={`Across ${data.image_count} images`}
              accent="bg-emerald-50 dark:bg-emerald-950"
            />
          </div>

          {/* Map + Raccoon */}
          <div className="flex gap-4" style={{ height: 520 }}>
            {/* Heatmap */}
            <div className="flex-[65] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <MapView geojson={data.geojson} />
            </div>

            {/* Raccoon */}
            <div className="flex-[35]">
              <Raccoon mapContext={data.geojson} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
