from app.core_config import settings


def send_whatsapp_message(phone: str, message: str) -> dict:
    provider = settings.whatsapp_provider

    if provider == "mock":
        return {
            "provider": provider,
            "phone": phone,
            "message": message,
            "delivered": True,
        }

    return {
        "provider": provider,
        "phone": phone,
        "message": message,
        "delivered": False,
    }
