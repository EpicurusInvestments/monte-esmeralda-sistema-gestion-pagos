"""Read-only role/capability matrix endpoint (`GET /roles-permissions`)."""
from __future__ import annotations

from app.enums import Role
from app.labels import CAPABILITY_LABELS, ROLE_LABELS
from app.services import permissions
from tests.conftest import auth


def test_matrix_lists_every_role_with_its_capabilities(client):
    resp = client.get("/roles-permissions", headers=auth(client, "admin"))
    assert resp.status_code == 200
    body = resp.json()

    # Los 8 roles, en el orden del enum.
    assert [r["value"] for r in body["roles"]] == [r.value for r in Role]
    assert all(r["label"] for r in body["roles"])

    porRol = {r["value"]: r for r in body["roles"]}

    # Cada rol trae exactamente sus capacidades reales.
    for role, esperadas in permissions.ROLE_CAPABILITIES.items():
        codigos = {c["code"] for c in porRol[role.value]["capabilities"]}
        assert codigos == set(esperadas), role.value

    # El catálogo cubre todas las capacidades usadas por algún rol.
    catalogo = {c["code"] for c in body["capabilities"]}
    usadas = {cap for caps in permissions.ROLE_CAPABILITIES.values() for cap in caps}
    assert usadas <= catalogo

    # Muestras concretas de la matriz.
    assert "solicitud:supervisor_review" in {
        c["code"] for c in porRol["supervisor"]["capabilities"]
    }
    assert "solicitud:cfo_review" in {c["code"] for c in porRol["cfo"]["capabilities"]}
    assert "user:manage" in {c["code"] for c in porRol["admin"]["capabilities"]}
    # Solo el Admin administra usuarios.
    assert [
        r["value"]
        for r in body["roles"]
        if "user:manage" in {c["code"] for c in r["capabilities"]}
    ] == ["admin"]


def test_every_capability_has_a_readable_label(client):
    """Guarda contra la deriva: una capacidad nueva sin etiquetar rompe aquí, no en la UI."""
    usadas = {cap for caps in permissions.ROLE_CAPABILITIES.values() for cap in caps}
    sin_etiqueta = sorted(usadas - set(CAPABILITY_LABELS))
    assert sin_etiqueta == [], f"Falta etiquetarlas en app/labels.py: {sin_etiqueta}"

    assert sorted(ROLE_LABELS) == sorted(Role)

    resp = client.get("/roles-permissions", headers=auth(client, "admin"))
    for cap in resp.json()["capabilities"]:
        assert cap["label"] != cap["code"], cap["code"]
        assert cap["group"] != "Sin clasificar", cap["code"]


def test_capability_order_is_stable(client):
    """`ROLE_CAPABILITIES` usa `set`: el endpoint debe imponer un orden reproducible."""
    a = client.get("/roles-permissions", headers=auth(client, "admin")).json()
    b = client.get("/roles-permissions", headers=auth(client, "admin")).json()
    assert a == b

    catalogo = [c["code"] for c in a["capabilities"]]
    for rol in a["roles"]:
        codigos = [c["code"] for c in rol["capabilities"]]
        assert codigos == [c for c in catalogo if c in set(codigos)], rol["value"]


def test_matrix_requires_user_manage(client):
    for role in ("supervisor", "cfo", "field_admin", "treasurer", "ceo", "accountant", "engineer"):
        resp = client.get("/roles-permissions", headers=auth(client, role))
        assert resp.status_code == 403, role
        assert resp.json()["code"] == "PERMISSION_DENIED"


def test_matrix_requires_authentication(client):
    assert client.get("/roles-permissions").status_code == 401


def test_matrix_is_read_only(client):
    """No hay escritura: la matriz vive en código (ver el BACKLOG para llevarla a BD)."""
    headers = auth(client, "admin")
    assert client.post("/roles-permissions", headers=headers, json={}).status_code == 405
    assert client.patch("/roles-permissions", headers=headers, json={}).status_code == 405
    assert client.delete("/roles-permissions", headers=headers).status_code == 405
