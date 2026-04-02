from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core_config import settings
from app.models import BaseModel, User
from app.security import get_password_hash

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = BaseModel


def seed_default_admin() -> None:
    db = SessionLocal()
    try:
        existing = (
            db.query(User)
            .filter(User.email == settings.default_admin_email, User.tenant_id == settings.default_tenant_id)
            .first()
        )
        if existing:
            return
        admin = User(
            name=settings.default_admin_name,
            email=settings.default_admin_email,
            hashed_password=get_password_hash(settings.default_admin_password),
            role="admin",
            tenant_id=settings.default_tenant_id,
            is_active=True,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()
