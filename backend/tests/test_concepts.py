"""Concept catalog: hierarchy, leaves vs headers, picker labels."""
from __future__ import annotations

from sqlalchemy import select

from app.models import Concept
from tests.conftest import auth


def test_catalog_seeded_hierarchically(db):
    # A representative leaf exists with the right code and a header parent chain.
    edificacion = db.execute(
        select(Concept).where(Concept.code == "EGR.CD.005")
    ).scalar_one()
    assert edificacion.name == "Edificación"
    assert edificacion.is_header is False
    assert edificacion.section == "EGR"

    parent = db.get(Concept, edificacion.parent_id)
    assert parent.code == "EGR.CD"
    assert parent.is_header is True


def test_headers_are_not_leaves(db):
    headers = db.execute(select(Concept).where(Concept.is_header.is_(True))).scalars().all()
    codes = {h.code for h in headers}
    # Top-level sections and grouping rows are headers.
    for code in ["ING", "EGR", "GAS", "ACT", "EGR.CI", "EGR.CI.OF", "EGR.CD"]:
        assert code in codes


def test_visually_identical_leaves_are_distinguishable(client, db):
    """'Papelería' exists under two different groups; the picker path differs."""
    resp = client.get("/concepts?leaves_only=true", headers=auth(client, "field_admin"))
    assert resp.status_code == 200
    papeleria = [c for c in resp.json() if c["name"] == "Papelería"]
    assert len(papeleria) == 2
    paths = {c["path"] for c in papeleria}
    assert len(paths) == 2  # distinct full paths
    parents = {c["parent_name"] for c in papeleria}
    assert parents == {"Indirectos de Oficina / Corporativo", "Indirectos de Obra"}


def test_leaves_only_filter_excludes_headers(client):
    resp = client.get("/concepts?leaves_only=true", headers=auth(client, "field_admin"))
    assert resp.status_code == 200
    assert all(c["is_header"] is False for c in resp.json())


def test_concept_count(db):
    leaves = db.execute(select(Concept).where(Concept.is_header.is_(False))).scalars().all()
    # 1+1 + 12+19+7 + 5+3+2+3+5 + 4 = 2 + 38 + 18 + 4 = 62 leaves.
    assert len(leaves) == 62
