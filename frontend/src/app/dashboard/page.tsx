"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { getDashboardSummary, getHeatmapData } from "@/lib/api";
import type { DashboardSummary, LabelBreakdown, ZoneSummary, HeatmapPoint } from "@/lib/types";
import Raccoon from "@/components/Raccoon";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

/* ── Animated counter hook ── */
function useAnimatedNumber(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(from + (target - from) * eased);
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target, duration]);

  return value;
}

/* ── Big stat card with animated number ── */
function BigStat({
  label,
  value,
  suffix,
  sub,
  icon,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  suffix: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}) {
  const animated = useAnimatedNumber(value);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const formatValue = (v: number) => {
    if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (v >= 1) return v.toFixed(1);
    return v.toFixed(3);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 p-5 shadow-lg transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${color}`}
    >
      <div className="absolute -right-3 -top-3 text-white/[0.07]">{icon}</div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/60">
        {label}
      </p>
      <p className="text-3xl font-extrabold tabular-nums text-white">
        {formatValue(animated)}
        <span className="ml-1 text-base font-medium text-white/60">{suffix}</span>
      </p>
      {sub && <p className="mt-1.5 text-xs text-white/50">{sub}</p>}
    </div>
  );
}

/* ── Label breakdown bar ── */
function LabelBar({
  item,
  maxCount,
  index,
}: {
  item: LabelBreakdown;
  maxCount: number;
  index: number;
}) {
  const [width, setWidth] = useState(0);
  const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100 + index * 60);
    return () => clearTimeout(t);
  }, [pct, index]);

  const LABEL_COLORS = [
    "bg-ocean",
    "bg-ocean-light",
    "bg-coral",
    "bg-coral-light",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
  ];

  const displayLabel = item.label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="group flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-xs font-medium text-gray-300 group-hover:text-white transition-colors">
        {displayLabel}
      </span>
      <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
            LABEL_COLORS[index % LABEL_COLORS.length]
          }`}
          style={{ width: `${width}%` }}
        />
        <span className="absolute inset-y-0 left-3 flex items-center text-[11px] font-semibold text-white/90">
          {item.count}
        </span>
      </div>
      <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-gray-500">
        {item.weight_g.toFixed(1)}g
      </span>
    </div>
  );
}

/* ── Zone row ── */
function ZoneRow({ zone, rank }: { zone: ZoneSummary; rank: number }) {
  const name = zone.image_name.split("/").pop()?.replace(/\.jpg$/i, "") ?? zone.image_name;

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      <td className="py-2.5 pr-3 text-xs font-mono text-gray-500">#{rank}</td>
      <td className="py-2.5 pr-3 text-xs text-gray-300 truncate max-w-[200px]" title={zone.image_name}>
        {name}
      </td>
      <td className="py-2.5 pr-3 text-right text-xs tabular-nums font-semibold text-ocean-light">
        {zone.annotation_count}
      </td>
      <td className="py-2.5 pr-3 text-right text-xs tabular-nums text-gray-400">
        {zone.area_cm2.toFixed(1)} cm&sup2;
      </td>
      <td className="py-2.5 text-right text-xs tabular-nums font-semibold text-coral-light">
        {zone.weight_g.toFixed(1)}g
      </td>
    </tr>
  );
}

