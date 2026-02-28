from fastapi import APIRouter

from app.models.schemas import PlanExpeditionRequest, ExpeditionPlan
from app.services.planning_service import generate_expedition_plan

router = APIRouter(prefix="/plan-expedition", tags=["planning"])


@router.post("", response_model=ExpeditionPlan)
async def plan_expedition(request: PlanExpeditionRequest):
    """Run the planning agent to generate an expedition plan."""
    return await generate_expedition_plan(request)
