from pydantic import BaseModel


# --- Auth ---
class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    user_id: str


# --- CVAT ---
class CvatSyncRequest(BaseModel):
    task_id: int | None = None  # sync specific task, or all if None


class CvatImage(BaseModel):
    id: int
    name: str
    width: int
    height: int
    task_id: int


class CvatAnnotation(BaseModel):
    id: int
    image_id: int
    label: str
    points: list[list[float]]  # polygon vertices [[x,y], ...]
    pixel_area: float | None = None


class CvatSyncResponse(BaseModel):
    images: list[CvatImage]
    annotations_count: int


# --- Analysis ---
class AnalysisResult(BaseModel):
    image_id: int
    image_name: str
    total_detected_pixels: float
    area_cm2: float
    estimated_weight_g: float
    estimated_weight_kg: float
    annotation_count: int
    annotations: list[CvatAnnotation]


# --- Map / GeoJSON ---
class GeoCoordinate(BaseModel):
    lat: float
    lng: float


class ImageGeoReference(BaseModel):
    image_id: int
    center: GeoCoordinate
    ground_resolution_cm_per_pixel: float = 0.5


class GeoReferenceRequest(BaseModel):
    image_id: int
    lat: float
    lng: float
    ground_resolution_cm_per_pixel: float = 0.5


class GlobalOriginRequest(BaseModel):
    lat: float
    lng: float
    ground_resolution_cm_per_pixel: float = 0.5


class HeatmapPoint(BaseModel):
    image_id: int
    image_name: str
    lat: float
    lng: float
    annotation_count: int
    total_weight_g: float


class HeatmapResponse(BaseModel):
    origin: GeoCoordinate
    points: list[HeatmapPoint]
    total_images_georeferenced: int


class MapFeature(BaseModel):
    type: str = "Feature"
    geometry: dict
    properties: dict


class MapFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[MapFeature]


# --- Expedition Planning ---
class PlanExpeditionRequest(BaseModel):
    image_ids: list[int] | None = None  # images to include in planning
    site_name: str = "Unknown Site"
    notes: str = ""


class VesselRecommendation(BaseModel):
    vessel_type: str
    count: int
    rationale: str


class EmployeeAssignment(BaseModel):
    employee_id: str
    name: str
    role: str
    skills: list[str]
    rationale: str


class ExpeditionPlan(BaseModel):
    site_name: str
    summary: str
    total_estimated_weight_kg: float
    total_area_m2: float
    vessels: list[VesselRecommendation]
    team: list[EmployeeAssignment]
    estimated_duration_days: int
    notes: str


# --- Employees ---
class Employee(BaseModel):
    id: str
    name: str
    email: str
    role: str
    skills: list[str]
    available: bool = True
