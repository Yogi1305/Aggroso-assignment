import sys
import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

import os
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import Base, engine
from app.api.claims import router as claims_router
from app.api.policies import router as policies_router
from app.api.auth import router as auth_router

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Configure Loguru Logger
logger.remove()  # Remove default handler
logger.add(
    sys.stdout,
    colorize=True,
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)
logger.add(
    "logs/app.log",
    rotation="10 MB",
    retention="10 days",
    enqueue=True,
    backtrace=True,
    diagnose=True,
    level="DEBUG"
)

logger.info("Initializing Expense Claim Review Assistant API with Loguru...")


# Initialize database tables gracefully
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created successfully.")
except Exception as e:
    logger.warning(f"Could not connect to database on startup: {e}. App will start, but endpoints requiring DB may fail if DB is unreachable.")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Backend API for reviewing employee expense claims against organizational expense policies using deterministic validation & AI reasoning."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)")
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred while processing the request."}
    )

app.include_router(claims_router, prefix="/api")
app.include_router(policies_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {
        "message": "Expense Claim Policy Review Assistant API",
        "docs": "/docs",
        "health": "OK"
    }
