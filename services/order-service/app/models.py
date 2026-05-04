from sqlalchemy import Column, DateTime, Integer, String, func

from .database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    product_id = Column(Integer, nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="PLACED")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