/* ── Donut ring (pure SVG) ── */
function DonutChart({ items }: { items: LabelBreakdown[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return null;

  const COLORS = [
    "#00b4d8", "#48cae4", "#e76f51", "#f4a261",
    "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e",
  ];

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {items.slice(0, 8).map((item, i) => {
          const pct = item.count / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const segment = (
            <circle
              key={item.label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="20"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              className="transition-all duration-1000"
              style={{ opacity: 0.85 }}
            />
          );
          offset += dash;
          return segment;
        })}
        <text x="80" y="74" textAnchor="middle" className="fill-white text-2xl font-bold" fontSize="24">
          {total.toLocaleString()}
        </text>
        <text x="80" y="96" textAnchor="middle" className="fill-gray-400" fontSize="11">
          annotations
        </text>
      </svg>
    </div>
  );
}

/* ── SVG icons ── */
const Icons = {
  annotations: (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  weight: (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3a4 4 0 0 0-3.46 6H3l1.5 12h15L21 9h-5.54A4 4 0 0 0 12 3zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
    </svg>
  ),
  area: (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h4v4H7V7zm6 0h4v4h-4V7zm-6 6h4v4H7v-4zm6 0h4v4h-4v-4z" />
    </svg>
  ),
  images: (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
    </svg>
  ),
};

/* ── Main page ── */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDashboardSummary().then((d) => setData(d as DashboardSummary)),
      getHeatmapData()
        .then((d) => {
          const hm = d as { points: HeatmapPoint[] };
          if (hm.points.length > 0) setHeatmapPoints(hm.points);
        })
        .catch(() => {}), // origin not set — ignore
    ])
      .catch(() => setError("Could not load dashboard data — is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mission Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Live overview of plastic survey data across all processed drone imagery.
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-400">Live</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-ocean/20 border-t-ocean" />
          <p className="text-sm text-gray-500 animate-pulse">Loading mission data...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-coral/30 bg-coral/10 px-5 py-4 text-sm text-coral dark:text-coral-light">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* ── Hero stat cards ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <BigStat
              label="Total Annotations"
              value={data.total_annotations}
              suffix=""
              sub={`Across ${data.image_count} images`}
              icon={Icons.annotations}
              color="bg-gradient-to-br from-ocean-dark to-ocean"
              delay={0}
            />
            <BigStat
              label="Estimated Weight"
              value={data.total_weight_kg}
              suffix="kg"
              sub={`${data.total_weight_g.toLocaleString("en-US", { maximumFractionDigits: 0 })}g total`}
              icon={Icons.weight}
              color="bg-gradient-to-br from-coral to-coral-light"
              delay={100}
            />
            <BigStat
              label="Plastic Area"
              value={data.total_area_m2}
              suffix="m&sup2;"
              sub={`${data.total_area_cm2.toLocaleString("en-US", { maximumFractionDigits: 0 })} cm² detected`}
              icon={Icons.area}
              color="bg-gradient-to-br from-navy-mid to-ocean-dark"
              delay={200}
            />
            <BigStat
              label="Images Processed"
              value={data.image_count}
              suffix=""
              sub={`${data.hotspot_count} hotspots detected`}
              icon={Icons.images}
              color="bg-gradient-to-br from-emerald-600 to-emerald-500"
              delay={300}
            />
          </div>

          {/* ── Secondary stats row ── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-navy-light/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Avg Density</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-ocean-light">
                {data.avg_density_g_per_m2.toFixed(2)} <span className="text-xs font-normal text-gray-500">g/m&sup2;</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-navy-light/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Buried Estimate</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-coral-light">
                {data.buried_estimate_kg.low}&ndash;{data.buried_estimate_kg.high}{" "}
                <span className="text-xs font-normal text-gray-500">kg</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-navy-light/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Surveyed Area</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-400">
                {data.surveyed_area_m2.toFixed(1)} <span className="text-xs font-normal text-gray-500">m&sup2;</span>
              </p>
            </div>
          </div>

          {/* ── Label breakdown + Donut + Map ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Label breakdown */}
            <div className="rounded-2xl border border-white/10 bg-navy-light/40 p-5">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
                Trash Type Breakdown
              </h2>
              {data.label_breakdown.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {data.label_breakdown.slice(0, 10).map((item, i) => (
                    <LabelBar
                      key={item.label}
                      item={item}
                      maxCount={data.label_breakdown[0].count}
                      index={i}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No label data available.</p>
              )}
            </div>

            {/* Donut */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-navy-light/40 p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">
                Annotation Distribution
              </h2>
              <DonutChart items={data.label_breakdown} />
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
                {data.label_breakdown.slice(0, 6).map((item, i) => {
                  const colors = [
                    "bg-ocean", "bg-ocean-light", "bg-coral", "bg-coral-light",
                    "bg-emerald-500", "bg-violet-500",
                  ];
                  return (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${colors[i % colors.length]}`} />
                      <span className="text-[10px] text-gray-400">
                        {item.label.replace(/_/g, " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Map */}
            <div className="overflow-hidden rounded-2xl border border-white/10 shadow-lg" style={{ minHeight: 320 }}>
              <MapView geojson={data.geojson} heatmapPoints={heatmapPoints} />
            </div>
          </div>

          {/* ── Top Pollution Zones table ── */}
          <div className="rounded-2xl border border-white/10 bg-navy-light/40 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
              Top Pollution Zones
            </h2>
            {data.zones.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      <th className="pb-2 pr-3">Rank</th>
                      <th className="pb-2 pr-3">Zone</th>
                      <th className="pb-2 pr-3 text-right">Annotations</th>
                      <th className="pb-2 pr-3 text-right">Area</th>
                      <th className="pb-2 text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.zones.slice(0, 10).map((zone, i) => (
                      <ZoneRow key={zone.image_id} zone={zone} rank={i + 1} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No zones available.</p>
            )}
          </div>

          {/* ── Raccoon assistant ── */}
          <div className="rounded-2xl border border-white/10 bg-navy-light/40 shadow-lg" style={{ height: 400 }}>
            <Raccoon mapContext={data.geojson} dashboardData={data} />
          </div>
        </>
      )}
    </div>
  );
}
