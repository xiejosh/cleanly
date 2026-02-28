"use client";

import { useState } from "react";
import { planExpedition } from "@/lib/api";
import type { ExpeditionPlan } from "@/lib/types";

export default function ExpeditionPage() {
  const [siteName, setSiteName] = useState("");
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState<ExpeditionPlan | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePlan() {
    setLoading(true);
    try {
      const data = (await planExpedition({
        site_name: siteName || "Unknown Site",
        notes,
      })) as ExpeditionPlan;
      setPlan(data);
    } catch (err) {
      console.error(err);
      alert("Planning failed — ensure analysis has been run first.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Expedition Planner</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        AI-powered logistics planning for your cleanup mission.
      </p>

      {/* Form */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-mid/60 dark:bg-navy-light">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Site Details
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Site Name
            </label>
            <input
              type="text"
              placeholder="e.g. Coral Bay North"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean dark:border-navy-mid dark:bg-navy-light dark:text-gray-100"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Additional Notes{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. High tide at 2pm, remote access only"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean dark:border-navy-mid dark:bg-navy-light dark:text-gray-100"
            />
          </div>
          <button
            onClick={handlePlan}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-coral px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-coral/90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Planning...
              </>
            ) : (
              "Generate Plan"
            )}
          </button>
        </div>
      </div>

      {plan && (
        <div className="space-y-6">
          {/* Summary card */}
          <div className="rounded-2xl border border-ocean/30 bg-gradient-to-br from-navy-light to-navy-mid p-6 shadow-sm">
            <h2 className="mb-1 text-xl font-bold text-white">
              {plan.site_name}
            </h2>
            <p className="mb-5 leading-relaxed text-ocean-light/70">
              {plan.summary}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Est. Weight" value={`${plan.total_estimated_weight_kg.toFixed(1)} kg`} />
              <Stat label="Survey Area" value={`${plan.total_area_m2.toFixed(2)} m²`} />
              <Stat label="Duration" value={`${plan.estimated_duration_days} days`} />
              <Stat label="Vessels" value={plan.vessels.length} />
            </div>
          </div>

          {/* Vessels */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Vessels</h2>
            <div className="space-y-3">
              {plan.vessels.map((v, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-navy-mid/60 dark:bg-navy-light"
                >
                  <p className="font-semibold text-navy dark:text-gray-100">
                    {v.count}× {v.vessel_type}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{v.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Assigned Team</h2>
            <div className="space-y-3">
              {plan.team.map((m) => (
                <div
                  key={m.employee_id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-navy-mid/60 dark:bg-navy-light"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-semibold text-navy dark:text-gray-100">
                      {m.name}
                    </p>
                    <span className="rounded-full bg-ocean/15 px-2.5 py-0.5 text-xs font-medium text-ocean-dark dark:text-ocean-light">
                      {m.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{m.skills.join(", ")}</p>
                  <p className="mt-1 text-sm italic text-gray-400">{m.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          {plan.notes && (
            <div className="rounded-xl border border-coral-light/30 bg-coral-light/10 p-4 text-sm text-coral dark:text-coral-light">
              {plan.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 shadow-sm backdrop-blur">
      <p className="text-xs text-ocean-light/60">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
