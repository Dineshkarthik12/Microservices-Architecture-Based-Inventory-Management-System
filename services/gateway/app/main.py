from jose import JWTError, jwt
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings

app = FastAPI(title="API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICE_MAP = {
    "auth": settings.auth_service_url,
    "inventory": settings.inventory_service_url,
    "orders": settings.order_service_url,
    "notify": settings.notification_service_url,
}


def decode_token(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


def is_protected(path: str, method: str) -> bool:
    if path.startswith("/auth/"):
        return False
    if path == "/inventory/products" and method == "GET":
        return False
    return path.startswith("/inventory/") or path.startswith("/orders/") or path.startswith("/notify/")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.api_route("/{service}/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(service: str, path: str, request: Request):
    base_url = SERVICE_MAP.get(service)
    if not base_url:
        raise HTTPException(status_code=404, detail="Unknown service")

    inbound_path = f"/{service}/{path}"
    user = None
    if is_protected(inbound_path, request.method):
        user = decode_token(request.headers.get("authorization"))
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or missing token")

    target_url = f"{base_url}/{path}"
    headers = dict(request.headers)
    headers.pop("host", None)
    if user:
        headers["x-user-id"] = str(user.get("userId"))
        headers["x-role"] = str(user.get("role"))

    body = await request.body()
    async with httpx.AsyncClient(timeout=20.0) as client:
        upstream = await client.request(
            request.method,
            target_url,
            params=request.query_params,
            content=body,
            headers=headers,
        )
    if upstream.headers.get("content-type", "").startswith("application/json"):
        return JSONResponse(status_code=upstream.status_code, content=upstream.json())
    return Response(status_code=upstream.status_code, content=upstream.content)
