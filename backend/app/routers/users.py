"""User management routes (Admin only)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_capability
from ..errors import NotFound, ValidationError
from ..models import User
from ..schemas.user import UserCreate, UserOut, UserUpdate
from ..security import hash_password
from ..services import permissions

router = APIRouter(prefix="/users", tags=["users"])

_admin = require_capability(permissions.USER_MANAGE)


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db), _: User = Depends(_admin)
) -> list[User]:
    return list(db.execute(select(User).order_by(User.full_name)).scalars())


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate, db: Session = Depends(get_db), _: User = Depends(_admin)
) -> User:
    email = payload.email.lower()
    exists = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if exists:
        raise ValidationError("Ya existe un usuario con ese correo.")
    user = User(
        email=email,
        full_name=payload.full_name,
        role=payload.role,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFound("El usuario indicado no existe.")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        user.password_hash = hash_password(data.pop("password"))
    else:
        data.pop("password", None)
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
