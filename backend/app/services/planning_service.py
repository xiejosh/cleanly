import json

from openai import AsyncOpenAI

from app.config import settings
from app.models.schemas import (
    PlanExpeditionRequest,
    ExpeditionPlan,
    VesselRecommendation,
    EmployeeAssignment,
)
from app.services.cvat_service import get_cached_images, get_cached_annotations
from app.services.employee_service import list_employees

# Constants from spec (same as analysis_service)
AREA_PER_PIXEL_CM2 = 0.25  # (0.5 cm/pixel)^2
WEIGHT_PER_PIXEL_G = 0.12  # 0.25 cm^2 * 0.48 g/cm^2

PLANNING_SYSTEM_PROMPT = """\
You are an expedition planning agent for ocean plastic cleanup operations.

Given trash quantification data (weight in kg, area in m^2, number of hotspots) and an employee directory, produce a structured expedition plan.

Consider:
- Heavier loads need larger/more vessels.
- Match employee skills to required roles (divers, boat operators, logistics, scientists).
- Prefer available employees.
- Be concise but justify each recommendation.

Return ONLY valid JSON matching this schema:
{
  "site_name": string,
  "summary": string,
  "total_estimated_weight_kg": number,
  "total_area_m2": number,
  "vessels": [{"vessel_type": string, "count": number, "rationale": string}],
  "team": [{"employee_id": string, "name": string, "role": string, "skills": [string], "rationale": string}],
  "estimated_duration_days": number,
  "notes": string
}
"""


async def generate_expedition_plan(request: PlanExpeditionRequest) -> ExpeditionPlan:
    """Use OpenAI to generate an expedition plan from analysis data + employee directory."""
    images = get_cached_images()
    employees = await list_employees()

    # Aggregate metrics directly from persisted annotations
    total_weight_kg = 0.0
    total_area_cm2 = 0.0
    image_count = 0

    target_ids = request.image_ids or list(images.keys())
    for iid in target_ids:
        annotations = get_cached_annotations(iid)
        if not annotations:
            continue
        total_pixels = sum((ann.pixel_area or 0) for ann in annotations)
        total_weight_kg += total_pixels * WEIGHT_PER_PIXEL_G / 1000.0
        total_area_cm2 += total_pixels * AREA_PER_PIXEL_CM2
        image_count += 1

    total_area_m2 = total_area_cm2 / 10_000

    user_prompt = json.dumps({
        "site_name": request.site_name,
        "total_estimated_weight_kg": round(total_weight_kg, 2),
        "total_area_m2": round(total_area_m2, 4),
        "images_analyzed": image_count,
        "notes": request.notes,
        "employees": [e.model_dump() for e in employees],
    })

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": PLANNING_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    plan_data = json.loads(response.choices[0].message.content)
    return ExpeditionPlan(**plan_data)
