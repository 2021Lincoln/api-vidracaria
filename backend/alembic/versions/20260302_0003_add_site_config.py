"""add site_config table

Revision ID: 20260302_0003
Revises: 32292744d394
Create Date: 2026-03-02
"""
from alembic import op
import sqlalchemy as sa

revision = "20260302_0003"
down_revision = "32292744d394"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "site_configs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.String(60), nullable=False),
        sa.Column("phone1", sa.String(30), nullable=True),
        sa.Column("phone2", sa.String(30), nullable=True),
        sa.Column("whatsapp", sa.String(30), nullable=True),
        sa.Column("email", sa.String(180), nullable=True),
        sa.Column("address", sa.String(255), nullable=True),
        sa.Column("hours", sa.String(100), nullable=True),
        sa.Column("instagram", sa.String(255), nullable=True),
        sa.Column("facebook", sa.String(255), nullable=True),
        sa.Column("youtube", sa.String(255), nullable=True),
        sa.Column("tiktok", sa.String(255), nullable=True),
        sa.Column("site_name", sa.String(120), nullable=True),
        sa.Column("tagline", sa.String(255), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", name="uq_site_configs_tenant"),
    )
    op.create_index("ix_site_configs_tenant_id", "site_configs", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_site_configs_tenant_id", table_name="site_configs")
    op.drop_table("site_configs")
