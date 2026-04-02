from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db, get_tenant_id, require_roles
from app.models import Order, User
from app.schemas import EmployeeCreate, EmployeeStatusUpdate, EmployeeUpdate, UserOut
from app.security import get_password_hash

router = APIRouter(prefix="/employees", tags=["employees"])

VALID_STATUSES = {"disponivel", "em_deslocamento", "instalando", "medicao", "parado"}
EMPLOYEE_ROLES = {"instalador", "vendedor", "admin"}


@router.get("", response_model=list[UserOut])
def list_employees(
    role: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    current_user: User = Depends(get_current_user),
):
    q = db.query(User).filter(User.tenant_id == tenant_id)
    if role:
        q = q.filter(User.role == role)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    return q.order_by(User.name).all()


@router.post("", response_model=UserOut, status_code=201)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _admin: User = Depends(require_roles("admin")),
):
    if payload.role not in EMPLOYEE_ROLES:
        raise HTTPException(status_code=400, detail=f"Role inválido. Permitidos: {', '.join(EMPLOYEE_ROLES)}")
    existing = db.query(User).filter(User.email == payload.email, User.tenant_id == tenant_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado neste tenant")
    employee = User(
        name=payload.name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        tenant_id=tenant_id,
        is_active=True,
        current_status="disponivel",
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@router.get("/me", response_model=UserOut)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/status", response_model=UserOut)
def update_my_status(
    payload: EmployeeStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.current_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status inválido. Permitidos: {', '.join(VALID_STATUSES)}",
        )
    current_user.current_status = payload.current_status
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{employee_id}", response_model=UserOut)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(User).filter(User.id == employee_id, User.tenant_id == tenant_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    return employee


@router.patch("/{employee_id}", response_model=UserOut)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _admin: User = Depends(require_roles("admin")),
):
    employee = db.query(User).filter(User.id == employee_id, User.tenant_id == tenant_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    if payload.role and payload.role not in EMPLOYEE_ROLES:
        raise HTTPException(status_code=400, detail=f"Role inválido. Permitidos: {', '.join(EMPLOYEE_ROLES)}")
    if payload.email and payload.email != employee.email:
        conflict = db.query(User).filter(User.email == payload.email, User.tenant_id == tenant_id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="E-mail já em uso")
    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "password":
            employee.hashed_password = get_password_hash(value)
        else:
            setattr(employee, field, value)
    db.commit()
    db.refresh(employee)
    return employee


@router.patch("/{employee_id}/status", response_model=UserOut)
def update_employee_status(
    employee_id: int,
    payload: EmployeeStatusUpdate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _admin: User = Depends(require_roles("admin")),
):
    if payload.current_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status inválido. Permitidos: {', '.join(VALID_STATUSES)}",
        )
    employee = db.query(User).filter(User.id == employee_id, User.tenant_id == tenant_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    employee.current_status = payload.current_status
    db.commit()
    db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    current_user: User = Depends(require_roles("admin")),
):
    employee = db.query(User).filter(User.id == employee_id, User.tenant_id == tenant_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    if employee.id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível excluir a si mesmo")
    db.delete(employee)
    db.commit()


@router.get("/{employee_id}/orders", response_model=list)
def get_employee_orders(
    employee_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(User).filter(User.id == employee_id, User.tenant_id == tenant_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    orders = db.query(Order).filter(Order.installer_id == employee_id, Order.tenant_id == tenant_id).all()
    return [
        {
            "id": o.id,
            "quote_id": o.quote_id,
            "status": o.status,
            "scheduled_installation": o.scheduled_installation,
            "installed_at": o.installed_at,
            "notes": o.notes,
            "total": o.total,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]
