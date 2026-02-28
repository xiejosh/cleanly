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

function StatCard({
  label,
  value,
  sub,
  accent = "bg-ocean/10 dark:bg-ocean/10",
}: StatCardProps) {
  return (
    <div className={`rounded-2xl border border-gray-200 p-5 shadow-sm dark:border-navy-mid/60 ${accent}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="text-2xl font-bold text-navy dark:text-gray-100">{value}</p>
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
          Live overview of plastic survey data across all processed drone imagery.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-8 text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-ocean/30 border-t-ocean" />
          <p className="text-sm">Loading mission data...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-4 text-sm text-coral dark:text-coral-light">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Plastic Area"
              value={`${data.total_area_m2.toFixed(1)} m²`}
              sub={`${data.total_weight_kg.toFixed(1)} kg estimated weight`}
              accent="bg-ocean/10 dark:bg-ocean/10"
            />
            <StatCard
              label="Avg Plastic Density"
              value={`${data.avg_density_g_per_cm2.toFixed(3)} g/cm²`}
              sub="Surface density across surveyed area"
              accent="bg-ocean-light/10 dark:bg-ocean-light/10"
            />
            <StatCard
              label="Buried Plastic Estimate"
              value={`${data.buried_estimate_kg.low}–${data.buried_estimate_kg.high} kg`}
              sub="Estimated plastic invisible to drone"
              accent="bg-coral-light/15 dark:bg-coral-light/10"
            />
            <StatCard
              label="Hotspots Detected"
              value={data.hotspot_count.toLocaleString()}
              sub={`Across ${data.image_count} images`}
              accent="bg-emerald-500/10 dark:bg-emerald-500/10"
            />
          </div>

          <div className="flex gap-4" style={{ height: 520 }}>
            <div className="flex-[65] overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-navy-mid/60">
              <MapView geojson={data.geojson} />
            </div>
            <div className="flex-[35]">
              <Raccoon mapContext={data.geojson} dashboardData={data} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
