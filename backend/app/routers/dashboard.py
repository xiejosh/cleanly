from fastapi import APIRouter

from app.services.cvat_service import get_cached_images, get_cached_annotations
from app.services.analysis_service import AREA_PER_PIXEL_CM2, WEIGHT_PER_PIXEL_G
from app.services.geo_service import get_all_georefs, get_map_features, get_global_origin

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary():
    """Aggregate stats from all cached CVAT data."""
    images = get_cached_images()
    georefs = get_all_georefs()

    total_annotations = 0
    total_pixel_area = 0.0
    label_counts: dict[str, int] = {}
    label_area: dict[str, float] = {}
    zones: list[dict] = []

    for img_id, img in images.items():
        annotations = get_cached_annotations(img_id)
        img_pixel_area = 0.0

        for ann in annotations:
            pa = ann.pixel_area or 0.0
            img_pixel_area += pa
            total_annotations += 1
            label_counts[ann.label] = label_counts.get(ann.label, 0) + 1
            label_area[ann.label] = label_area.get(ann.label, 0.0) + pa

        total_pixel_area += img_pixel_area

        if annotations:
            area_cm2 = img_pixel_area * AREA_PER_PIXEL_CM2
            weight_g = img_pixel_area * WEIGHT_PER_PIXEL_G
            zones.append({
                "image_id": img_id,
                "image_name": img.name,
                "annotation_count": len(annotations),
                "area_cm2": round(area_cm2, 2),
                "weight_g": round(weight_g, 2),
                "weight_kg": round(weight_g / 1000.0, 4),
            })

    total_area_cm2 = total_pixel_area * AREA_PER_PIXEL_CM2
    total_area_m2 = total_area_cm2 / 10_000
    total_weight_g = total_pixel_area * WEIGHT_PER_PIXEL_G
    total_weight_kg = total_weight_g / 1000.0

    # Surveyed area = sum of all image pixel areas in m²
    surveyed_pixels = sum(img.width * img.height for img in images.values())
    surveyed_area_m2 = surveyed_pixels * AREA_PER_PIXEL_CM2 / 10_000

    avg_density_g_per_cm2 = (total_weight_g / total_area_cm2) if total_area_cm2 > 0 else 0
    avg_density_g_per_m2 = avg_density_g_per_cm2 * 10_000

    # Buried plastic estimate: 5x-25x surface visible
    buried_low = round(total_weight_kg * 5, 2)
    buried_high = round(total_weight_kg * 25, 2)

    # Hotspot = images with > 5 annotations
    hotspot_count = sum(1 for z in zones if z["annotation_count"] > 5)

    # Build label breakdown for charts
    label_breakdown = sorted(
        [
            {
                "label": label,
                "count": label_counts[label],
                "area_cm2": round(label_area[label] * AREA_PER_PIXEL_CM2, 2),
                "weight_g": round(label_area[label] * WEIGHT_PER_PIXEL_G, 2),
            }
            for label in label_counts
        ],
        key=lambda x: x["count"],
        reverse=True,
    )

    # Build GeoJSON from all georeferenced images
    geojson_features = []
    for img_id in images:
        if img_id in georefs:
            try:
                fc = await get_map_features(img_id)
                geojson_features.extend(fc.features)
            except Exception:
                pass

    # Sort zones by weight descending
    zones.sort(key=lambda z: z["weight_g"], reverse=True)

    return {
        "total_annotations": total_annotations,
        "total_area_cm2": round(total_area_cm2, 2),
        "total_area_m2": round(total_area_m2, 4),
        "total_weight_g": round(total_weight_g, 2),
        "total_weight_kg": round(total_weight_kg, 4),
        "avg_density_g_per_cm2": round(avg_density_g_per_cm2, 6),
        "avg_density_g_per_m2": round(avg_density_g_per_m2, 4),
        "buried_estimate_kg": {"low": buried_low, "high": buried_high},
        "hotspot_count": hotspot_count,
        "image_count": len(images),
        "annotation_count": total_annotations,
        "surveyed_area_m2": round(surveyed_area_m2, 4),
        "label_breakdown": label_breakdown,
        "zones": zones[:20],  # top 20 zones
        "geojson": {"type": "FeatureCollection", "features": [f.model_dump() for f in geojson_features]},
    }
