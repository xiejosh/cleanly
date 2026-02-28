from fastapi import APIRouter

from app.models.schemas import (
    GeoCoordinate,
    GeoReferenceRequest,
    GlobalOriginRequest,
    HeatmapResponse,
    MapFeatureCollection,
)
from app.services.geo_service import (
    get_all_georefs,
    get_global_origin,
    get_heatmap_data,
    get_map_features,
    register_georeference,
    register_global_origin,
)

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


@router.post("/global-origin")
async def set_global_origin(req: GlobalOriginRequest):
    """Set the mosaic origin and auto-georeference all images from filenames."""
    origin = GeoCoordinate(lat=req.lat, lng=req.lng)
    count = register_global_origin(origin, req.ground_resolution_cm_per_pixel)
    return {"status": "ok", "images_georeferenced": count}


@router.get("/georefs")
async def get_georefs():
    """Return all image georefs and the current global origin."""
    georefs = get_all_georefs()
    origin = get_global_origin()
    return {
        "georefs": {
            img_id: {"lat": ref.center.lat, "lng": ref.center.lng}
            for img_id, ref in georefs.items()
        },
        "origin": {"lat": origin.lat, "lng": origin.lng} if origin else None,
    }


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap():
    """Return heatmap data for all georeferenced images with annotations."""
    return get_heatmap_data()


@router.get("/{image_id}", response_model=MapFeatureCollection)
async def get_map(image_id: int):
    """Return GeoJSON features for trash detections on the given image."""
    return await get_map_features(image_id)
