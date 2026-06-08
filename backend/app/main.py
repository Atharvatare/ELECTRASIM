import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import engine, Base
from .routes import auth, circuits, machines, power_electronics, ai, reports, power_systems

# Automatically create tables in database (SQLite or PostgreSQL) at startup
Base.metadata.create_all(bind=engine)

# Ensure static directories exist
os.makedirs("static/reports", exist_ok=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# CORS Configuration
# Next.js frontend runs on localhost:3000 by default, so we allow it explicitly
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (e.g. PDF reports)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(circuits.router, prefix=settings.API_V1_STR)
app.include_router(machines.router, prefix=settings.API_V1_STR)
app.include_router(power_electronics.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(power_systems.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to ElectraSim AI Simulation API",
        "docs": f"{settings.API_V1_STR}/docs",
        "status": "online"
    }
