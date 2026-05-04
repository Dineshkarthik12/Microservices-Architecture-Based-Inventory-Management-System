from fastapi import Header, HTTPException


def get_current_user(x_user_id: str | None = Header(default=None), x_role: str | None = Header(default=None)):
    if not x_user_id or not x_role:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"user_id": int(x_user_id), "role": x_role}
