from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import agent, auth, cvat, analysis, map, planning, employees

app = FastAPI(
    title="Cleanly API",
    description="Ocean plastic pollution mapping & expedition planning",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
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


@app.get("/health")
async def health():
    return {"status": "ok"}
