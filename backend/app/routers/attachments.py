"""Attachment routes — upload, list and authenticated download."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..enums import SolicitudStatus
from ..errors import InvalidWorkflowTransition, NotFound, PermissionDenied
from ..models import Attachment, Solicitud, User
from ..schemas.solicitud import AttachmentOut
from ..services import permissions
from ..services.permissions import can_view_solicitud
from ..services.storage import get_storage

router = APIRouter(prefix="/solicitudes/{solicitud_id}/attachments", tags=["attachments"])

# Attachments may be added while the request is still being prepared.
_UPLOADABLE = {SolicitudStatus.draft, SolicitudStatus.correction_requested}


def _get_solicitud(db: Session, solicitud_id: str) -> Solicitud:
    solicitud = db.get(Solicitud, solicitud_id)
    if solicitud is None:
        raise NotFound("La solicitud indicada no existe.")
    return solicitud


@router.get("", response_model=list[AttachmentOut])
def list_attachments(
    solicitud_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Attachment]:
    solicitud = _get_solicitud(db, solicitud_id)
    if not can_view_solicitud(user, solicitud):
        raise PermissionDenied()
    return list(
        db.execute(
            select(Attachment)
            .where(Attachment.solicitud_id == solicitud_id)
            .order_by(Attachment.uploaded_at)
        ).scalars()
    )


@router.post("", response_model=AttachmentOut, status_code=201)
async def upload_attachment(
    solicitud_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Attachment:
    solicitud = _get_solicitud(db, solicitud_id)
    if not permissions.has_capability(user, permissions.SOLICITUD_UPLOAD):
        raise PermissionDenied()
    is_owner = solicitud.captured_by == user.id
    if not (is_owner or user.role.value == "admin"):
        raise PermissionDenied()
    if solicitud.status not in _UPLOADABLE:
        raise InvalidWorkflowTransition(
            "Solo pueden adjuntarse documentos en borrador o durante una corrección."
        )

    storage = get_storage()
    data = await file.read()
    key = storage.build_key(solicitud_id, file.filename or "documento")
    storage.put(key, data)

    attachment = Attachment(
        solicitud_id=solicitud_id,
        file_name=file.filename or "documento",
        file_path_or_s3_key=key,
        content_type=file.content_type,
        uploaded_by=user.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/{attachment_id}/download")
def download_attachment(
    solicitud_id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    solicitud = _get_solicitud(db, solicitud_id)
    if not can_view_solicitud(user, solicitud):
        raise PermissionDenied()
    attachment = db.get(Attachment, attachment_id)
    if attachment is None or attachment.solicitud_id != solicitud_id:
        raise NotFound("El documento indicado no existe.")

    storage = get_storage()
    if not storage.exists(attachment.file_path_or_s3_key):
        raise NotFound("El archivo no está disponible en el almacenamiento.")
    data = storage.get(attachment.file_path_or_s3_key)
    return Response(
        content=data,
        media_type=attachment.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{attachment.file_name}"'
        },
    )
