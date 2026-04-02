from typing import List, Optional
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import schemas
from app.deps import get_db, get_pdf_user, get_tenant_id, require_roles
from app.models import Order, Payment, Quote, User
from app.services.payment_service import create_payment_link
from app.services.pdf_service import build_order_pdf
from app.services.whatsapp_service import send_whatsapp_message

router = APIRouter(prefix="/orders", tags=["orders"])


def _paid_amount(order: Order) -> float:
    return sum(payment.amount for payment in order.payments if payment.status == "paid")


@router.post("", response_model=schemas.OrderOut)
def create_order(
    payload: schemas.OrderCreate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor")),
) -> Order:
    quote = db.query(Quote).filter(Quote.id == payload.quote_id, Quote.tenant_id == tenant_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Orcamento nao encontrado")

    exists = db.query(Order).filter(Order.quote_id == payload.quote_id, Order.tenant_id == tenant_id).first()
    if exists:
        raise HTTPException(status_code=409, detail="Pedido ja existe para esse orcamento")

    order = Order(
        tenant_id=tenant_id,
        quote_id=payload.quote_id,
        status=payload.status,
        scheduled_installation=payload.scheduled_installation,
        installed_at=payload.installed_at,
        notes=payload.notes,
        total=quote.total,
    )
    quote.status = "approved"

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.post("/from-quote/{quote_id}", response_model=schemas.OrderOut)
def create_order_from_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor")),
) -> Order:
    payload = schemas.OrderCreate(quote_id=quote_id)
    return create_order(payload, db, tenant_id)


@router.get("", response_model=List[schemas.OrderOut])
def list_orders(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor", "instalador")),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[Order]:
    q = db.query(Order).filter(Order.tenant_id == tenant_id)
    if status:
        q = q.filter(Order.status == status)
    return q.order_by(Order.id.desc()).offset(skip).limit(limit).all()


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor", "instalador")),
) -> Order:
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")
    return order


@router.put("/{order_id}", response_model=schemas.OrderOut)
def update_order(
    order_id: int,
    payload: schemas.OrderUpdate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor", "instalador")),
) -> Order:
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(order, key, value)

    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/payments", response_model=schemas.PaymentOut)
def add_payment(
    order_id: int,
    payload: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor")),
) -> Payment:
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")

    payment = Payment(
        tenant_id=tenant_id,
        order_id=order_id,
        amount=payload.amount,
        method=payload.method,
        status=payload.status,
        paid_at=payload.paid_at,
        notes=payload.notes,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/{order_id}/summary")
def order_summary(
    order_id: int,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor", "instalador")),
) -> dict:
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")

    paid = _paid_amount(order)
    pending = order.total - paid
    return {
        "order_id": order.id,
        "total": order.total,
        "paid": paid,
        "pending": pending if pending > 0 else 0.0,
    }


@router.post("/{order_id}/payment-link", response_model=schemas.PaymentLinkOut)
def payment_link(
    order_id: int,
    payload: schemas.PaymentLinkRequest,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor")),
) -> dict:
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")

    amount = payload.amount if payload.amount is not None else order.total
    return create_payment_link(order, amount, payload.expires_in_minutes)


@router.post("/{order_id}/notify-whatsapp", response_model=schemas.WhatsappNotifyOut)
def notify_whatsapp(
    order_id: int,
    payload: schemas.WhatsappNotifyRequest,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor", "instalador")),
) -> dict:
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")

    message = payload.message or f"Pedido #{order.id} status: {order.status}. Total: R$ {order.total:.2f}"
    return send_whatsapp_message(payload.phone, message)


@router.get("/{order_id}/pdf")
def order_pdf(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_pdf_user),
) -> StreamingResponse:
    tenant_id = current_user.tenant_id
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado")

    payload = build_order_pdf(order)
    return StreamingResponse(
        BytesIO(payload),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="pedido-{order_id}.pdf"'},
    )
