import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .deps import get_current_user
from .models import Order
from .schemas import CreateOrderRequest, OrderOut

app = FastAPI(title="Order Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def place_order(payload: CreateOrderRequest, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user["role"] not in {"USER", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Forbidden")

    async with httpx.AsyncClient(timeout=10.0) as client:
        stock_response = await client.post(
            f"{settings.inventory_service_url}/internal/decrease-stock",
            json={"product_id": payload.product_id, "quantity": payload.quantity},
            headers={"x-user-id": str(user["user_id"]), "x-role": user["role"]},
        )
        if stock_response.status_code >= 400:
            raise HTTPException(status_code=400, detail="Failed to reserve stock")

        order = Order(
            user_id=user["user_id"],
            product_id=payload.product_id,
            quantity=payload.quantity,
            status="PLACED",
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        await client.post(
            f"{settings.notification_service_url}/send-email",
            json={
                "email": payload.email,
                "subject": "Order Placed Successfully",
                "message": f"Your order #{order.id} was placed successfully.",
            },
            headers={"x-user-id": str(user["user_id"]), "x-role": user["role"]},
        )

    return order


@app.get("/orders", response_model=list[OrderOut])
def get_orders(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    query = db.query(Order)
    if user["role"] == "USER":
        query = query.filter(Order.user_id == user["user_id"])
    return query.order_by(Order.id.desc()).all()
