from app.config import settings
from app.models.schemas import Employee

# Demo employees — replace with Supabase query
_DEMO_EMPLOYEES: list[Employee] = [
    Employee(id="1", name="Marie Dupont", email="marie@plasticodyssey.org", role="Marine Biologist", skills=["diving", "sample collection", "species identification"]),
    Employee(id="2", name="Jean Moreau", email="jean@plasticodyssey.org", role="Boat Captain", skills=["navigation", "vessel operation", "weather assessment"]),
    Employee(id="3", name="Aisha Ndiaye", email="aisha@plasticodyssey.org", role="Logistics Coordinator", skills=["supply chain", "team coordination", "budget management"]),
    Employee(id="4", name="Carlos Silva", email="carlos@plasticodyssey.org", role="Diver", skills=["diving", "underwater photography", "debris removal"]),
    Employee(id="5", name="Yuki Tanaka", email="yuki@plasticodyssey.org", role="Data Scientist", skills=["GIS", "remote sensing", "data analysis", "python"]),
    Employee(id="6", name="Liam O'Brien", email="liam@plasticodyssey.org", role="Engineer", skills=["mechanical repair", "recycling machinery", "3D printing"]),
]


async def list_employees() -> list[Employee]:
    """Return all employees. Currently uses demo data."""
    # TODO: Replace with Supabase query:
    # supabase = create_client(settings.supabase_url, settings.supabase_key)
    # result = supabase.table("employees").select("*").execute()
    return _DEMO_EMPLOYEES
