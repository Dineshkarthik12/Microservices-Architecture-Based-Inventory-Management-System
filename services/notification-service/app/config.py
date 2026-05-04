from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    smtp_host: str
    smtp_port: int = 587
    smtp_username: str
    smtp_password: str
    smtp_from: str

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
