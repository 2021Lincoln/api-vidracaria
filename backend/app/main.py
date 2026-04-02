from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core_config import settings
from app.db import Base, engine, seed_default_admin
from app.routers import auth, clients, dashboard, employees, orders, quotes, site_config

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=settings.app_description,
)

cors_origins = [origin.strip() for origin in settings.cors_origins.split(",")] if settings.cors_origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    seed_default_admin()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(quotes.router)
app.include_router(orders.router)
app.include_router(dashboard.router)
app.include_router(employees.router)
app.include_router(site_config.router)
