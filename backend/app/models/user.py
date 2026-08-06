"""User model."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Enum, Unicode
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base, GUID, datetime2, new_uuid
from ..enums import Role


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(Unicode(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    full_name: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role, native_enum=False), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(datetime2(), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        datetime2(), default=_now, onupdate=_now, nullable=False
    )
