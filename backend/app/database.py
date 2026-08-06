"""Database engine, session factory and the declarative base."""
from __future__ import annotations

import uuid
from typing import Generator

from sqlalchemy import create_engine, types
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

DATABASE_URL = settings.sqlalchemy_url

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    # Required for SQLite when used across threads (FastAPI / tests).
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class GUID(types.TypeDecorator):
    """Platform-independent UUID type.

    Uses PostgreSQL's native UUID type when available, otherwise stores the
    value as a 36-character string. This keeps the same models working on both
    Postgres (production / docker) and SQLite (tests / lightweight local dev).
    """

    impl = types.CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=False))
        return dialect.type_descriptor(types.CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return str(value)


def new_uuid() -> str:
    return str(uuid.uuid4())


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
