"use client";

import { useEffect, useState } from "react";
import { getEmployees } from "@/lib/api";
import type { Employee } from "@/lib/types";

const GRADIENTS = [
  "from-ocean to-ocean-light",
  "from-ocean-dark to-ocean",
  "from-emerald-500 to-ocean",
  "from-ocean to-navy-mid",
  "from-coral to-coral-light",
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const gradient = GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}
    >
      {initials}
    </div>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmployees()
      .then((data) => setEmployees(data as Employee[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Team Directory</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Available crew and specialists for cleanup expeditions.
      </p>

      {loading ? (
        <div className="flex items-center gap-3 py-8 text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-ocean/30 border-t-ocean" />
          <p className="text-sm">Loading team...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-navy-mid/60 dark:bg-navy-light"
            >
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={emp.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy dark:text-gray-100">
                    {emp.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">{emp.role}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    emp.available
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-coral/15 text-coral dark:text-coral-light"
                  }`}
                >
                  {emp.available ? "Available" : "Busy"}
                </span>
              </div>

              <a
                href={`mailto:${emp.email}`}
                className="mb-3 block truncate text-sm text-gray-500 hover:text-ocean dark:hover:text-ocean-light"
              >
                {emp.email}
              </a>

              <div className="flex flex-wrap gap-1.5">
                {emp.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-ocean/10 px-2.5 py-0.5 text-xs font-medium text-ocean-dark dark:text-ocean-light"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
