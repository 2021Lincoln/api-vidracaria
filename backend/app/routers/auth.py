from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.deps import get_current_user, get_db, get_tenant_id
from app.models import User
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.Token)
def login(
    payload: schemas.LoginRequest,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
) -> schemas.Token:
    user = db.query(User).filter(User.email == payload.email, User.tenant_id == tenant_id).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email or password invalid")
    token = create_access_token(subject=user.email, role=user.role, tenant_id=user.tenant_id)
    return schemas.Token(access_token=token, role=user.role, name=user.name)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
