import os
import socketio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.api.v1.sockets import sio
from app.core.config import settings
from app.db.seed import run as run_seed
from app.db.session import Base, SessionLocal, engine
from app.models import User
from app.models import models  # noqa: F401  (ensures models are registered)

fastapi_app = FastAPI(
    title="SevaSetu AI",
    description=(
        "Public healthcare delivery platform for rural and underserved areas."
    ),
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
fastapi_app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

fastapi_app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@fastapi_app.on_event("startup")
def on_startup() -> None:
    with engine.begin() as conn:
        conn.exec_driver_sql("ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS duration INTEGER;")
        
    Base.metadata.create_all(bind=engine)
    if settings.SEED_ON_STARTUP:
        db = SessionLocal()
        try:
            already_seeded = db.query(User).count() > 0
        finally:
            db.close()
        if not already_seeded:
            run_seed()


@fastapi_app.get("/", tags=["meta"])
def root() -> dict:
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "district": "Government",
        "docs": "/docs",
        "api": settings.API_V1_PREFIX,
    }


@fastapi_app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "environment": settings.ENVIRONMENT}

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
