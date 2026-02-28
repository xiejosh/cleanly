from fastapi import APIRouter

from app.models.schemas import AnalysisResult
from app.services.analysis_service import compute_analysis, get_analysis

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/{image_id}", response_model=AnalysisResult)
async def run_analysis(image_id: int):
    """Compute trash area and weight for an image's annotations."""
    return await compute_analysis(image_id)


@router.get("/{image_id}", response_model=AnalysisResult)
async def retrieve_analysis(image_id: int):
    """Retrieve previously computed analysis results."""
    return await get_analysis(image_id)
