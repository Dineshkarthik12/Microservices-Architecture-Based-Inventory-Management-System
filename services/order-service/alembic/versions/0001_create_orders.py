"""create orders table

Revision ID: 0001_create_orders
Revises:
Create Date: 2026-05-01
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_create_orders"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="PLACED"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_orders_user_id", "orders", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_orders_user_id", table_name="orders")
    op.drop_table("orders")
