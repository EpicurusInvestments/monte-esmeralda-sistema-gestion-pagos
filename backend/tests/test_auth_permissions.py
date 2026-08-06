"""Authentication and server-side permission enforcement."""
from __future__ import annotations

from tests.conftest import auth, create_supplier, make_submittable_solicitud


def test_login_and_me(client):
    resp = client.post(
        "/auth/login",
        json={"email": "campo@monteesmeralda.mx", "password": "field123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "field_admin"

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "campo@monteesmeralda.mx"


def test_login_wrong_password(client):
    resp = client.post(
        "/auth/login",
        json={"email": "campo@monteesmeralda.mx", "password": "nope"},
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "AUTHENTICATION_ERROR"


def test_unauthenticated_request_rejected(client):
    assert client.get("/solicitudes").status_code == 401


def test_engineer_cannot_create_supplier(client):
    resp = client.post(
        "/suppliers", headers=auth(client, "engineer"), json={"legal_name": "X"}
    )
    assert resp.status_code == 403
    assert resp.json()["code"] == "PERMISSION_DENIED"


def test_field_admin_cannot_supervisor_approve(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    resp = client.post(
        f"/solicitudes/{sid}/supervisor-approve", headers=auth(client, "field_admin")
    )
    assert resp.status_code == 403
    assert resp.json()["code"] == "PERMISSION_DENIED"


def test_supervisor_cannot_cfo_approve(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    # CFO approve before supervisor approval => not allowed for supervisor role.
    resp = client.post(
        f"/solicitudes/{sid}/cfo-approve", headers=auth(client, "supervisor")
    )
    assert resp.status_code == 403


def test_field_admin_sees_only_own_requests(client, db):
    sid = make_submittable_solicitud(client, db)
    # Field admin lists -> sees it.
    own = client.get("/solicitudes", headers=auth(client, "field_admin"))
    assert any(s["id"] == sid for s in own.json())

    # Admin (acting as another capturer) creates one; field admin must not see it.
    supplier_id = create_supplier(client, "Otro Proveedor")
    other = client.post(
        "/solicitudes",
        headers=auth(client, "admin"),
        json={
            "request_type": "service",
            "supplier_id": supplier_id,
            "description": "Servicio capturado por admin",
            "net_amount": "100.00",
        },
    )
    other_id = other.json()["id"]
    listing = client.get("/solicitudes", headers=auth(client, "field_admin"))
    assert all(s["id"] != other_id for s in listing.json())


def test_treasurer_only_sees_approved(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    # Still only submitted -> treasurer should not see it yet.
    listing = client.get("/solicitudes", headers=auth(client, "treasurer"))
    assert all(s["id"] != sid for s in listing.json())
