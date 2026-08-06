"""Enumerations shared across the domain."""
from __future__ import annotations

import enum


class Role(str, enum.Enum):
    admin = "admin"
    engineer = "engineer"
    accountant = "accountant"
    field_admin = "field_admin"
    supervisor = "supervisor"
    cfo = "cfo"
    treasurer = "treasurer"
    ceo = "ceo"


class SupplierStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class ClearanceStatus(str, enum.Enum):
    cleared = "cleared"
    pending = "pending"
    blocked = "blocked"


class RequestType(str, enum.Enum):
    contractor_estimate = "contractor_estimate"
    supplier_invoice = "supplier_invoice"
    reimbursement = "reimbursement"
    government_fee = "government_fee"
    utility = "utility"
    service = "service"
    tax = "tax"
    other = "other"


class SolicitudStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    correction_requested = "correction_requested"
    supervisor_approved = "supervisor_approved"
    cfo_approved = "cfo_approved"
    deferred = "deferred"
    rejected = "rejected"
    cancelled = "cancelled"


class AuditAction(str, enum.Enum):
    created = "created"
    submitted = "submitted"
    supervisor_approved = "supervisor_approved"
    cfo_approved = "cfo_approved"
    rejected = "rejected"
    correction_requested = "correction_requested"
    deferred = "deferred"
    cancelled = "cancelled"
    financial_edited = "financial_edited"
    concept_changed = "concept_changed"
    resubmitted = "resubmitted"
