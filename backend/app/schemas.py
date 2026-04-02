from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    tenant_id: str
    is_active: bool = True
    current_status: Optional[str] = "disponivel"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmployeeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=180)
    password: str = Field(min_length=6, max_length=100)
    role: str = "instalador"


class EmployeeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[str] = Field(default=None, min_length=5, max_length=180)
    password: Optional[str] = Field(default=None, min_length=6, max_length=100)
    role: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeStatusUpdate(BaseModel):
    current_status: str  # disponivel, em_deslocamento, instalando, medicao, parado


class ClientBase(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=8, max_length=30)
    email: Optional[str] = None
    address: Optional[str] = None
    document: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    phone: Optional[str] = Field(default=None, min_length=8, max_length=30)
    email: Optional[str] = None
    address: Optional[str] = None
    document: Optional[str] = None
    notes: Optional[str] = None


class ClientOut(BaseModel):
    id: int
    tenant_id: str
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    document: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class QuoteItemCreate(BaseModel):
    description: str = Field(min_length=3, max_length=200)
    quantity: float = Field(default=1.0, gt=0)
    unit: str = "un"
    unit_price: float = Field(default=0.0, ge=0)


class QuoteItemOut(BaseModel):
    id: int
    description: str
    quantity: float
    unit: str
    unit_price: float
    line_total: float

    class Config:
        from_attributes = True


class QuoteCreate(BaseModel):
    client_id: int = Field(gt=0)
    description: str = Field(min_length=3)
    measurement_date: Optional[str] = None
    validity_date: Optional[str] = None
    status: str = "draft"
    discount: float = Field(default=0.0, ge=0)
    items: list[QuoteItemCreate] = Field(default_factory=list, min_length=1)


class QuoteUpdate(BaseModel):
    description: Optional[str] = Field(default=None, min_length=3)
    measurement_date: Optional[str] = None
    validity_date: Optional[str] = None
    status: Optional[str] = None
    discount: Optional[float] = Field(default=None, ge=0)


class QuoteOut(BaseModel):
    id: int
    tenant_id: str
    client_id: int
    status: str
    description: str
    measurement_date: Optional[str]
    validity_date: Optional[str]
    discount: float
    total: float
    created_at: datetime
    items: list[QuoteItemOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    method: str = "pix"
    status: str = "paid"
    paid_at: Optional[str] = None
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    tenant_id: str
    order_id: int
    amount: float
    method: str
    status: str
    paid_at: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    quote_id: int
    status: str = "open"
    scheduled_installation: Optional[str] = None
    installed_at: Optional[str] = None
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    scheduled_installation: Optional[str] = None
    installed_at: Optional[str] = None
    notes: Optional[str] = None
    installer_id: Optional[int] = None


class InstallerInfo(BaseModel):
    id: int
    name: str
    current_status: Optional[str] = None

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    tenant_id: str
    quote_id: int
    installer_id: Optional[int] = None
    installer: Optional[InstallerInfo] = None
    status: str
    scheduled_installation: Optional[str]
    installed_at: Optional[str]
    notes: Optional[str]
    total: float
    created_at: datetime
    payments: list[PaymentOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


class DashboardOut(BaseModel):
    clients: int
    quotes: int
    orders: int
    open_orders: int
    monthly_revenue: float
    pending_amount: float


class PaymentLinkRequest(BaseModel):
    amount: Optional[float] = None
    expires_in_minutes: int = 60


class PaymentLinkOut(BaseModel):
    provider: str
    order_id: int
    amount: float
    checkout_url: str
    expires_at: str


class WhatsappNotifyRequest(BaseModel):
    phone: str
    message: Optional[str] = None


class WhatsappNotifyOut(BaseModel):
    provider: str
    phone: str
    message: str
    delivered: bool


class SiteConfigOut(BaseModel):
    phone1: str = ""
    phone2: str = ""
    whatsapp: str = ""
    email: str = ""
    address: str = ""
    hours: str = ""
    instagram: str = ""
    facebook: str = ""
    youtube: str = ""
    tiktok: str = ""
    site_name: str = ""
    tagline: str = ""

    class Config:
        from_attributes = True


class SiteConfigUpdate(BaseModel):
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    hours: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    site_name: Optional[str] = None
    tagline: Optional[str] = None
