from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship

BaseModel = declarative_base()


class User(BaseModel):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(180), index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="vendedor")
    tenant_id = Column(String(60), nullable=False, index=True, default="afqa")
    is_active = Column(Boolean, default=True)
    current_status = Column(String(30), nullable=True, default="disponivel")
    created_at = Column(DateTime, default=datetime.utcnow)

    assigned_orders = relationship("Order", back_populates="installer", foreign_keys="Order.installer_id")


class Client(BaseModel):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(60), nullable=False, index=True, default="afqa")
    name = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(180), nullable=True)
    address = Column(String(255), nullable=True)
    document = Column(String(30), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    quotes = relationship("Quote", back_populates="client")


class Quote(BaseModel):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(60), nullable=False, index=True, default="afqa")
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    status = Column(String(30), default="draft")
    description = Column(Text, nullable=False)
    measurement_date = Column(String(30), nullable=True)
    validity_date = Column(String(30), nullable=True)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="quotes")
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")
    order = relationship("Order", back_populates="quote", uselist=False)


class QuoteItem(BaseModel):
    __tablename__ = "quote_items"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(60), nullable=False, index=True, default="afqa")
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False)
    description = Column(String(200), nullable=False)
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String(20), nullable=False, default="un")
    unit_price = Column(Float, nullable=False, default=0.0)
    line_total = Column(Float, nullable=False, default=0.0)

    quote = relationship("Quote", back_populates="items")


class Order(BaseModel):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(60), nullable=False, index=True, default="afqa")
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False, unique=True)
    installer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(30), default="open")
    scheduled_installation = Column(String(30), nullable=True)
    installed_at = Column(String(30), nullable=True)
    notes = Column(Text, nullable=True)
    total = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    quote = relationship("Quote", back_populates="order")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    installer = relationship("User", back_populates="assigned_orders", foreign_keys=[installer_id])


class Payment(BaseModel):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(60), nullable=False, index=True, default="afqa")
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(String(30), nullable=False, default="pix")
    status = Column(String(30), nullable=False, default="paid")
    paid_at = Column(String(30), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payments")


class SiteConfig(BaseModel):
    __tablename__ = "site_configs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(60), nullable=False, index=True, unique=True, default="afqa")
    # Contato
    phone1 = Column(String(30), nullable=True, default="")
    phone2 = Column(String(30), nullable=True, default="")
    whatsapp = Column(String(30), nullable=True, default="")
    email = Column(String(180), nullable=True, default="")
    address = Column(String(255), nullable=True, default="")
    hours = Column(String(100), nullable=True, default="")
    # Redes sociais
    instagram = Column(String(255), nullable=True, default="")
    facebook = Column(String(255), nullable=True, default="")
    youtube = Column(String(255), nullable=True, default="")
    tiktok = Column(String(255), nullable=True, default="")
    # Configurações gerais
    site_name = Column(String(120), nullable=True, default="")
    tagline = Column(String(255), nullable=True, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
