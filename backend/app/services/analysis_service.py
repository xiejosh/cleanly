from fastapi import HTTPException
from shapely.geometry import Polygon

from app.models.schemas import AnalysisResult, CvatAnnotation
from app.services.cvat_service import get_cached_images, get_cached_annotations

# Constants from spec
GROUND_RESOLUTION_CM = 0.5  # cm per pixel
AREA_PER_PIXEL_CM2 = GROUND_RESOLUTION_CM ** 2  # 0.25 cm^2/pixel
SURFACE_DENSITY_G_CM2 = 0.48  # g/cm^2
WEIGHT_PER_PIXEL_G = AREA_PER_PIXEL_CM2 * SURFACE_DENSITY_G_CM2  # 0.12 g/pixel

# Cache of computed results
_results: dict[int, AnalysisResult] = {}


def _compute_polygon_pixel_area(points: list[list[float]]) -> float:
    """Compute pixel area of a polygon using Shapely."""
    if len(points) < 3:
        return 0.0
    poly = Polygon(points)
    return poly.area


async def compute_analysis(image_id: int) -> AnalysisResult:
    """Compute trash area and weight for all annotations on an image."""
    images = get_cached_images()
    if image_id not in images:
        raise HTTPException(status_code=404, detail=f"Image {image_id} not found. Run /cvat/sync first.")

    image = images[image_id]
    annotations = get_cached_annotations(image_id)

    total_pixels = 0.0
    for ann in annotations:
        area = _compute_polygon_pixel_area(ann.points)
        ann.pixel_area = area
        total_pixels += area

    area_cm2 = total_pixels * AREA_PER_PIXEL_CM2
    weight_g = total_pixels * WEIGHT_PER_PIXEL_G
    weight_kg = weight_g / 1000.0

    result = AnalysisResult(
        image_id=image_id,
        image_name=image.name,
        total_detected_pixels=total_pixels,
        area_cm2=area_cm2,
        estimated_weight_g=weight_g,
        estimated_weight_kg=weight_kg,
        annotation_count=len(annotations),
        annotations=annotations,
    )
    _results[image_id] = result
    return result


async def get_analysis(image_id: int) -> AnalysisResult:
    """Retrieve a previously computed analysis."""
    if image_id not in _results:
        raise HTTPException(status_code=404, detail=f"No analysis for image {image_id}. Run POST /analysis/{image_id} first.")
    return _results[image_id]


def get_all_results() -> dict[int, AnalysisResult]:
    return _results
