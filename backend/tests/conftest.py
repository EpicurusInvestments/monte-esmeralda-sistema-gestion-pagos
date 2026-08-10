"""Shared pytest fixtures.

Tests run against an in-memory SQLite database (shared across connections via
StaticPool) so the full suite is fast and self-contained.

INVARIANTE: las pruebas NUNCA tocan SQL Server / AWS. El engine de abajo está escrito a mano
con `sqlite://` y NO lee `DB_BACKEND` ni `settings.sqlalchemy_url`, así que el `.env` del
desarrollador es irrelevante: aunque apunte a `sqlserver`, pytest sigue en SQLite en memoria.
Eso es deliberado y no debe cambiarse — ver la aserción al final de este bloque.
"""
from __future__ import annotations

import io
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings

# Use a throwaway temp dir for uploaded files during tests.
settings.storage_dir = tempfile.mkdtemp(prefix="me_uploads_")

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Concept, Supplier, User  # noqa: E402
from app.seed import seed_concepts, seed_users  # noqa: E402

engine = create_engine(
    # `sqlite://` sin ruta = base en MEMORIA. Con StaticPool todas las conexiones comparten la
    # misma, que es lo que permite que el TestClient y las fixtures vean los mismos datos.
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# --- Salvaguarda: las pruebas SIEMPRE en SQLite en memoria -------------------
# Las pruebas crean, mutan y borran datos sin piedad (`drop_all`/`create_all` en cada caso).
# Si el engine llegara a apuntar a la instancia de SQL Server en AWS, borrarían la base OFICIAL
# del proyecto, que además está COMPARTIDA con GRC-OIR. No es una hipótesis remota: basta con
# que alguien "unifique" este engine con `settings.sqlalchemy_url` para que el `.env` local
# decida contra qué corren las pruebas.
#
# Esta aserción convierte ese error en un fallo inmediato y explicado, en vez de un desastre
# silencioso. Si algún día hace falta probar contra SQL Server, se hace en un archivo aparte y
# con una base desechable; nunca reapuntando este engine.
assert engine.url.drivername.startswith("sqlite"), (
    f"Las pruebas deben correr en SQLite, no en {engine.url.drivername!r}. "
    "Nunca apuntes el engine de pruebas a SQL Server/AWS: la instancia RDS es la base oficial "
    "y está compartida."
)
assert engine.url.database in (None, "", ":memory:"), (
    f"El engine de pruebas apunta al archivo {engine.url.database!r}; debe ser SQLite en "
    "MEMORIA para no ensuciar ninguna base en disco."
)


# Standard seed credentials (see app/seed.py).
CREDS = {
    "admin": ("admin@monteesmeralda.mx", "admin123"),
    "engineer": ("ingeniero@monteesmeralda.mx", "engineer123"),
    "accountant": ("contador@monteesmeralda.mx", "accountant123"),
    "field_admin": ("campo@monteesmeralda.mx", "field123"),
    "supervisor": ("supervisor@monteesmeralda.mx", "supervisor123"),
    "cfo": ("cfo@monteesmeralda.mx", "cfo123"),
    "treasurer": ("tesoreria@monteesmeralda.mx", "treasurer123"),
    "ceo": ("ceo@monteesmeralda.mx", "ceo123"),
}


@pytest.fixture()
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        seed_users(db)
        seed_concepts(db)
    finally:
        db.close()
    yield


@pytest.fixture()
def db(setup_db):
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(setup_db):
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# --- Helpers ----------------------------------------------------------------


def token_for(client: TestClient, role: str) -> str:
    email, password = CREDS[role]
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth(client: TestClient, role: str) -> dict:
    return {"Authorization": f"Bearer {token_for(client, role)}"}


def create_supplier(client: TestClient, name: str = "Proveedor de Prueba") -> str:
    resp = client.post(
        "/suppliers",
        headers=auth(client, "field_admin"),
        json={"legal_name": name},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def leaf_concept_id(db, code: str = "EGR.CD.005") -> str:
    return db.execute(select(Concept).where(Concept.code == code)).scalar_one().id


def header_concept_id(db, code: str = "EGR.CD") -> str:
    return db.execute(select(Concept).where(Concept.code == code)).scalar_one().id


def upload_file(client: TestClient, solicitud_id: str, role: str = "field_admin"):
    return client.post(
        f"/solicitudes/{solicitud_id}/attachments",
        headers=auth(client, role),
        files={"file": ("factura.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")},
    )


def make_submittable_solicitud(client: TestClient, db, supplier_id: str | None = None):
    """Create a draft with an attachment, ready to submit. Returns its id."""
    if supplier_id is None:
        supplier_id = create_supplier(client)
    resp = client.post(
        "/solicitudes",
        headers=auth(client, "field_admin"),
        json={
            "request_type": "supplier_invoice",
            "supplier_id": supplier_id,
            "description": "Compra de materiales",
            "net_amount": "15000.00",
        },
    )
    assert resp.status_code == 201, resp.text
    sid = resp.json()["id"]
    up = upload_file(client, sid)
    assert up.status_code == 201, up.text
    return sid
