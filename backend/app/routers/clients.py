from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import schemas
from app.deps import get_db, get_tenant_id, require_roles
from app.models import Client, User

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("", response_model=schemas.ClientOut)
def create_client(
    payload: schemas.ClientCreate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor")),
) -> Client:
    client = Client(tenant_id=tenant_id, **payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("", response_model=List[schemas.ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor", "instalador")),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[Client]:
    q = db.query(Client).filter(Client.tenant_id == tenant_id)
    if search:
        pattern = f"%{search}%"
        q = q.filter(Client.name.ilike(pattern) | Client.phone.ilike(pattern))
    return q.order_by(Client.id.desc()).offset(skip).limit(limit).all()


@router.get("/{client_id}", response_model=schemas.ClientOut)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor", "instalador")),
) -> Client:
    client = db.query(Client).filter(Client.id == client_id, Client.tenant_id == tenant_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")
    return client


@router.put("/{client_id}", response_model=schemas.ClientOut)
def update_client(
    client_id: int,
    payload: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor")),
) -> Client:
    client = db.query(Client).filter(Client.id == client_id, Client.tenant_id == tenant_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin")),
) -> dict:
    client = db.query(Client).filter(Client.id == client_id, Client.tenant_id == tenant_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")
    db.delete(client)
    db.commit()
    return {"message": "Cliente removido"}
