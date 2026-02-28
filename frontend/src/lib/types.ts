// Mirrors backend schemas

export interface CvatImage {
  id: number;
  name: string;
  width: number;
  height: number;
  task_id: number;
}

export interface CvatAnnotation {
  id: number;
  image_id: number;
  label: string;
  points: number[][];
  pixel_area: number | null;
}

export interface CvatSyncResponse {
  images: CvatImage[];
  annotations_count: number;
}

export interface AnalysisResult {
  image_id: number;
  image_name: string;
  total_detected_pixels: number;
  area_cm2: number;
  estimated_weight_g: number;
  estimated_weight_kg: number;
  annotation_count: number;
  annotations: CvatAnnotation[];
}

export interface MapFeature {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: {
    annotation_id: number;
    label: string;
    pixel_area: number | null;
    weight_g: number;
  };
}

export interface MapFeatureCollection {
  type: "FeatureCollection";
  features: MapFeature[];
}

export interface VesselRecommendation {
  vessel_type: string;
  count: number;
  rationale: string;
}

export interface EmployeeAssignment {
  employee_id: string;
  name: string;
  role: string;
  skills: string[];
  rationale: string;
}

export interface ExpeditionPlan {
  site_name: string;
  summary: string;
  total_estimated_weight_kg: number;
  total_area_m2: number;
  vessels: VesselRecommendation[];
  team: EmployeeAssignment[];
  estimated_duration_days: number;
  notes: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  skills: string[];
  available: boolean;
}

export interface ItineraryStop {
  id: number;
  label: string;
  lat: number;
  lng: number;
  weight_g: number;
  pixel_area: number | null;
}

export interface HeatmapCell {
  row: number;
  col: number;
  lat: number;
  lng: number;
  density_g_per_m2: number;
  weight_g: number;
  annotation_count: number;
}

export interface ZoneSummary {
  image_id: number;
  image_name: string;
  annotation_count: number;
  area_cm2: number;
  weight_g: number;
  weight_kg: number;
}

export interface DashboardSummary {
  total_area_cm2: number;
  total_area_m2: number;
  total_weight_g: number;
  total_weight_kg: number;
  avg_density_g_per_cm2: number;
  avg_density_g_per_m2: number;
  buried_estimate_kg: { low: number; high: number };
  hotspot_count: number;
  image_count: number;
  annotation_count: number;
  surveyed_area_m2: number;
  zones: ZoneSummary[];
  heatmap: HeatmapCell[];
  geojson: MapFeatureCollection;
}
