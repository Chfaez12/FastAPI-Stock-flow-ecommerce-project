from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.inventory import Inventory
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product, ProductStatus
from app.schemas.order import OrderCreate


def place_customer_order(db: Session, customer_id: str, data: OrderCreate) -> Order:
    order = Order(customer_id=customer_id, total_amount=Decimal("0.00"), status=OrderStatus.PENDING)
    db.add(order)
    db.flush()

    total_amount = Decimal("0.00")

    for item_data in data.items:
        inv = db.query(Inventory).filter(Inventory.product_id == item_data.product_id).with_for_update().first()
        product = db.query(Product).filter(Product.id == item_data.product_id).first()

        if not product or product.status != ProductStatus.ACTIVE:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {item_data.product_id} is unavailable"
            )

        if not inv or inv.quantity < item_data.quantity:
            db.rollback()
            available = inv.quantity if inv else 0
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for '{product.name}'. Available: {available}, Requested: {item_data.quantity}"
            )

        inv.quantity -= item_data.quantity

        item_total = product.price * item_data.quantity
        total_amount += item_total

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item_data.quantity,
            unit_price=product.price
        )
        db.add(order_item)

    order.total_amount = total_amount
    db.commit()
    db.refresh(order)
    return order


def get_customer_orders(db: Session, customer_id: str) -> list[Order]:
    return db.query(Order).filter(Order.customer_id == customer_id).all()


def get_all_orders_for_business(db: Session) -> list[Order]:
    return db.query(Order).all()


def update_order_status(db: Session, order_id: str, new_status: OrderStatus) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if new_status == OrderStatus.CANCELLED and order.status != OrderStatus.CANCELLED:
        for item in order.items:
            inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).with_for_update().first()
            if inv:
                inv.quantity += item.quantity

    order.status = new_status
    db.commit()
    db.refresh(order)
    return order