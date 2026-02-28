"use client";

import { useState } from "react";
import { syncCvat } from "@/lib/api";
import type { CvatSyncResponse, CvatImage } from "@/lib/types";

export default function ImagesPage() {
  const [images, setImages] = useState<CvatImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState("");

  async function handleSync() {
    setLoading(true);
    try {
      const data = (await syncCvat(
        taskId ? parseInt(taskId) : undefined
      )) as CvatSyncResponse;
      setImages(data.images);
    } catch (err) {
      console.error(err);
      alert("Sync failed — check backend connection and CVAT credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">CVAT Images</h1>
      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          placeholder="Task ID (optional)"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          onClick={handleSync}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Sync from CVAT"}
        </button>
      </div>

      {images.length === 0 ? (
        <p className="text-gray-500">
          No images loaded. Click &quot;Sync from CVAT&quot; to pull imagery.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <p className="font-medium">{img.name}</p>
              <p className="text-sm text-gray-500">
                {img.width} x {img.height} &middot; Task {img.task_id}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
