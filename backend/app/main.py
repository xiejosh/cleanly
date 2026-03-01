from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import agent, auth, cvat, analysis, map, planning, employees, dashboard
from app.services.cvat_service import load_from_disk as load_cvat
from app.services.geo_service import load_from_disk as load_geo, register_global_origin, get_global_origin


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_cvat()
    load_geo()
    # Auto-compute georefs from global origin if it was persisted
    origin = get_global_origin()
    if origin:
        register_global_origin(origin)
    yield


app = FastAPI(
    title="Cleanly API",
    description="Ocean plastic pollution mapping & expedition planning",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)
app.include_router(auth.router)
app.include_router(cvat.router)
app.include_router(analysis.router)
app.include_router(map.router)
app.include_router(planning.router)
app.include_router(employees.router)
app.include_router(dashboard.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
