"""File storage abstraction.

Exposes an S3-compatible interface (put / get / delete by key). The default
implementation writes to the local filesystem; a real S3 bucket backend can be
dropped in later without touching the routers.
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path

from ..config import settings


class LocalStorage:
    def __init__(self, base_dir: str):
        self.base = Path(base_dir)
        self.base.mkdir(parents=True, exist_ok=True)

    def build_key(self, solicitud_id: str, file_name: str) -> str:
        safe = os.path.basename(file_name).replace("/", "_")
        return f"solicitudes/{solicitud_id}/{uuid.uuid4().hex}_{safe}"

    def put(self, key: str, data: bytes) -> None:
        dest = self.base / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)

    def get(self, key: str) -> bytes:
        return (self.base / key).read_bytes()

    def exists(self, key: str) -> bool:
        return (self.base / key).exists()

    def delete(self, key: str) -> None:
        target = self.base / key
        if target.exists():
            target.unlink()


def get_storage() -> LocalStorage:
    # Only the local backend is implemented in Package 1; the interface allows
    # swapping in an S3 backend later.
    return LocalStorage(settings.storage_dir)
