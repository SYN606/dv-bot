import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

load_dotenv()

ENV = os.getenv("ENV", "dev").lower()


def get_database_url() -> tuple[str, str]:
    """Return (database_url, mode)"""

    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_DATABASE")

    # ─────────────────────────
    # PRODUCTION DB AVAILABLE
    # ─────────────────────────
    if all([DB_USER, DB_PASS, DB_HOST]):
        url = (
            f"postgresql+asyncpg://{DB_USER}:{quote_plus(DB_PASS)}" # type: ignore
            f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )
        return url, "postgres"

    # ─────────────────────────
    # FALLBACK 
    # ─────────────────────────
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DB_DIR = os.path.join(BASE_DIR, "db")
    os.makedirs(DB_DIR, exist_ok=True)

    DB_PATH = os.path.join(DB_DIR, "bot.db")

    return f"sqlite+aiosqlite:///{DB_PATH}", "sqlite"


DATABASE_URL, DB_MODE = get_database_url()


# ─────────────────────────
# ENGINE CREATION
# ─────────────────────────

if DB_MODE == "postgres":

    engine = create_async_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=False,
        future=True,
    )

    print("[DB] Using PostgreSQL")

else:

    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
    )

    if ENV == "prod":
        print("[DB WARNING] Running in PROD without DB → using SQLite fallback")

    else:
        print("[DB] Using SQLite (dev mode)")


# ─────────────────────────
# SESSION
# ─────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


# ─────────────────────────
# CLEAN SHUTDOWN
# ─────────────────────────
async def close_database():
    try:
        await engine.dispose()
    except Exception:
        pass