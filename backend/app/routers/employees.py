from fastapi import APIRouter

from app.models.schemas import Employee
from app.services.employee_service import list_employees

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=list[Employee])
async def get_employees():
    """Return all employees from the directory."""
    return await list_employees()
