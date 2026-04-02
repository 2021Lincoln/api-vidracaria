"""add_employee_status_and_installer_id

Revision ID: 32292744d394
Revises: 20260228_0001
Create Date: 2026-03-01 01:22:18.272316

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '32292744d394'
down_revision: Union[str, None] = '20260228_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # installer_id may already exist if a previous partial migration ran
    import sqlite3
    from alembic import op as _op
    conn = _op.get_bind()
    cols = [row[1] for row in conn.execute(sa.text("PRAGMA table_info(orders)")).fetchall()]
    if 'installer_id' not in cols:
        op.add_column('orders', sa.Column('installer_id', sa.Integer(), nullable=True))
    cols_u = [row[1] for row in conn.execute(sa.text("PRAGMA table_info(users)")).fetchall()]
    if 'current_status' not in cols_u:
        op.add_column('users', sa.Column('current_status', sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'current_status')
    op.drop_column('orders', 'installer_id')
