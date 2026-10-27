"""add_reviews_wishlist_coupons

Revision ID: c3d8e5f2a1b4
Revises: b7c41e2a9f10
Create Date: 2026-10-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d8e5f2a1b4'
down_revision: Union[str, Sequence[str], None] = 'b7c41e2a9f10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('coupons',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('code', sa.String(length=50), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('discount_type', sa.Enum('PERCENTAGE', 'FIXED', name='discount_type_enum'), nullable=False),
    sa.Column('discount_value', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('min_order_amount', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('max_discount_amount', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('usage_limit', sa.Integer(), nullable=True),
    sa.Column('usage_limit_per_user', sa.Integer(), nullable=True),
    sa.Column('times_used', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coupons_code'), 'coupons', ['code'], unique=True)

    op.create_table('reviews',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('product_id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('rating', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=150), nullable=True),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.CheckConstraint('rating BETWEEN 1 AND 5', name='ck_reviews_rating_range'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('product_id', 'user_id', name='uq_reviews_product_user')
    )
    op.create_index(op.f('ix_reviews_product_id'), 'reviews', ['product_id'], unique=False)
    op.create_index(op.f('ix_reviews_user_id'), 'reviews', ['user_id'], unique=False)

    op.create_table('wishlist_items',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('product_id', sa.String(length=36), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'product_id', name='uq_wishlist_user_product')
    )
    op.create_index(op.f('ix_wishlist_items_user_id'), 'wishlist_items', ['user_id'], unique=False)

    # Existing orders had no discounts, so their subtotal equals their total.
    with op.batch_alter_table('orders') as batch_op:
        batch_op.add_column(sa.Column('subtotal_amount', sa.Numeric(precision=12, scale=2), nullable=True))
        batch_op.add_column(
            sa.Column('discount_amount', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False)
        )
        batch_op.add_column(sa.Column('coupon_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('coupon_code', sa.String(length=50), nullable=True))
        batch_op.create_foreign_key('fk_orders_coupon_id', 'coupons', ['coupon_id'], ['id'], ondelete='SET NULL')
    op.execute('UPDATE orders SET subtotal_amount = total_amount')
    with op.batch_alter_table('orders') as batch_op:
        batch_op.alter_column('subtotal_amount', existing_type=sa.Numeric(precision=12, scale=2), nullable=False)

    # Speeds up the default "newest first" product and order listings.
    op.create_index('ix_products_created_at', 'products', ['created_at'], unique=False)
    op.create_index('ix_orders_customer_id_created_at', 'orders', ['customer_id', 'created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_orders_customer_id_created_at', table_name='orders')
    op.drop_index('ix_products_created_at', table_name='products')
    with op.batch_alter_table('orders') as batch_op:
        batch_op.drop_constraint('fk_orders_coupon_id', type_='foreignkey')
        batch_op.drop_column('coupon_code')
        batch_op.drop_column('coupon_id')
        batch_op.drop_column('discount_amount')
        batch_op.drop_column('subtotal_amount')
    op.drop_index(op.f('ix_wishlist_items_user_id'), table_name='wishlist_items')
    op.drop_table('wishlist_items')
    op.drop_index(op.f('ix_reviews_user_id'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_product_id'), table_name='reviews')
    op.drop_table('reviews')
    op.drop_index(op.f('ix_coupons_code'), table_name='coupons')
    op.drop_table('coupons')
    sa.Enum(name='discount_type_enum').drop(op.get_bind(), checkfirst=True)
