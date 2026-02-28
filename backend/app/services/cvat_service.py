from cvat_sdk.api_client import ApiClient, Configuration
from cvat_sdk.api_client.api import tasks_api, labels_api
from shapely.geometry import Polygon

from app.config import settings
from app.models.schemas import CvatImage, CvatAnnotation, CvatSyncResponse

# In-memory cache of synced data (replace with DB later)
_images: dict[int, CvatImage] = {}
_annotations: dict[int, list[CvatAnnotation]] = {}  # keyed by image_id


def _get_cvat_client() -> ApiClient:
    config = Configuration(
        host=settings.cvat_base_url,
        username=settings.cvat_username,
        password=settings.cvat_password,
    )
    return ApiClient(configuration=config)


async def sync_cvat_data(task_id: int | None = None) -> CvatSyncResponse:
    """Pull images and annotations from CVAT and store in memory."""
    client = _get_cvat_client()

    tasks_client = tasks_api.TasksApi(client)

    if task_id:
        task_ids = [task_id]
    else:
        tasks_list, _ = tasks_client.list()
        task_ids = [t.id for t in tasks_list.results]

    # Clear stale cache for tasks being re-synced
    _images.clear()
    _annotations.clear()

    synced_images: list[CvatImage] = []
    total_annotations = 0

    for tid in task_ids:
        # Get labels for this task via the labels API
        labels_client = labels_api.LabelsApi(client)
        label_list, _ = labels_client.list(task_id=tid)
        label_map: dict[int, str] = {}
        for lbl in label_list.results:
            label_map[lbl.id] = lbl.name

        # Get task data (frames/images)
        task_data, _ = tasks_client.retrieve_data_meta(tid)
        for frame_idx, frame in enumerate(task_data.frames):
            # Use task_id * 100000 + frame_index for a stable unique ID
            frame_id = tid * 100000 + frame_idx
            img = CvatImage(
                id=frame_id,
                name=frame.name,
                width=frame.width,
                height=frame.height,
                task_id=tid,
            )
            _images[img.id] = img
            synced_images.append(img)

        # Get annotations — use the same synthetic ID as images
        annotations_data, _ = tasks_client.retrieve_annotations(tid)
        for shape in annotations_data.shapes:
            image_id = tid * 100000 + shape.frame
            points = _parse_points(shape.points)
            pixel_area = _compute_pixel_area(points)
            ann = CvatAnnotation(
                id=shape.id,
                image_id=image_id,
                label=label_map.get(shape.label_id, str(shape.label_id)),
                points=points,
                pixel_area=pixel_area,
            )
            _annotations.setdefault(image_id, []).append(ann)
            total_annotations += 1

    client.close()
    return CvatSyncResponse(images=synced_images, annotations_count=total_annotations)


def _parse_points(flat_points: list[float]) -> list[list[float]]:
    """Convert CVAT flat [x1,y1,x2,y2,...] to [[x1,y1],[x2,y2],...]."""
    return [[flat_points[i], flat_points[i + 1]] for i in range(0, len(flat_points), 2)]


def _compute_pixel_area(points: list[list[float]]) -> float:
    """Compute pixel area of a polygon using Shapely."""
    if len(points) < 3:
        return 0.0
    return Polygon(points).area


def get_cached_images() -> dict[int, CvatImage]:
    return _images


def get_cached_annotations(image_id: int) -> list[CvatAnnotation]:
    return _annotations.get(image_id, [])


def get_frame_data(task_id: int, frame: int) -> tuple[bytes, str]:
    """Fetch a frame image from CVAT and return (bytes, content_type)."""
    client = _get_cvat_client()
    tasks_client = tasks_api.TasksApi(client)
    _, response = tasks_client.retrieve_data(
        task_id, number=frame, quality="original", type="frame",
        _parse_response=False,
    )
    content_type = response.headers.get("Content-Type", "image/jpeg")
    raw = response.data
    client.close()
    return raw, content_type
