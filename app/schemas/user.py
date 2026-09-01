from pydantic import BaseModel, EmailStr


class UpdateAccountRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str