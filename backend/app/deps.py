"""FastAPI dependencies: DB session, current user, capability guards."""
from __future__ import annotations

from typing import Callable

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .errors import AuthenticationError, PermissionDenied
from .models import User
from .security import decode_access_token
from .services import permissions

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise AuthenticationError("No se proporcionó un token de autenticación.")
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise AuthenticationError()
    user = db.get(User, payload["sub"])
    if user is None or not user.is_active:
        raise AuthenticationError("Usuario inexistente o inactivo.")
    return user


def require_capability(capability: str) -> Callable[[User], User]:
    def _guard(user: User = Depends(get_current_user)) -> User:
        if not permissions.has_capability(user, capability):
            raise PermissionDenied()
        return user

    return _guard
