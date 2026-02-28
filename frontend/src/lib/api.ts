const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// --- CVAT ---
export function syncCvat(taskId?: number) {
  return request("/cvat/sync", {
    method: "POST",
    body: JSON.stringify({ task_id: taskId ?? null }),
  });
}

export function getImages() {
  return request("/cvat/images");
}

export function getFrameUrl(taskId: number, frame: number): string {
  return `${API_URL}/cvat/images/${taskId}/frames/${frame}`;
}

// --- Analysis ---
export function runAnalysis(imageId: number) {
  return request(`/analysis/${imageId}`, { method: "POST" });
}

export function getAnalysis(imageId: number) {
  return request(`/analysis/${imageId}`);
}

// --- Map ---
export function getMapFeatures(imageId: number) {
  return request(`/map/${imageId}`);
}

export function registerGeoreference(
  imageId: number,
  lat: number,
  lng: number,
  groundResolution?: number
) {
  return request("/map/georeference", {
    method: "POST",
    body: JSON.stringify({
      image_id: imageId,
      lat,
      lng,
      ...(groundResolution !== undefined && {
        ground_resolution_cm_per_pixel: groundResolution,
      }),
    }),
  });
}

// --- Expedition Planning ---
export function planExpedition(body: {
  image_ids?: number[];
  site_name?: string;
  notes?: string;
}) {
  return request("/plan-expedition", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// --- Employees ---
export function getEmployees() {
  return request("/employees");
}
