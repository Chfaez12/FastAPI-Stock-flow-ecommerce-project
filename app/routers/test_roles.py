from fastapi import APIRouter, Depends
from app.dependencies.auth import require_roles
from app.models.user import User, UserRole

router = APIRouter(prefix="/portal", tags=["Role Protected Endpoints"])


@router.get("/business/dashboard")
def business_dashboard(current_user: User = Depends(require_roles(UserRole.BUSINESS))):
    return {"message": f"Welcome Business User: {current_user.email}", "role": current_user.role}


@router.get("/customer/orders")
def customer_orders(current_user: User = Depends(require_roles(UserRole.CUSTOMER))):
    return {"message": f"Welcome Customer: {current_user.email}", "role": current_user.role}