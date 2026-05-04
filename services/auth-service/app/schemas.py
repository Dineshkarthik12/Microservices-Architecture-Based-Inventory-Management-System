from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=64)
    role: str = Field(default="USER", pattern="^(ADMIN|USER)$")


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ValidateTokenResponse(BaseModel):
    valid: bool
    userId: int | None = None
    role: str | None = None
