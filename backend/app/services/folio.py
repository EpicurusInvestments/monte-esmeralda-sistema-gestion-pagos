"""Folio generation for Solicitudes de Pago (SP-000001, SP-000002, ...)."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Solicitud

FOLIO_PREFIX = "SP-"
FOLIO_WIDTH = 6


def next_folio(db: Session) -> str:
    """Return the next sequential folio.

    Computes max(existing numeric suffix) + 1. For the scale of this internal
    workflow tool this is sufficient; the unique constraint on `folio` is the
    final guard against collisions.
    """
    max_folio = db.execute(select(func.max(Solicitud.folio))).scalar()
    if not max_folio:
        next_num = 1
    else:
        try:
            next_num = int(max_folio.replace(FOLIO_PREFIX, "")) + 1
        except ValueError:
            next_num = db.execute(select(func.count(Solicitud.id))).scalar() + 1
    return f"{FOLIO_PREFIX}{next_num:0{FOLIO_WIDTH}d}"
