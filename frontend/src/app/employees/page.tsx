"use client";

import { useEffect, useState } from "react";
import { getEmployees } from "@/lib/api";
import type { Employee } from "@/lib/types";

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
      <h1 className="mb-4 text-2xl font-bold">Employee Directory</h1>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">{emp.name}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    emp.available
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  }`}
                >
                  {emp.available ? "Available" : "Unavailable"}
                </span>
              </div>
              <p className="text-sm text-gray-500">{emp.role}</p>
              <p className="text-sm text-gray-500">{emp.email}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {emp.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
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
