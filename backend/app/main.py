"""FastAPI application factory."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .errors import register_error_handlers
from .routers import (
    attachments,
    audit,
    auth,
    comments,
    concepts,
    solicitudes,
    suppliers,
    users,
)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_error_handlers(app)

    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(suppliers.router)
    app.include_router(concepts.router)
    app.include_router(solicitudes.router)
    app.include_router(attachments.router)
    app.include_router(comments.router)
    app.include_router(audit.router)

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok", "app": settings.app_name}

    return app


app = create_app()
