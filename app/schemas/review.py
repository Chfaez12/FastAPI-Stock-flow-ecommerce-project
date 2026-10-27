from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: str | None = Field(default=None, max_length=150)
    comment: str | None = Field(default=None, max_length=5000)


class ReviewUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    title: str | None = Field(default=None, max_length=150)
    comment: str | None = Field(default=None, max_length=5000)


class ReviewResponse(BaseModel):
    id: str
    product_id: str
    user_id: str
    reviewer_name: str
    rating: int
    title: str | None
    comment: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewSummary(BaseModel):
    product_id: str
    average_rating: float | None
    review_count: int
    # Number of reviews for each star rating, "1" through "5".
    distribution: dict[str, int]


class ReviewEligibility(BaseModel):
    can_review: bool
    reason: str | None = None
    existing_review: ReviewResponse | None = None
