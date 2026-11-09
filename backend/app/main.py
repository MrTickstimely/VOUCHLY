"""VOUCHLY API entry point (backend/app/main.py).

Run from the backend/ folder:   uvicorn app.main:app --reload
Then open http://localhost:8000/docs

Env: APP_ENV=production, JWT_SECRET, CORS_ORIGINS (comma-separated, default http://localhost:3000),
     MAX_BODY_BYTES (default 2000000), TRUST_PROXY=1 (only behind your own proxy)
"""
import os

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import ai_layer, routes
from app.core.ratelimit import limiter
from app.core.security import IS_PRODUCTION, get_current_user
from app.db import models  # noqa: F401  (importing registers every table)
from app.db.database import Base, engine, get_db

Base.metadata.create_all(engine)  # fine for the hackathon; use Alembic migrations later

# In production, hide the interactive docs: they list every endpoint for attackers.
app = FastAPI(title="VOUCHLY API",
              docs_url=None if IS_PRODUCTION else "/docs",
              redoc_url=None, openapi_url=None if IS_PRODUCTION else "/openapi.json")

MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", "2000000"))
DOC_PATHS = ("/docs", "/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Reject oversized bodies early. (Chunked uploads send no Content-Length; the per-field
    # max_length limits in routes.py cover those, and the file-upload endpoint will stream-check.)
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
        return JSONResponse({"detail": "Request too large"}, status_code=413)

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"  # API responses hold private data
    if not request.url.path.startswith(DOC_PATHS):  # Swagger UI needs to load its own scripts
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.get("/health")
def health():
    return {"status": "ok"}


def limit_ai_review(request: Request, user=Depends(get_current_user)):
    """AI calls cost money and time: cap each user's review runs (POSTs only)."""
    if request.method == "POST":
        limiter.check(f"review:{user.id}", 20, 3600)


app.include_router(routes.router)
app.include_router(ai_layer.build_router(get_db, get_current_user),
                   dependencies=[Depends(limit_ai_review)])  # POST /content/{id}/review