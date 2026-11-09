"""VOUCHLY API entry point (backend/app/main.py).

Run from the backend/ folder:   uvicorn app.main:app --reload
Then open http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import models  # noqa: F401  (importing registers every table)
from app.db.database import Base, engine, get_db

Base.metadata.create_all(engine)  # fine for the hackathon; use Alembic migrations later

app = FastAPI(title="VOUCHLY API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # the Next.js frontend
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


# --- AI review routes (Ekansh) -------------------------------------------------
# Needs a dependency that returns the logged-in User. If security.py names it
# differently, change `get_current_user` below to match.
try:
    from app import ai_layer
    from app.core.security import get_current_user

    app.include_router(ai_layer.build_router(get_db, get_current_user))
except ImportError as e:
    print(f"[VOUCHLY] AI review routes NOT loaded: {e}")