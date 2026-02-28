from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import CvatImage, CvatSyncRequest, CvatSyncResponse
from app.services.cvat_service import get_cached_images, get_frame_data, sync_cvat_data

router = APIRouter(prefix="/cvat", tags=["cvat"])


@router.post("/sync", response_model=CvatSyncResponse)
async def sync(request: CvatSyncRequest):
    """Pull images and annotations from CVAT."""
    return await sync_cvat_data(request.task_id)


@router.get("/images", response_model=list[CvatImage])
async def list_images():
    """Return all previously synced images."""
    return list(get_cached_images().values())


@router.get("/images/{task_id}/frames/{frame}")
async def get_frame(task_id: int, frame: int):
    """Proxy a frame image from CVAT."""
    data, content_type = get_frame_data(task_id, frame)
    return StreamingResponse(iter([data]), media_type=content_type)
