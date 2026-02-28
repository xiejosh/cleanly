import json
from pathlib import Path

_DB_DIR = Path(__file__).resolve().parents[3] / "db"


def load_json(filename: str) -> dict:
    """Load JSON from db/<filename>. Returns {} if missing or corrupt."""
    path = _DB_DIR / filename
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def save_json(filename: str, data: dict) -> None:
    """Write data as JSON to db/<filename>, creating db/ if needed."""
    _DB_DIR.mkdir(parents=True, exist_ok=True)
    (_DB_DIR / filename).write_text(json.dumps(data, indent=2))
