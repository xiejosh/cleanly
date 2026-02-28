import re
import math

from fastapi import HTTPException

from app.models.schemas import (
    MapFeature,
    MapFeatureCollection,
    GeoCoordinate,
    ImageGeoReference,
    HeatmapPoint,
    HeatmapResponse,
)
from app.services.cvat_service import get_cached_annotations, get_cached_images
from app.services.analysis_service import get_all_results
from app.services.store import load_json, save_json

# Store georeferencing info per image.
# In production this comes from drone EXIF/metadata.
# For the hackathon, register manually or extract from image metadata.
_georefs: dict[int, ImageGeoReference] = {}

# Global mosaic origin (set via register_global_origin)
_global_origin: GeoCoordinate | None = None


def register_georeference(image_id: int, center: GeoCoordinate, resolution: float = 0.5):
    """Register georeferencing data for an image."""
    _georefs[image_id] = ImageGeoReference(
        image_id=image_id,
        center=center,
        ground_resolution_cm_per_pixel=resolution,
    )
    _save_to_disk()


def _pixel_to_geo(
    px: float, py: float, image_width: int, image_height: int, georef: ImageGeoReference
) -> tuple[float, float]:
    """Convert pixel coords to lat/lng using simple offset from image center.

    This is a simplified linear transform suitable for small drone images.
    For production, use proper affine/homography transforms.
    """
    res_deg = georef.ground_resolution_cm_per_pixel / 100 / 111_320  # rough cm -> degrees

    dx = px - image_width / 2
    dy = py - image_height / 2

    lng = georef.center.lng + dx * res_deg
    lat = georef.center.lat - dy * res_deg  # y increases downward in image

    return lat, lng


async def get_map_features(image_id: int) -> MapFeatureCollection:
    """Build GeoJSON FeatureCollection from annotations + georef."""
    images = get_cached_images()
    if image_id not in images:
        raise HTTPException(status_code=404, detail=f"Image {image_id} not found.")

    image = images[image_id]
    annotations = get_cached_annotations(image_id)

    if image_id not in _georefs:
        raise HTTPException(
            status_code=400,
            detail=f"No georeference registered for image {image_id}. Register via the API or provide drone metadata.",
        )

    georef = _georefs[image_id]
    results = get_all_results()
    analysis = results.get(image_id)

    features: list[MapFeature] = []
    for ann in annotations:
        coords = [
            list(reversed(_pixel_to_geo(p[0], p[1], image.width, image.height, georef)))
            for p in ann.points
        ]
        # Close the polygon ring
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])

        feature = MapFeature(
            geometry={"type": "Polygon", "coordinates": [coords]},
            properties={
                "annotation_id": ann.id,
                "label": ann.label,
                "pixel_area": ann.pixel_area,
                "weight_g": (ann.pixel_area or 0) * 0.12,
            },
        )
        features.append(feature)

    return MapFeatureCollection(features=features)


# --- Global Origin Georeferencing ---

_FILENAME_PATTERN = re.compile(r"_y(\d+)_x(\d+)\.")


def _parse_pixel_offsets(filename: str) -> tuple[int, int] | None:
    """Extract (x_pixels, y_pixels) from a filename like '1-5_y23100_x15708.jpg'."""
    m = _FILENAME_PATTERN.search(filename)
    if not m:
        return None
    y_px = int(m.group(1))
    x_px = int(m.group(2))
    return (x_px, y_px)


def _offset_to_geo(
    x_px: int,
    y_px: int,
    width: int,
    height: int,
    origin: GeoCoordinate,
    resolution_cm: float,
) -> GeoCoordinate:
    """Compute the image center lat/lng from its pixel offset in the mosaic.

    Origin is the bottom-left of the mosaic.
    Y increases northward, X increases eastward.
    """
    resolution_m = resolution_cm / 100.0  # cm -> m

    # Image center in pixels from the mosaic origin
    center_x_px = x_px + width / 2.0
    center_y_px = y_px + height / 2.0

    # Convert pixel offsets to meters
    dy_m = center_y_px * resolution_m  # northward
    dx_m = center_x_px * resolution_m  # eastward

    # Degrees per meter
    deg_per_m_lat = 1.0 / 111_320.0
    lat = origin.lat + dy_m * deg_per_m_lat

    deg_per_m_lng = 1.0 / (111_320.0 * math.cos(math.radians(origin.lat)))
    lng = origin.lng + dx_m * deg_per_m_lng

    return GeoCoordinate(lat=lat, lng=lng)


def register_global_origin(origin: GeoCoordinate, resolution_cm: float = 0.5) -> int:
    """Set mosaic origin and compute georef for every cached image from filename offsets.

    Returns the number of images successfully georeferenced.
    """
    global _global_origin
    _global_origin = origin

    images = get_cached_images()
    count = 0
    for img_id, img in images.items():
        offsets = _parse_pixel_offsets(img.name)
        if offsets is None:
            continue
        x_px, y_px = offsets
        center = _offset_to_geo(x_px, y_px, img.width, img.height, origin, resolution_cm)
        _georefs[img_id] = ImageGeoReference(
            image_id=img_id,
            center=center,
            ground_resolution_cm_per_pixel=resolution_cm,
        )
        count += 1
    _save_to_disk()
    return count


def get_all_georefs() -> dict[int, ImageGeoReference]:
    """Return the georef dict so the frontend can display coordinates per image."""
    return _georefs


def get_global_origin() -> GeoCoordinate | None:
    """Return the current global origin, or None if not set."""
    return _global_origin


def get_heatmap_data() -> HeatmapResponse:
    """Build heatmap data from georeferenced images that have annotations."""
    if _global_origin is None:
        raise HTTPException(status_code=400, detail="Global origin not set. Call POST /map/global-origin first.")

    results = get_all_results()
    points: list[HeatmapPoint] = []
    images = get_cached_images()

    for img_id, georef in _georefs.items():
        annotations = get_cached_annotations(img_id)
        if not annotations:
            continue

        analysis = results.get(img_id)
        total_weight = analysis.estimated_weight_g if analysis else sum(
            (ann.pixel_area or 0) * 0.12 for ann in annotations
        )

        img = images.get(img_id)
        points.append(HeatmapPoint(
            image_id=img_id,
            image_name=img.name if img else f"image_{img_id}",
            lat=georef.center.lat,
            lng=georef.center.lng,
            annotation_count=len(annotations),
            total_weight_g=total_weight,
        ))

    return HeatmapResponse(
        origin=_global_origin,
        points=points,
        total_images_georeferenced=len(_georefs),
    )


def load_from_disk() -> None:
    """Restore _georefs and _global_origin from db/georefs.json."""
    global _global_origin
    data = load_json("georefs.json")
    for k, v in data.get("georefs", {}).items():
        _georefs[int(k)] = ImageGeoReference(**v)
    origin = data.get("global_origin")
    if origin is not None:
        _global_origin = GeoCoordinate(**origin)


def _save_to_disk() -> None:
    """Persist _georefs and _global_origin to db/georefs.json."""
    save_json("georefs.json", {
        "georefs": {str(k): v.model_dump() for k, v in _georefs.items()},
        "global_origin": _global_origin.model_dump() if _global_origin else None,
    })
