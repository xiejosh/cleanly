"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { HeatmapPoint } from "@/lib/types";

// leaflet.heat patches the L global — must use require() so it finds the right object
if (typeof window !== "undefined") {
  require("leaflet.heat");
}

interface Props {
  points: HeatmapPoint[];
}

export default function HeatmapLayer({ points }: Props) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (points.length === 0) return;

    // Normalize annotation counts to 0–1
    const maxCount = Math.max(...points.map((p) => p.annotation_count));
    const minCount = Math.min(...points.map((p) => p.annotation_count));
    const range = maxCount - minCount || 1;

    const data: [number, number, number][] = points.map((p) => [
      p.lat,
      p.lng,
      (p.annotation_count - minCount) / range,
    ] as [number, number, number]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heat = (L as any).heatLayer(data, {
      radius: 18,
      blur: 12,
      maxZoom: 23,
      minOpacity: 0.3,
      max: 1,
      gradient: {
        0.0: "#313695",
        0.25: "#4575b4",
        0.5: "#fee090",
        0.75: "#f46d43",
        1.0: "#a50026",
      },
    });

    // Patch _redraw to survive null _map (leaflet.heat bug with React)
    const origRedraw = heat._redraw.bind(heat);
    heat._redraw = function () {
      if (!this._map) return;
      origRedraw();
    };

    heat.addTo(map);
    layerRef.current = heat;

    // Zoom-adaptive radius: scale radius with zoom level
    function updateRadius() {
      if (!heat._map) return;
      const zoom = map.getZoom();
      // Base radius 18 at zoom 15, scale up as user zooms in
      const adaptiveRadius = Math.max(8, Math.round(18 * Math.pow(1.15, zoom - 15)));
      heat.setOptions({ radius: adaptiveRadius });
    }
    map.on("zoomend", updateRadius);
    // Defer first call so the layer is fully attached
    requestAnimationFrame(updateRadius);

    return () => {
      map.off("zoomend", updateRadius);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [points, map]);

  return null;
}
