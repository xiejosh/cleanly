from cvat_sdk.api_client import ApiClient, Configuration
from cvat_sdk.api_client.api import tasks_api, jobs_api

from app.config import settings
from app.models.schemas import CvatImage, CvatAnnotation, CvatSyncResponse

# In-memory cache of synced data (replace with DB later)
_images: dict[int, CvatImage] = {}
_annotations: dict[int, list[CvatAnnotation]] = {}  # keyed by image_id


def _get_cvat_client() -> ApiClient:
    config = Configuration(
        host=settings.cvat_base_url + "/api",
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
        tasks_list, _, _ = tasks_client.list()
        task_ids = [t.id for t in tasks_list.results]

    synced_images: list[CvatImage] = []
    total_annotations = 0

    for tid in task_ids:
        # Get task metadata to build label lookup
        task_meta, _, _ = tasks_client.retrieve(tid)
        label_map: dict[int, str] = {}
        if hasattr(task_meta, "labels") and task_meta.labels:
            for lbl in task_meta.labels:
                label_map[lbl.id] = lbl.name

        # Get task data (frames/images)
        task_data, _, _ = tasks_client.retrieve_data_meta(tid)
        for frame in task_data.frames:
            img = CvatImage(
                id=frame.id if hasattr(frame, "id") else hash(frame.name),
                name=frame.name,
                width=frame.width,
                height=frame.height,
                task_id=tid,
            )
            _images[img.id] = img
            synced_images.append(img)

        # Get annotations
        annotations_data, _, _ = tasks_client.retrieve_annotations(tid)
        for shape in annotations_data.shapes:
            ann = CvatAnnotation(
                id=shape.id,
                image_id=shape.frame,
                label=label_map.get(shape.label_id, str(shape.label_id)),
                points=_parse_points(shape.points),
            )
            _annotations.setdefault(shape.frame, []).append(ann)
            total_annotations += 1

    client.close()
    return CvatSyncResponse(images=synced_images, annotations_count=total_annotations)


def _parse_points(flat_points: list[float]) -> list[list[float]]:
    """Convert CVAT flat [x1,y1,x2,y2,...] to [[x1,y1],[x2,y2],...]."""
    return [[flat_points[i], flat_points[i + 1]] for i in range(0, len(flat_points), 2)]


def get_cached_images() -> dict[int, CvatImage]:
    return _images


def get_cached_annotations(image_id: int) -> list[CvatAnnotation]:
    return _annotations.get(image_id, [])


def get_frame_data(task_id: int, frame: int) -> tuple[bytes, str]:
    """Fetch a frame image from CVAT and return (bytes, content_type)."""
    client = _get_cvat_client()
    tasks_client = tasks_api.TasksApi(client)
    (data, response_code, headers) = tasks_client.retrieve_data(
        task_id, number=frame, quality="original", type="frame",
    )
    content_type = headers.get("Content-Type", "image/jpeg")
    # data may be a file-like or bytes depending on SDK version
    if hasattr(data, "read"):
        raw = data.read()
    else:
        raw = data
    client.close()
    return raw, content_type
