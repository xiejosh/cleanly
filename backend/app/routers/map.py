from fastapi import APIRouter

from app.models.schemas import GeoCoordinate, GeoReferenceRequest, MapFeatureCollection
from app.services.geo_service import get_map_features, register_georeference

router = APIRouter(prefix="/map", tags=["map"])


@router.post("/georeference")
async def add_georeference(req: GeoReferenceRequest):
    """Register georeferencing data for a drone image."""
    register_georeference(
        image_id=req.image_id,
        center=GeoCoordinate(lat=req.lat, lng=req.lng),
        resolution=req.ground_resolution_cm_per_pixel,
    )
    return {"status": "ok", "image_id": req.image_id}


@router.get("/{image_id}", response_model=MapFeatureCollection)
async def get_map(image_id: int):
    """Return GeoJSON features for trash detections on the given image."""
    return await get_map_features(image_id)
