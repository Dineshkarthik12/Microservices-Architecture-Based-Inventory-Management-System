from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session

from .database import get_db
from .deps import require_admin, require_user_context
from .models import Product
from .schemas import ProductCreate, ProductDecreaseStock, ProductOut, ProductUpdateStock

app = FastAPI(title="Inventory Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id.desc()).all()


@app.post("/products", response_model=ProductOut, dependencies=[Depends(require_admin)])
def add_product(payload: ProductCreate, db: Session = Depends(get_db)):
    product = Product(name=payload.name, stock=payload.stock)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@app.patch("/products/{product_id}/stock", response_model=ProductOut, dependencies=[Depends(require_admin)])
def update_stock(product_id: int, payload: ProductUpdateStock, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.stock = payload.stock
    db.commit()
    db.refresh(product)
    return product


@app.post("/internal/decrease-stock")
def decrease_stock(
    payload: ProductDecreaseStock,
    db: Session = Depends(get_db),
    _: dict = Depends(require_user_context),
):
    stmt = (
        update(Product)
        .where(Product.id == payload.product_id, Product.stock >= payload.quantity)
        .values(stock=Product.stock - payload.quantity)
    )
    result = db.execute(stmt)
    if result.rowcount == 0:
        db.rollback()
        raise HTTPException(status_code=400, detail="Insufficient stock or product not found")
    db.commit()
    return {"success": True}
