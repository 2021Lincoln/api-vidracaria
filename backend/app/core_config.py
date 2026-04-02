from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AFQA Vidracaria API"
    app_version: str = "2.1.0"
    app_description: str = "Backend profissional para gestao de vidracaria"

    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8

    database_url: str = "sqlite:///./afqa.db"
    auto_create_tables: bool = False

    default_admin_name: str = "Administrador AFQA"
    default_admin_email: str = "admin@afqa.com"
    default_admin_password: str = "Admin@123"
    default_tenant_id: str = "afqa"

    payment_provider: str = "mock"
    payment_public_base_url: str = "https://pay.afqa.local"
    whatsapp_provider: str = "mock"
    whatsapp_api_token: str = ""

    cors_origins: str = "*"


settings = Settings()
