# Cleanly

Map and quantify ocean plastic pollution from drone imagery. Plan cleanup expeditions with AI-powered logistics.

Built for [Plastic Odyssey](https://plasticodyssey.org/) to estimate **where plastic accumulates** and **how much is present** on remote coastal and island sites before deploying cleanup teams.

## How It Works

1. **Import** — Pull drone imagery and polygon annotations from a CVAT instance.
2. **Analyze** — Compute the pixel area of every annotated trash region, then convert to real-world area and estimated weight.
3. **Map** — Transform pixel coordinates into geo coordinates and display trash hotspots on an interactive Leaflet map.
4. **Plan** — An AI planning agent (GPT-4o) consumes the quantification data and an employee directory to recommend vessels, team assignments, and logistics.

### Quantification Formula

| Constant | Value |
|---|---|
| Ground resolution | 0.5 cm/pixel |
| Area per pixel | 0.25 cm²/pixel |
| Surface density | 0.48 g/cm² |
| **Weight per pixel** | **0.12 g/pixel** |

```
estimated_weight_g = detected_pixels × 0.12
estimated_weight_kg = estimated_weight_g / 1000
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Leaflet / react-leaflet |
| Backend | Python FastAPI, Pydantic, Shapely, GeoJSON |
| AI | OpenAI GPT-4o (expedition planning agent) |
| Annotations | CVAT SDK |
| Auth / Data | Supabase (planned — currently uses demo data) |
| Package managers | bun (frontend), uv (backend) |

## Project Structure

```
cleanly/
├── backend/
│   ├── app/
│   │   ├── main.py                       # FastAPI app, CORS, router registration
│   │   ├── config.py                     # Pydantic settings (env vars)
│   │   ├── models/
│   │   │   └── schemas.py                # All Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── cvat.py                   # POST /cvat/sync
│   │   │   ├── analysis.py               # POST/GET /analysis/{image_id}
│   │   │   ├── map.py                    # GET /map/{image_id}
│   │   │   ├── planning.py               # POST /plan-expedition
│   │   │   ├── employees.py              # GET /employees
│   │   │   └── auth.py                   # (placeholder)
│   │   └── services/
│   │       ├── cvat_service.py           # CVAT SDK integration, in-memory cache
│   │       ├── analysis_service.py       # Pixel area + weight computation
│   │       ├── geo_service.py            # Pixel-to-geo coordinate transform
│   │       ├── planning_service.py       # OpenAI expedition planning agent
│   │       └── employee_service.py       # Employee directory (demo data)
│   ├── pyproject.toml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                  # Landing page
│   │   │   ├── images/page.tsx           # CVAT image browser / sync
│   │   │   ├── analysis/page.tsx         # Run analysis, view metrics
│   │   │   ├── map/page.tsx              # Leaflet trash hotspot map
│   │   │   ├── expedition/page.tsx       # AI expedition planner
│   │   │   ├── employees/page.tsx        # Employee directory
│   │   │   ├── layout.tsx                # Root layout + nav
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── Nav.tsx                   # Top navigation bar
│   │   │   └── MapView.tsx               # Leaflet map with GeoJSON overlay
│   │   └── lib/
│   │       ├── api.ts                    # API client (all backend calls)
│   │       └── types.ts                  # TypeScript types mirroring backend schemas
│   ├── package.json
│   └── .env.example
├── LICENSE
└── .gitignore
```

## Getting Started

### Prerequisites

- [bun](https://bun.sh/) (frontend)
- [uv](https://docs.astral.sh/uv/) (backend)
- A [CVAT](https://www.cvat.ai/) account with annotated drone imagery
- An [OpenAI API key](https://platform.openai.com/) (for the planning agent)

### 1. Clone the repo

```bash
git clone <repo-url>
cd cleanly
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Fill in your credentials in .env
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
cp .env.example .env
# Verify NEXT_PUBLIC_API_URL points to your backend (default: http://localhost:8000)
bun install
bun dev
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:8000`.

## Environment Variables

### Backend (`backend/.env`)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
CVAT_BASE_URL=https://app.cvat.ai
CVAT_USERNAME=your-username
CVAT_PASSWORD=your-password
OPENAI_API_KEY=sk-...
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/cvat/sync` | Pull images and annotations from CVAT. Accepts optional `task_id`. |
| `POST` | `/analysis/{image_id}` | Compute trash area and weight from annotations. |
| `GET` | `/analysis/{image_id}` | Retrieve previously computed analysis results. |
| `GET` | `/map/{image_id}` | GeoJSON FeatureCollection of trash detections in map coordinates. |
| `POST` | `/plan-expedition` | AI agent generates expedition plan (vessels, team, logistics). |
| `GET` | `/employees` | List all employees in the directory. |
| `GET` | `/health` | Health check. |

## CVAT Workflow

1. Upload drone imagery to your CVAT instance and annotate plastic regions with polygon shapes.
2. In Cleanly, go to **Images** and click **Sync from CVAT** (optionally filter by task ID).
3. The backend authenticates with CVAT via the SDK, pulls frame metadata and shape annotations, and caches them in memory.
4. Navigate to **Analysis** and run analysis on a synced image to compute area and weight.

## License

[MIT](LICENSE) — Josh Xie, 2026
