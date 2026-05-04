from fastapi import Depends, FastAPI, Header, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .schemas import LoginRequest, SignupRequest, TokenResponse, ValidateTokenResponse
from .security import create_access_token, decode_token, hash_password, verify_password

app = FastAPI(title="Auth Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token)


@app.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token)


@app.post("/validate", response_model=ValidateTokenResponse)
def validate_token(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        return ValidateTokenResponse(valid=False)

    token = authorization.split(" ", 1)[1]
    decoded = decode_token(token)
    if not decoded:
        return ValidateTokenResponse(valid=False)

    return ValidateTokenResponse(valid=True, userId=decoded.get("userId"), role=decoded.get("role"))
