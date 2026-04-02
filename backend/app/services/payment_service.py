from datetime import datetime, timedelta
from urllib.parse import urlencode

from app.core_config import settings
from app.models import Order


def create_payment_link(order: Order, amount: float, expires_in_minutes: int = 60) -> dict:
    expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
    provider = settings.payment_provider

    if provider == "mock":
        query = urlencode(
            {
                "order_id": order.id,
                "tenant_id": order.tenant_id,
                "amount": f"{amount:.2f}",
                "expires_at": expires_at.isoformat(),
            }
        )
        checkout_url = f"{settings.payment_public_base_url.rstrip('/')}/checkout?{query}"
    else:
        checkout_url = f"{settings.payment_public_base_url.rstrip('/')}/unsupported-provider"

    return {
        "provider": provider,
        "order_id": order.id,
        "amount": amount,
        "checkout_url": checkout_url,
        "expires_at": expires_at.isoformat(),
    }
