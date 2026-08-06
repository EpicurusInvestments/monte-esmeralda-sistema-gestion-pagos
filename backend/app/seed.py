"""Seed the database with demo users and the hierarchical concept catalog.

Run with:  python -m app.seed
Idempotent: existing users/concepts (matched by email/code) are left in place.
"""
from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .catalog import flatten
from .database import Base, SessionLocal, engine
from .enums import ClearanceStatus, Role, SupplierStatus
from .models import Concept, Supplier, SupplierClearance, User
from .security import hash_password

# email -> (full_name, role, password)
SEED_USERS: list[tuple[str, str, Role, str]] = [
    ("admin@monteesmeralda.mx", "Administrador del Sistema", Role.admin, "admin123"),
    ("ingeniero@monteesmeralda.mx", "Ingeniería de Obra", Role.engineer, "engineer123"),
    ("contador@monteesmeralda.mx", "Contabilidad", Role.accountant, "accountant123"),
    ("campo@monteesmeralda.mx", "Administrador de Campo", Role.field_admin, "field123"),
    ("supervisor@monteesmeralda.mx", "Supervisor de Obra", Role.supervisor, "supervisor123"),
    ("cfo@monteesmeralda.mx", "Director de Finanzas", Role.cfo, "cfo123"),
    ("tesoreria@monteesmeralda.mx", "Tesorería", Role.treasurer, "treasurer123"),
    ("ceo@monteesmeralda.mx", "Director General", Role.ceo, "ceo123"),
]


def seed_users(db: Session) -> None:
    for email, full_name, role, password in SEED_USERS:
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing:
            continue
        db.add(
            User(
                email=email,
                full_name=full_name,
                role=role,
                password_hash=hash_password(password),
                is_active=True,
            )
        )
    db.commit()


def seed_concepts(db: Session) -> None:
    code_to_id: dict[str, str] = {}
    for row in flatten():
        existing = db.execute(
            select(Concept).where(Concept.code == row["code"])
        ).scalar_one_or_none()
        if existing:
            code_to_id[row["code"]] = existing.id
            continue
        parent_id = code_to_id.get(row["parent_code"]) if row["parent_code"] else None
        concept = Concept(
            code=row["code"],
            name=row["name"],
            parent_id=parent_id,
            section=row["section"],
            is_header=row["is_header"],
            sort_order=row["sort_order"],
            active=True,
        )
        db.add(concept)
        db.flush()
        code_to_id[row["code"]] = concept.id
    db.commit()


def seed_demo_suppliers(db: Session) -> None:
    """A couple of example suppliers with clearance records for demos/tests."""
    if db.execute(select(Supplier)).first():
        return
    admin = db.execute(
        select(User).where(User.role == Role.admin)
    ).scalar_one_or_none()
    admin_id = admin.id if admin else None

    s1 = Supplier(
        legal_name="Constructora del Valle S.A. de C.V.",
        rfc="CVA120101AB1",
        contact_name="María González",
        email="contacto@constructoravalle.mx",
        phone="55-1234-5678",
        bank_name="BBVA",
        bank_account="0123456789",
        clabe="012180001234567890",
        status=SupplierStatus.active,
    )
    s2 = Supplier(
        legal_name="Materiales y Acabados del Norte",
        rfc="MAN150202CD2",
        contact_name="Jorge Ramírez",
        email="ventas@materialesnorte.mx",
        phone="81-9876-5432",
        bank_name="Banorte",
        bank_account="9876543210",
        clabe="072580009876543210",
        status=SupplierStatus.active,
    )
    db.add_all([s1, s2])
    db.flush()

    today = date.today()
    db.add(
        SupplierClearance(
            supplier_id=s1.id,
            status=ClearanceStatus.cleared,
            clearance_date=today - timedelta(days=30),
            valid_until=today + timedelta(days=120),
            compliance_reference="OPINION-32-A",
            notes="Opinión de cumplimiento positiva (externa).",
            created_by=admin_id,
        )
    )
    db.add(
        SupplierClearance(
            supplier_id=s2.id,
            status=ClearanceStatus.cleared,
            clearance_date=today - timedelta(days=400),
            valid_until=today - timedelta(days=35),  # expired => not cleared
            compliance_reference="OPINION-11-Z",
            notes="Cumplimiento vencido; requiere renovación externa.",
            created_by=admin_id,
        )
    )
    db.commit()


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_users(db)
        seed_concepts(db)
        seed_demo_suppliers(db)
        print("Seed completado: usuarios, catálogo de conceptos y proveedores demo.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
