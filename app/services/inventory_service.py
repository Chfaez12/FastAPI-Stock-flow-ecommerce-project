from sqlalchemy.orm import Session
from app.exceptions import InsufficientStockException, ResourceNotFoundException
from app.models.inventory import Inventory
from app.schemas.inventory import InventoryAdjustmentRequest


def adjust_inventory(db: Session, product_id: str, data: InventoryAdjustmentRequest) -> Inventory:
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).with_for_update().first()
    if not inv:
        raise ResourceNotFoundException(resource="Inventory record", identifier=product_id)

    new_quantity = inv.quantity + data.quantity_delta
    if new_quantity < 0:
        raise InsufficientStockException(
            product_name=inv.product.name if inv.product else product_id,
            available=inv.quantity,
            requested=abs(data.quantity_delta)
        )

    inv.quantity = new_quantity
    if data.reorder_level is not None:
        inv.reorder_level = data.reorder_level

    db.commit()
    db.refresh(inv)
    return inv


def get_all_inventory(db: Session) -> list[Inventory]:
    return db.query(Inventory).all()