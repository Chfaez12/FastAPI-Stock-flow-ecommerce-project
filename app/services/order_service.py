from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.entities import (
    Order,
    OrderItem,
    Inventory,
    Product,
    ProductStatus,
    OrderStatus,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    Supplier,
)
from app.schemas.entities import OrderCreate, PurchaseOrderCreate


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



def create_purchase_order(db: Session, data: PurchaseOrderCreate) -> PurchaseOrder:
    if not db.query(Supplier).filter(Supplier.id == data.supplier_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    po = PurchaseOrder(
        supplier_id=data.supplier_id,
        total_amount=Decimal("0.00"),
        status=PurchaseOrderStatus.DRAFT
    )
    db.add(po)
    db.flush()

    total_amount = Decimal("0.00")
    for item_data in data.items:
        if not db.query(Product).filter(Product.id == item_data.product_id).first():
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item_data.product_id} not found"
            )

        item_cost = item_data.unit_cost * item_data.quantity
        total_amount += item_cost

        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            unit_cost=item_data.unit_cost
        )
        db.add(po_item)

    po.total_amount = total_amount
    db.commit()
    db.refresh(po)
    return po


def list_purchase_orders(db: Session) -> list[PurchaseOrder]:
    return db.query(PurchaseOrder).all()


def update_purchase_order_status(db: Session, po_id: str, new_status: PurchaseOrderStatus) -> PurchaseOrder:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")

    if new_status == PurchaseOrderStatus.RECEIVED and po.status != PurchaseOrderStatus.RECEIVED:
        for item in po.items:
            inv = db.query(Inventory).filter(Inventory.product_id == item.product_id).with_for_update().first()
            if inv:
                inv.quantity += item.quantity
            else:
                inv = Inventory(product_id=item.product_id, quantity=item.quantity)
                db.add(inv)

    po.status = new_status
    db.commit()
    db.refresh(po)
    return po