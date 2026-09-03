from decimal import Decimal
from sqlalchemy.orm import Session
from app.exceptions import InsufficientStockException, ResourceNotFoundException, StockFlowException
from app.models.inventory import Inventory
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product, ProductStatus
from app.schemas.order import OrderCreate
from app.exceptions import PermissionDeniedException, ResourceNotFoundException
from app.models.order import Order
from app.models.user import User, UserRole


def place_customer_order(db: Session, customer_id: str, data: OrderCreate) -> Order:
    order = Order(customer_id=customer_id, total_amount=Decimal("0.00"), status=OrderStatus.PENDING)
    db.add(order)
    db.flush()

    total_amount = Decimal("0.00")

    for item_data in data.items:
        inv = db.query(Inventory).filter(Inventory.product_id == item_data.product_id).with_for_update().first()
        product = db.query(Product).filter(Product.id == item_data.product_id).first()

        if not product or product.status != ProductStatus.ACTIVE:
            raise StockFlowException(
                message=f"Product '{item_data.product_id}' is unavailable or inactive.",
                status_code=400
            )

        prod_name = product.name
        avail_qty = inv.quantity if inv else 0

        if avail_qty < item_data.quantity:
            raise InsufficientStockException(
                product_name=prod_name,
                available=avail_qty,
                requested=item_data.quantity
            )

        inv.quantity -= item_data.quantity
        total_amount += product.price * item_data.quantity

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
        raise ResourceNotFoundException(resource="Order", identifier=order_id)

    if new_status == OrderStatus.CANCELLED and order.status != OrderStatus.CANCELLED:
        for item in order.items:
            inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).with_for_update().first()
            if inv:
                inv.quantity += item.quantity

    order.status = new_status
    db.commit()
    db.refresh(order)
    return order

def get_order_by_id(db: Session, order_id: str, current_user: User) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ResourceNotFoundException(resource="Order", identifier=order_id)

    if current_user.role == UserRole.CUSTOMER and order.customer_id != current_user.id:
        raise PermissionDeniedException("You do not have permission to view this order.")

    return order

def cancel_customer_order(db: Session, order_id: str, customer_id: str) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ResourceNotFoundException(resource="Order", identifier=order_id)

    if order.customer_id != customer_id:
        raise PermissionDeniedException("You do not have permission to cancel this order.")

    if order.status != OrderStatus.PENDING:
        raise StockFlowException(
            message=f"Only PENDING orders can be cancelled. Current status is {order.status.value}.",
            status_code=400,
        )

    for item in order.items:
        inventory_record = (
            db.query(Inventory)
            .filter(Inventory.product_id == item.product_id)
            .with_for_update()
            .first()
        )
        if inventory_record:
            inventory_record.quantity += item.quantity

    order.status = OrderStatus.CANCELLED
    db.commit()
    db.refresh(order)
    return order