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
      <h1 className="mb-4 text-2xl font-bold">Expedition Planner</h1>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Site name"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          onClick={handlePlan}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Planning..." : "Generate Plan"}
        </button>
      </div>

      {plan && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
            <h2 className="mb-2 text-xl font-semibold">{plan.site_name}</h2>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              {plan.summary}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="Est. Weight"
                value={`${plan.total_estimated_weight_kg.toFixed(1)} kg`}
              />
              <Stat
                label="Area"
                value={`${plan.total_area_m2.toFixed(2)} m²`}
              />
              <Stat label="Duration" value={`${plan.estimated_duration_days} days`} />
              <Stat label="Vessels" value={plan.vessels.length} />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Vessels</h2>
            <div className="space-y-2">
              {plan.vessels.map((v, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
                >
                  <p className="font-medium">
                    {v.count}x {v.vessel_type}
                  </p>
                  <p className="text-sm text-gray-500">{v.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Team</h2>
            <div className="space-y-2">
              {plan.team.map((m) => (
                <div
                  key={m.employee_id}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
                >
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-gray-500">
                    {m.role} &middot; {m.skills.join(", ")}
                  </p>
                  <p className="mt-1 text-sm italic text-gray-400">
                    {m.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {plan.notes && (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-400">
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
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
