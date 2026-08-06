"""Workflow rules: creation, submission, approvals, rejections, corrections."""
from __future__ import annotations

from sqlalchemy import select

from app.models import AuditEvent
from tests.conftest import (
    auth,
    create_supplier,
    header_concept_id,
    leaf_concept_id,
    make_submittable_solicitud,
    upload_file,
)


def test_create_solicitud_assigns_folio(client, db):
    supplier_id = create_supplier(client)
    resp = client.post(
        "/solicitudes",
        headers=auth(client, "field_admin"),
        json={
            "request_type": "supplier_invoice",
            "supplier_id": supplier_id,
            "description": "Materiales",
            "net_amount": "1000.00",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["folio"].startswith("SP-")
    assert body["status"] == "draft"


def test_create_with_unknown_supplier(client):
    resp = client.post(
        "/solicitudes",
        headers=auth(client, "field_admin"),
        json={
            "request_type": "other",
            "supplier_id": "00000000-0000-0000-0000-000000000000",
            "description": "x",
            "net_amount": "1.00",
        },
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "SUPPLIER_NOT_FOUND"


def test_submit_requires_attachment(client, db):
    supplier_id = create_supplier(client)
    resp = client.post(
        "/solicitudes",
        headers=auth(client, "field_admin"),
        json={
            "request_type": "service",
            "supplier_id": supplier_id,
            "description": "Sin adjunto",
            "net_amount": "500.00",
        },
    )
    sid = resp.json()["id"]
    submit = client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    assert submit.status_code == 422
    assert submit.json()["code"] == "MISSING_REQUIRED_ATTACHMENT"


def test_submit_changes_state(client, db):
    sid = make_submittable_solicitud(client, db)
    submit = client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    assert submit.status_code == 200
    assert submit.json()["status"] == "submitted"


def test_supervisor_approval_requires_concept(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    # No final concept assigned yet.
    resp = client.post(
        f"/solicitudes/{sid}/supervisor-approve", headers=auth(client, "supervisor")
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "CONCEPT_REQUIRED"


def test_supervisor_approval_rejects_header_concept(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    resp = client.post(
        f"/solicitudes/{sid}/supervisor-approve",
        headers=auth(client, "supervisor"),
        json={"final_concept_id": header_concept_id(db)},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "CONCEPT_MUST_BE_LEAF"


def test_supervisor_approval_with_leaf_concept(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    resp = client.post(
        f"/solicitudes/{sid}/supervisor-approve",
        headers=auth(client, "supervisor"),
        json={"final_concept_id": leaf_concept_id(db)},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "supervisor_approved"
    assert body["final_concept_id"] is not None


def test_cfo_approve_only_after_supervisor(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    # Directly attempt CFO approval on a merely-submitted request.
    resp = client.post(f"/solicitudes/{sid}/cfo-approve", headers=auth(client, "cfo"))
    assert resp.status_code == 409
    assert resp.json()["code"] == "INVALID_WORKFLOW_TRANSITION"


def test_full_supervisor_then_cfo_approval(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    client.post(
        f"/solicitudes/{sid}/supervisor-approve",
        headers=auth(client, "supervisor"),
        json={"final_concept_id": leaf_concept_id(db)},
    )
    resp = client.post(f"/solicitudes/{sid}/cfo-approve", headers=auth(client, "cfo"))
    assert resp.status_code == 200
    assert resp.json()["status"] == "cfo_approved"


def test_cfo_defer(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    client.post(
        f"/solicitudes/{sid}/supervisor-approve",
        headers=auth(client, "supervisor"),
        json={"final_concept_id": leaf_concept_id(db)},
    )
    resp = client.post(
        f"/solicitudes/{sid}/defer",
        headers=auth(client, "cfo"),
        json={"reason": "Sin liquidez esta semana"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "deferred"


def test_reject_flow_supervisor(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    resp = client.post(
        f"/solicitudes/{sid}/reject",
        headers=auth(client, "supervisor"),
        json={"reason": "Documentación incompleta"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def test_correction_flow(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    # Supervisor requests correction.
    corr = client.post(
        f"/solicitudes/{sid}/request-correction",
        headers=auth(client, "supervisor"),
        json={"reason": "Ajustar monto"},
    )
    assert corr.status_code == 200
    assert corr.json()["status"] == "correction_requested"

    # Field admin edits the allowed field, then resubmits.
    edit = client.patch(
        f"/solicitudes/{sid}",
        headers=auth(client, "field_admin"),
        json={"net_amount": "12000.00"},
    )
    assert edit.status_code == 200
    resubmit = client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    assert resubmit.status_code == 200
    assert resubmit.json()["status"] == "submitted"


def test_financial_edit_is_audited(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    client.post(
        f"/solicitudes/{sid}/request-correction",
        headers=auth(client, "supervisor"),
        json={"reason": "Ajustar monto"},
    )
    client.patch(
        f"/solicitudes/{sid}",
        headers=auth(client, "field_admin"),
        json={"net_amount": "99999.00"},
    )
    actions = [
        e.action
        for e in db.execute(
            select(AuditEvent).where(AuditEvent.entity_id == sid)
        ).scalars()
    ]
    assert "financial_edited" in actions


def test_audit_trail_records_each_transition(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    client.post(
        f"/solicitudes/{sid}/supervisor-approve",
        headers=auth(client, "supervisor"),
        json={"final_concept_id": leaf_concept_id(db)},
    )
    client.post(f"/solicitudes/{sid}/cfo-approve", headers=auth(client, "cfo"))

    actions = [
        e.action
        for e in db.execute(
            select(AuditEvent)
            .where(AuditEvent.entity_id == sid)
            .order_by(AuditEvent.created_at)
        ).scalars()
    ]
    assert "created" in actions
    assert "submitted" in actions
    assert "supervisor_approved" in actions
    assert "cfo_approved" in actions


def test_cannot_edit_after_submit(client, db):
    sid = make_submittable_solicitud(client, db)
    client.post(f"/solicitudes/{sid}/submit", headers=auth(client, "field_admin"))
    resp = client.patch(
        f"/solicitudes/{sid}",
        headers=auth(client, "field_admin"),
        json={"net_amount": "1.00"},
    )
    assert resp.status_code == 409
    assert resp.json()["code"] == "INVALID_WORKFLOW_TRANSITION"
