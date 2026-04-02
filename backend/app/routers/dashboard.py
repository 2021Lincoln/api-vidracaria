from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import schemas
from app.deps import get_db, get_tenant_id, require_roles
from app.models import Client, Order, Payment, Quote, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardOut)
def summary(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin", "vendedor", "instalador")),
) -> schemas.DashboardOut:
    clients = db.query(func.count(Client.id)).filter(Client.tenant_id == tenant_id).scalar() or 0
    quotes = db.query(func.count(Quote.id)).filter(Quote.tenant_id == tenant_id).scalar() or 0
    orders = db.query(func.count(Order.id)).filter(Order.tenant_id == tenant_id).scalar() or 0
    open_orders = (
        db.query(func.count(Order.id))
        .filter(Order.tenant_id == tenant_id, Order.status.notin_(["installed", "cancelado"]))
        .scalar()
        or 0
    )

    month_prefix = datetime.utcnow().strftime("%Y-%m")
    payments = db.query(Payment).filter(Payment.status == "paid", Payment.tenant_id == tenant_id).all()

    def _payment_month(p) -> str:
        # Usa paid_at se disponível, senão cai para created_at como fallback
        if p.paid_at:
            return str(p.paid_at)[:7]
        if p.created_at:
            return p.created_at.strftime("%Y-%m")
        return ""

    monthly_revenue = sum(p.amount for p in payments if _payment_month(p) == month_prefix)

    # Exclui pedidos cancelados do cálculo de "a receber"
    order_rows = db.query(Order).filter(
        Order.tenant_id == tenant_id,
        Order.status != "cancelado",
    ).all()
    total_orders = sum(o.total for o in order_rows)
    total_paid = sum(p.amount for p in payments)
    pending_amount = total_orders - total_paid

    return schemas.DashboardOut(
        clients=clients,
        quotes=quotes,
        orders=orders,
        open_orders=open_orders,
        monthly_revenue=monthly_revenue,
        pending_amount=pending_amount if pending_amount > 0 else 0.0,
    )
