import * as L from "leaflet";

declare module "leaflet" {
  type HeatLatLngTuple = [number, number, number]; // [lat, lng, intensity]

  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  function heatLayer(
    latlngs: HeatLatLngTuple[],
    options?: HeatLayerOptions
  ): L.Layer;
}
