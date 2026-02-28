from fastapi import HTTPException

from app.models.schemas import (
    MapFeature,
    MapFeatureCollection,
    GeoCoordinate,
    ImageGeoReference,
)
from app.services.cvat_service import get_cached_annotations, get_cached_images
from app.services.analysis_service import get_all_results

# Store georeferencing info per image.
# In production this comes from drone EXIF/metadata.
# For the hackathon, register manually or extract from image metadata.
_georefs: dict[int, ImageGeoReference] = {}


def register_georeference(image_id: int, center: GeoCoordinate, resolution: float = 0.5):
    """Register georeferencing data for an image."""
    _georefs[image_id] = ImageGeoReference(
        image_id=image_id,
        center=center,
        ground_resolution_cm_per_pixel=resolution,
    )


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
