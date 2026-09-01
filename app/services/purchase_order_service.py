from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.purchase_order import (
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
)
from app.models.supplier import Supplier
from app.schemas.purchase_order import PurchaseOrderCreate


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