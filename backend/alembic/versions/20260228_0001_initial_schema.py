"""initial schema multi-tenant

Revision ID: 20260228_0001
Revises:
Create Date: 2026-02-28 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260228_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=180), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.Column("tenant_id", sa.String(length=60), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=60), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=False),
        sa.Column("email", sa.String(length=180), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("document", sa.String(length=30), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_clients_id", "clients", ["id"])
    op.create_index("ix_clients_tenant_id", "clients", ["tenant_id"])

    op.create_table(
        "quotes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=60), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("measurement_date", sa.String(length=30), nullable=True),
        sa.Column("validity_date", sa.String(length=30), nullable=True),
        sa.Column("discount", sa.Float(), nullable=True),
        sa.Column("total", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_quotes_id", "quotes", ["id"])
    op.create_index("ix_quotes_tenant_id", "quotes", ["tenant_id"])

    op.create_table(
        "quote_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=60), nullable=False),
        sa.Column("quote_id", sa.Integer(), sa.ForeignKey("quotes.id"), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("line_total", sa.Float(), nullable=False),
    )
    op.create_index("ix_quote_items_id", "quote_items", ["id"])
    op.create_index("ix_quote_items_tenant_id", "quote_items", ["tenant_id"])

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=60), nullable=False),
        sa.Column("quote_id", sa.Integer(), sa.ForeignKey("quotes.id"), nullable=False, unique=True),
        sa.Column("status", sa.String(length=30), nullable=True),
        sa.Column("scheduled_installation", sa.String(length=30), nullable=True),
        sa.Column("installed_at", sa.String(length=30), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("total", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_orders_id", "orders", ["id"])
    op.create_index("ix_orders_tenant_id", "orders", ["tenant_id"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=60), nullable=False),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("method", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("paid_at", sa.String(length=30), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_payments_id", "payments", ["id"])
    op.create_index("ix_payments_tenant_id", "payments", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_payments_tenant_id", table_name="payments")
    op.drop_index("ix_payments_id", table_name="payments")
    op.drop_table("payments")

    op.drop_index("ix_orders_tenant_id", table_name="orders")
    op.drop_index("ix_orders_id", table_name="orders")
    op.drop_table("orders")

    op.drop_index("ix_quote_items_tenant_id", table_name="quote_items")
    op.drop_index("ix_quote_items_id", table_name="quote_items")
    op.drop_table("quote_items")

    op.drop_index("ix_quotes_tenant_id", table_name="quotes")
    op.drop_index("ix_quotes_id", table_name="quotes")
    op.drop_table("quotes")

    op.drop_index("ix_clients_tenant_id", table_name="clients")
    op.drop_index("ix_clients_id", table_name="clients")
    op.drop_table("clients")

    op.drop_index("ix_users_tenant_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
