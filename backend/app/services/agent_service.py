import json

from openai import AsyncOpenAI

from app.config import settings
from app.services.cvat_service import get_cached_images, get_cached_annotations
from app.services.analysis_service import (
    get_all_results,
    AREA_PER_PIXEL_CM2,
    WEIGHT_PER_PIXEL_G,
)
from app.services.employee_service import list_employees

RACCOON_SYSTEM_PROMPT = """\
You are Raccoon, a knowledgeable AI assistant for the Cleanly ocean plastic \
cleanup platform built for Plastic Odyssey. You help mission planners understand \
drone-based plastic survey data, plan cleanup operations, and make decisions.

You will receive a structured data context containing:
- **Survey totals**: total plastic area (cm² and m²), weight (g and kg), \
annotation count, surveyed area, and average density.
- **Buried plastic estimate**: a low–high range representing plastic hidden \
under sand/vegetation that drones cannot see (30-70% of surface plastic).
- **Per-zone breakdowns**: each image/zone with its own annotation count, \
area, and weight.
- **Hotspot summary**: zones ranked by plastic weight.
- **Employee roster**: team members with roles, skills, and availability.
- **Map context** (optional): GeoJSON features the user is viewing.

Guidelines:
- Use specific numbers from the data. Never make up statistics.
- Present weights in grams for <1 kg, kilograms otherwise.
- Present areas in cm² for <10,000 cm², m² otherwise.
- All weight estimates are surface-visible only. Always remind users that \
buried plastic (30-70% additional) is not captured by drone imagery.
- For cleanup planning, use ~5 kg/person/hour for accessible coastal debris.
- When asked about priorities, rank zones by weight descending.
- If no data is loaded (0 images), tell the user to sync from CVAT first.
- Format responses with markdown: use **bold** for key figures, bullet lists \
for breakdowns, and headers for sections when appropriate.
- Keep responses under 400 words unless the user asks for detail.
- You can reference previous messages in the conversation for follow-ups.
"""


def _build_full_context() -> dict:
    """Build a comprehensive data context from all preprocessed backend data."""
    images = get_cached_images()
    results = get_all_results()

    zones = []
    total_pixels = 0.0
    total_annotations = 0

    for img_id, img in images.items():
        annotations = get_cached_annotations(img_id)
        analysis = results.get(img_id)

        img_pixels = 0.0
        for ann in annotations:
            area = ann.pixel_area if ann.pixel_area is not None else 0.0
            img_pixels += area

        img_area_cm2 = img_pixels * AREA_PER_PIXEL_CM2
        img_weight_g = img_pixels * WEIGHT_PER_PIXEL_G

        zone = {
            "image_id": img_id,
            "name": img.name,
            "dimensions": f"{img.width}x{img.height}",
            "annotation_count": len(annotations),
            "area_cm2": round(img_area_cm2, 2),
            "weight_g": round(img_weight_g, 2),
            "weight_kg": round(img_weight_g / 1000, 4),
        }

        if analysis:
            zone["analysis_computed"] = True
            zone["analysis"] = {
                "area_cm2": round(analysis.area_cm2, 2),
                "weight_g": round(analysis.estimated_weight_g, 2),
                "weight_kg": round(analysis.estimated_weight_kg, 4),
                "detected_pixels": round(analysis.total_detected_pixels, 1),
            }

        zones.append(zone)
        total_pixels += img_pixels
        total_annotations += len(annotations)

    total_area_cm2 = total_pixels * AREA_PER_PIXEL_CM2
    total_area_m2 = total_area_cm2 / 10_000
    total_weight_g = total_pixels * WEIGHT_PER_PIXEL_G
    total_weight_kg = total_weight_g / 1000

    surveyed_px = sum(img.width * img.height for img in images.values())
    surveyed_area_m2 = surveyed_px * AREA_PER_PIXEL_CM2 / 10_000

    avg_density_g_per_m2 = (
        total_weight_g / surveyed_area_m2 if surveyed_area_m2 > 0 else 0
    )

    surface_kg = total_weight_kg
    buried_low = surface_kg * 0.3
    buried_high = surface_kg * 0.7

    hotspots = sorted(zones, key=lambda z: z["weight_g"], reverse=True)[:10]

    return {
        "survey_totals": {
            "images_synced": len(images),
            "images_analyzed": len(results),
            "total_annotations": total_annotations,
            "total_area_cm2": round(total_area_cm2, 2),
            "total_area_m2": round(total_area_m2, 4),
            "total_weight_g": round(total_weight_g, 2),
            "total_weight_kg": round(total_weight_kg, 4),
            "surveyed_area_m2": round(surveyed_area_m2, 4),
            "avg_density_g_per_m2": round(avg_density_g_per_m2, 4),
        },
        "buried_plastic_estimate": {
            "note": "Drone imagery only captures surface plastic. 30-70% additional plastic is typically buried or hidden.",
            "surface_kg": round(surface_kg, 4),
            "buried_low_kg": round(buried_low, 4),
            "buried_high_kg": round(buried_high, 4),
            "total_estimated_low_kg": round(surface_kg + buried_low, 4),
            "total_estimated_high_kg": round(surface_kg + buried_high, 4),
        },
        "top_hotspots": hotspots,
        "all_zones": zones,
    }


async def chat(
    message: str,
    map_context: dict | None = None,
    history: list[dict] | None = None,
) -> str:
    """Send a user question to GPT-4o with full preprocessed data context."""
    dataset = _build_full_context()
    employees = await list_employees()

    context_parts = [
        "## Survey Data\n```json\n" + json.dumps(dataset, indent=2) + "\n```",
        "## Team Roster\n```json\n"
        + json.dumps([e.model_dump() for e in employees], indent=2)
        + "\n```",
    ]

    if map_context:
        feature_count = len(map_context.get("features", []))
        summary = {"type": "FeatureCollection", "feature_count": feature_count}
        if feature_count <= 50:
            summary["features"] = map_context.get("features", [])
        else:
            summary["features_sample"] = map_context.get("features", [])[:30]
            summary["note"] = f"Showing 30 of {feature_count} features"

        context_parts.append(
            "## Map View (GeoJSON)\n```json\n"
            + json.dumps(summary, indent=2)
            + "\n```"
        )

    context_block = "\n\n".join(context_parts)

    messages = [{"role": "system", "content": RACCOON_SYSTEM_PROMPT}]

    if history:
        has_context = False
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user" and not has_context:
                content = f"{context_block}\n\n---\n\n**Question:** {content}"
                has_context = True
            messages.append({"role": role, "content": content})

        if not has_context:
            messages.append(
                {"role": "user", "content": f"{context_block}\n\n---\n\n**Question:** {message}"}
            )
        else:
            messages.append({"role": "user", "content": message})
    else:
        messages.append(
            {"role": "user", "content": f"{context_block}\n\n---\n\n**Question:** {message}"}
        )

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.4,
        max_tokens=1500,
    )

    return response.choices[0].message.content
