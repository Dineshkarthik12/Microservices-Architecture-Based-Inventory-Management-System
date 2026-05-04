from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CreateOrderRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    email: EmailStr


class OrderOut(BaseModel):
    id: int
    user_id: int
    product_id: int
    quantity: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
