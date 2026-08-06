"""Structured application errors and their FastAPI handlers.

Every error returned to clients has the shape:
    {"code": "<MACHINE_CODE>", "message": "<Spanish message>"}
"""
from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base class for domain errors with a stable machine-readable code."""

    code: str = "APP_ERROR"
    http_status: int = status.HTTP_400_BAD_REQUEST
    default_message: str = "Ocurrió un error."

    def __init__(self, message: str | None = None):
        self.message = message or self.default_message
        super().__init__(self.message)


class PermissionDenied(AppError):
    code = "PERMISSION_DENIED"
    http_status = status.HTTP_403_FORBIDDEN
    default_message = "No tiene permisos para realizar esta acción."


class ValidationError(AppError):
    code = "VALIDATION_ERROR"
    http_status = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_message = "Los datos proporcionados no son válidos."


class InvalidWorkflowTransition(AppError):
    code = "INVALID_WORKFLOW_TRANSITION"
    http_status = status.HTTP_409_CONFLICT
    default_message = "La solicitud no puede aprobarse en su estado actual."


class MissingRequiredAttachment(AppError):
    code = "MISSING_REQUIRED_ATTACHMENT"
    http_status = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_message = "Se requiere al menos un documento adjunto."


class ConceptRequired(AppError):
    code = "CONCEPT_REQUIRED"
    http_status = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_message = "Se requiere un concepto de flujo antes de aprobar."


class ConceptMustBeLeaf(AppError):
    code = "CONCEPT_MUST_BE_LEAF"
    http_status = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_message = (
        "El concepto seleccionado es un encabezado; debe elegir un concepto final."
    )


class SupplierNotFound(AppError):
    code = "SUPPLIER_NOT_FOUND"
    http_status = status.HTTP_404_NOT_FOUND
    default_message = "El proveedor indicado no existe."


class NotFound(AppError):
    code = "NOT_FOUND"
    http_status = status.HTTP_404_NOT_FOUND
    default_message = "El recurso solicitado no existe."


class AuthenticationError(AppError):
    code = "AUTHENTICATION_ERROR"
    http_status = status.HTTP_401_UNAUTHORIZED
    default_message = "Credenciales inválidas o sesión expirada."


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.http_status,
            content={"code": exc.code, "message": exc.message},
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "code": "VALIDATION_ERROR",
                "message": "Los datos proporcionados no son válidos.",
                "details": exc.errors(),
            },
        )
