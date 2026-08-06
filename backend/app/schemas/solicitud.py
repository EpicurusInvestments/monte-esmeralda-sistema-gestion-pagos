"""Solicitud de Pago schemas."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from ..enums import RequestType, SolicitudStatus
from .concept import ConceptOut
from .supplier import SupplierOut


class SolicitudCreate(BaseModel):
    request_type: RequestType
    supplier_id: str
    description: str = Field(min_length=1)
    net_amount: Decimal = Field(gt=0)
    proposed_concept_id: str | None = None
    proposed_payment_week: str | None = None
    document_date: date | None = None
    due_date: date | None = None


class SolicitudUpdate(BaseModel):
    """Fields editable while a request is in draft or correction_requested."""

    request_type: RequestType | None = None
    supplier_id: str | None = None
    description: str | None = None
    net_amount: Decimal | None = Field(default=None, gt=0)
    proposed_concept_id: str | None = None
    proposed_payment_week: str | None = None
    document_date: date | None = None
    due_date: date | None = None


class AttachmentOut(BaseModel):
    id: str
    solicitud_id: str
    file_name: str
    content_type: str | None
    uploaded_by: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    body: str = Field(min_length=1)


class CommentOut(BaseModel):
    id: str
    solicitud_id: str
    author_id: str
    author_name: str | None = None
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditEventOut(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    performed_by: str | None
    performed_by_name: str | None = None
    before_json: dict | None
    after_json: dict | None
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowAction(BaseModel):
    """Body for approve/reject/defer/request-correction actions."""

    reason: str | None = None
    final_concept_id: str | None = None  # used by supervisor approve / assign


class SolicitudListItem(BaseModel):
    id: str
    folio: str
    request_type: RequestType
    supplier_id: str
    supplier_name: str | None = None
    final_concept_id: str | None = None
    proposed_concept_id: str | None = None
    concept_label: str | None = None
    net_amount: Decimal
    status: SolicitudStatus
    document_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SolicitudDetail(BaseModel):
    id: str
    folio: str
    request_type: RequestType
    supplier_id: str
    description: str
    net_amount: Decimal
    proposed_concept_id: str | None
    final_concept_id: str | None
    proposed_payment_week: str | None
    document_date: date | None
    due_date: date | None
    status: SolicitudStatus
    captured_by: str
    submitted_at: datetime | None
    supervisor_reviewed_by: str | None
    supervisor_reviewed_at: datetime | None
    cfo_reviewed_by: str | None
    cfo_reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    supplier: SupplierOut | None = None
    proposed_concept: ConceptOut | None = None
    final_concept: ConceptOut | None = None
    attachments: list[AttachmentOut] = []
    comments: list[CommentOut] = []
    audit_events: list[AuditEventOut] = []

    model_config = {"from_attributes": True}
