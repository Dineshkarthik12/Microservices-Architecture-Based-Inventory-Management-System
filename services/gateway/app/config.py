from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    auth_service_url: str
    inventory_service_url: str
    order_service_url: str
    notification_service_url: str
    jwt_secret: str = "change_me_super_secret"
    jwt_algorithm: str = "HS256"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
