from datetime import datetime

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    stock: int = Field(ge=0)


class ProductUpdateStock(BaseModel):
    stock: int = Field(ge=0)


class ProductDecreaseStock(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class ProductOut(BaseModel):
    id: int
    name: str
    stock: int
    created_at: datetime

    class Config:
        from_attributes = True
