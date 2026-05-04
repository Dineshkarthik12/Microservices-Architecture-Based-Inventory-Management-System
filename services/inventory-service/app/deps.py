from fastapi import Header, HTTPException


def require_admin(x_role: str | None = Header(default=None)):
    if x_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")


def require_user_context(x_user_id: str | None = Header(default=None), x_role: str | None = Header(default=None)):
    if not x_user_id or not x_role:
        raise HTTPException(status_code=401, detail="Missing user context")
    return {"user_id": int(x_user_id), "role": x_role}
