from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.inventory import Inventory
from app.schemas.inventory import InventoryAdjustmentRequest


def adjust_inventory(db: Session, product_id: str, data: InventoryAdjustmentRequest) -> Inventory:
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).with_for_update().first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory record not found")

    new_quantity = inv.quantity + data.quantity_delta
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient inventory. Current stock: {inv.quantity}"
        )

    inv.quantity = new_quantity
    if data.reorder_level is not None:
        inv.reorder_level = data.reorder_level

    db.commit()
    db.refresh(inv)
    return inv


def get_all_inventory(db: Session) -> list[Inventory]:
    return db.query(Inventory).all()