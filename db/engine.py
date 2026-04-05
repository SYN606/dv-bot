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


# =====================================================
# SQLITE (DEV)
# =====================================================
def build_sqlite_url() -> str:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DB_DIR = os.path.join(BASE_DIR, "db")
    os.makedirs(DB_DIR, exist_ok=True)

    DB_PATH = os.path.join(DB_DIR, "bot.db")
    return f"sqlite+aiosqlite:///{DB_PATH}"


# =====================================================
# POSTGRES (NEON)
# =====================================================
def build_postgres_url() -> str:
    db_url = os.getenv("DATABASE_URL")

    if db_url:
        return db_url

    # fallback manual config
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_DATABASE")

    if not all([DB_USER, DB_PASS, DB_HOST, DB_NAME]):
        raise RuntimeError("PostgreSQL config missing for production")

    return (f"postgresql+asyncpg://{DB_USER}:{quote_plus(DB_PASS)}" # type: ignore
            f"@{DB_HOST}:{DB_PORT}/{DB_NAME}")


# =====================================================
# RESOLVE DB
# =====================================================
if ENV == "dev":
    DATABASE_URL = build_sqlite_url()
    DB_MODE = "sqlite"
else:
    DATABASE_URL = build_postgres_url()
    DB_MODE = "postgres"

# =====================================================
# ENGINE
# =====================================================
if DB_MODE == "postgres":

    engine = create_async_engine(
        DATABASE_URL,
        connect_args={"ssl": True},  # 🔥 REQUIRED FOR NEON
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=False,
        future=True,
    )

    print("[DB] PostgreSQL (Neon SSL enabled)")

else:

    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
    )

    print("[DB] SQLite (dev mode)")

# =====================================================
# SESSION
# =====================================================
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


# =====================================================
# CLEANUP
# =====================================================
async def close_database():
    try:
        await engine.dispose()
    except Exception:
        pass
