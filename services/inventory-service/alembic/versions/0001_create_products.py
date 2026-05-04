"""create products table

Revision ID: 0001_create_products
Revises:
Create Date: 2026-05-01
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_create_products"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_products_name", "products", ["name"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_products_name", table_name="products")
    op.drop_table("products")
