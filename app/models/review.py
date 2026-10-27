import uuid
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, Column, String, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("product_id", "user_id", name="uq_reviews_product_user"),
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_reviews_rating_range"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    rating = Column(Integer, nullable=False)
    title = Column(String(150), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    product = relationship("Product", back_populates="reviews")
    user = relationship("User")

    @property
    def reviewer_name(self) -> str:
        return self.user.name if self.user else "Deleted User"
