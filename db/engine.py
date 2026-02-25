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

if ENV == "prod":
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_DATABASE")

    if not all([DB_USER, DB_PASS, DB_HOST, DB_NAME]):
        raise RuntimeError("Missing production DB env vars")

    DATABASE_URL = (f"postgresql+asyncpg://{DB_USER}:{quote_plus(DB_PASS)}"
                    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}")

    engine = create_async_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=False,
    )

else:
    DATABASE_URL = "sqlite+aiosqlite:///db/bot.db"

    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)
