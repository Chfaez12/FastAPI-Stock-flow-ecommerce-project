from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.pagination import PageParams, page_params
from app.dependencies.auth import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.pagination import Page
from app.schemas.review import ReviewCreate, ReviewEligibility, ReviewResponse, ReviewSummary, ReviewUpdate
from app.services import review_service
from app.services.review_service import ReviewSort

router = APIRouter(tags=["Reviews"])


@router.get(
    "/products/{product_id}/reviews",
    response_model=Page[ReviewResponse],
    summary="List a product's reviews",
)
def list_reviews(
    product_id: str,
    rating: int | None = Query(None, ge=1, le=5, description="Only reviews with this star rating"),
    sort: ReviewSort = ReviewSort.NEWEST,
    params: PageParams = Depends(page_params),
    db: Session = Depends(get_db),
):
    return review_service.list_reviews(db, product_id, params, rating=rating, sort=sort)


@router.get(
    "/products/{product_id}/reviews/summary",
    response_model=ReviewSummary,
    summary="Average rating and star distribution for a product",
)
def get_review_summary(product_id: str, db: Session = Depends(get_db)):
    return review_service.get_summary(db, product_id)


@router.get(
    "/products/{product_id}/reviews/eligibility",
    response_model=ReviewEligibility,
    summary="[Customer] Check whether you can review a product",
)
def get_review_eligibility(
    product_id: str,
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
):
    return review_service.get_eligibility(db, product_id, current_user)


@router.post(
    "/products/{product_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Customer] Review a product you have received",
)
def create_review(
    product_id: str,
    data: ReviewCreate,
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
):
    return review_service.create_review(db, product_id, current_user, data)


@router.patch("/reviews/{review_id}", response_model=ReviewResponse, summary="Edit your review")
def update_review(
    review_id: str,
    data: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return review_service.update_review(db, review_id, current_user, data)


@router.delete(
    "/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete your review (business users can delete any review)",
)
def delete_review(
    review_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review_service.delete_review(db, review_id, current_user)
