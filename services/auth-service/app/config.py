from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str = "change_me_super_secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 120

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
