"""End-to-end integration flows across roles."""
from __future__ import annotations

from tests.conftest import (
    auth,
    create_supplier,
    leaf_concept_id,
    upload_file,
)


def test_field_admin_to_cfo_happy_path(client, db):
    # 1. Field Admin creates a draft with supplier + amount.
    supplier_id = create_supplier(client, "Edificadora Integral")
    created = client.post(
        "/solicitudes",
        headers=auth(client, "field_admin"),
        json={
            "request_type": "contractor_estimate",
            "supplier_id": supplier_id,
            "description": "Estimación 3 — edificación",
            "net_amount": "250000.00",
            "proposed_payment_week": "2026-W24",
        },
    )
    assert created.status_code == 201
    sid = created.json()["id"]

    # 2. Attachment + submit.
    assert upload_file(client, sid).status_code == 201
    assert client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin")).json()[
        "status"
    ] == "submitted"

    # 3. Supervisor sees it in the inbox (submitted).
    inbox = client.get("/solicitudes?status=submitted", headers=auth(client, "supervisor"))
    assert any(s["id"] == sid for s in inbox.json())

    # 4. Supervisor assigns leaf concept and approves.
    approved = client.post(
        f"/solicitudes/{sid}/supervisor-approve",
        headers=auth(client, "supervisor"),
        json={"final_concept_id": leaf_concept_id(db), "reason": "Avance verificado"},
    )
    assert approved.json()["status"] == "supervisor_approved"

    # 5. CFO sees supervisor-approved requests.
    cfo_inbox = client.get(
        "/solicitudes?status=supervisor_approved", headers=auth(client, "cfo")
    )
    assert any(s["id"] == sid for s in cfo_inbox.json())

    # 6. CFO approves.
    final = client.post(f"/solicitudes/{sid}/cfo-approve", headers=auth(client, "cfo"))
    assert final.json()["status"] == "cfo_approved"

    # 7. Detail screen exposes the audit timeline.
    detail = client.get(f"/solicitudes/{sid}", headers=auth(client, "ceo"))
    assert detail.status_code == 200
    actions = [e["action"] for e in detail.json()["audit_events"]]
    assert {"created", "submitted", "supervisor_approved", "cfo_approved"} <= set(actions)


def test_unauthorized_user_cannot_approve(client, db):
    supplier_id = create_supplier(client)
    created = client.post(
        "/solicitudes",
        headers=auth(client, "field_admin"),
        json={
            "request_type": "service",
            "supplier_id": supplier_id,
            "description": "Servicio",
            "net_amount": "1000.00",
        },
    )
    sid = created.json()["id"]
    upload_file(client, sid)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))

    # Engineer (read-only role) cannot supervisor-approve.
    resp = client.post(
        f"/solicitudes/{sid}/supervisor-approve", headers=auth(client, "engineer")
    )
    assert resp.status_code == 403


def test_supplier_clearance_summary_exposed(client, db):
    supplier_id = create_supplier(client, "Proveedor Con Cumplimiento")
    # Record an external clearance via admin.
    resp = client.post(
        f"/suppliers/{supplier_id}/clearances",
        headers=auth(client, "admin"),
        json={
            "status": "cleared",
            "clearance_date": "2026-01-01",
            "valid_until": "2030-01-01",
            "compliance_reference": "OPN-1",
        },
    )
    assert resp.status_code == 201
    detail = client.get(f"/suppliers/{supplier_id}", headers=auth(client, "field_admin"))
    assert detail.json()["clearance"]["effective_status"] == "cleared"


def test_expired_clearance_counts_as_not_cleared(client, db):
    supplier_id = create_supplier(client, "Proveedor Vencido")
    client.post(
        f"/suppliers/{supplier_id}/clearances",
        headers=auth(client, "admin"),
        json={
            "status": "cleared",
            "clearance_date": "2020-01-01",
            "valid_until": "2021-01-01",  # in the past
            "compliance_reference": "OPN-OLD",
        },
    )
    detail = client.get(f"/suppliers/{supplier_id}", headers=auth(client, "field_admin"))
    clearance = detail.json()["clearance"]
    assert clearance["is_expired"] is True
    assert clearance["effective_status"] == "expired"
