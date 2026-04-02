from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.deps import get_db, get_tenant_id, require_roles
from app.models import SiteConfig, User

router = APIRouter(prefix="/site-config", tags=["site-config"])


def _get_or_create(db: Session, tenant_id: str) -> SiteConfig:
    cfg = db.query(SiteConfig).filter(SiteConfig.tenant_id == tenant_id).first()
    if not cfg:
        cfg = SiteConfig(tenant_id=tenant_id)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


@router.get("", response_model=schemas.SiteConfigOut)
def get_site_config(
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
) -> SiteConfig:
    return _get_or_create(db, tenant_id)


@router.put("", response_model=schemas.SiteConfigOut)
def update_site_config(
    payload: schemas.SiteConfigUpdate,
    db: Session = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _: User = Depends(require_roles("admin")),
) -> SiteConfig:
    cfg = _get_or_create(db, tenant_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(cfg, field, value)
    db.commit()
    db.refresh(cfg)
    return cfg
