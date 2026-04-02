from typing import List, Optional
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import schemas
from app.deps import get_db, get_pdf_user, get_tenant_id, require_roles
from app.models import Client, Quote, QuoteItem, User
from app.services.pdf_service import build_quote_pdf

router = APIRouter(prefix="/quotes", tags=["quotes"])


def _calc_total(items: list[QuoteItem], discount: float) -> float:
    gross = sum(item.line_total for item in items)
    total = gross - discount
    return total if total > 0 else 0.0


@router.post("", response_model=schemas.QuoteOut)
def create_quote(
    payload: schemas.QuoteCreate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor")),
) -> Quote:
    client = db.query(Client).filter(Client.id == payload.client_id, Client.tenant_id == tenant_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente nao encontrado")

    quote = Quote(
        tenant_id=tenant_id,
        client_id=payload.client_id,
        status=payload.status,
        description=payload.description,
        measurement_date=payload.measurement_date,
        validity_date=payload.validity_date,
        discount=payload.discount,
        total=0.0,
    )
    db.add(quote)
    db.flush()

    items: list[QuoteItem] = []
    for item in payload.items:
        line_total = item.quantity * item.unit_price
        db_item = QuoteItem(
            tenant_id=tenant_id,
            quote_id=quote.id,
            description=item.description,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            line_total=line_total,
        )
        items.append(db_item)
        db.add(db_item)

    quote.total = _calc_total(items, payload.discount)
    db.commit()
    db.refresh(quote)
    return quote


@router.get("", response_model=List[schemas.QuoteOut])
def list_quotes(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor", "instalador")),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[Quote]:
    q = db.query(Quote).filter(Quote.tenant_id == tenant_id)
    if status:
        q = q.filter(Quote.status == status)
    return q.order_by(Quote.id.desc()).offset(skip).limit(limit).all()


@router.get("/{quote_id}", response_model=schemas.QuoteOut)
def get_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor", "instalador")),
) -> Quote:
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.tenant_id == tenant_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")
    return quote


@router.put("/{quote_id}", response_model=schemas.QuoteOut)
def update_quote(
    quote_id: int,
    payload: schemas.QuoteUpdate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor")),
) -> Quote:
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.tenant_id == tenant_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(quote, key, value)

    quote.total = _calc_total(quote.items, quote.discount)
    db.commit()
    db.refresh(quote)
    return quote


@router.post("/{quote_id}/items", response_model=schemas.QuoteOut)
def add_quote_item(
    quote_id: int,
    payload: schemas.QuoteItemCreate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor")),
) -> Quote:
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.tenant_id == tenant_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")

    item = QuoteItem(
        tenant_id=tenant_id,
        quote_id=quote.id,
        description=payload.description,
        quantity=payload.quantity,
        unit=payload.unit,
        unit_price=payload.unit_price,
        line_total=payload.quantity * payload.unit_price,
    )
    db.add(item)
    db.flush()

    quote.total = _calc_total(quote.items, quote.discount)
    db.commit()
    db.refresh(quote)
    return quote


@router.delete("/{quote_id}", status_code=204)
def delete_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin")),
) -> None:
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.tenant_id == tenant_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")
    if quote.order is not None:
        raise HTTPException(status_code=409, detail="Nao e possivel excluir orcamento com pedido vinculado")
    db.delete(quote)
    db.commit()


@router.get("/{quote_id}/pdf")
def quote_pdf(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_pdf_user),
) -> StreamingResponse:
    tenant_id = current_user.tenant_id
    quote = db.query(Quote).filter(Quote.id == quote_id, Quote.tenant_id == tenant_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")

    payload = build_quote_pdf(quote)
    return StreamingResponse(
        BytesIO(payload),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="orcamento-{quote_id}.pdf"'},
    )
