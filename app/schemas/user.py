from pydantic import BaseModel, Field


class UpdateAccountRequest(BaseModel):
    name: str | None = None
    phone: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)