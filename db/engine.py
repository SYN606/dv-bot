import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# ENV LOAD
load_dotenv()

ENV = os.getenv("ENV", "dev").lower()

# region PRODUCTION 
if ENV == "prod":

    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_DATABASE")

    if not all([DB_USER, DB_PASS, DB_HOST, DB_NAME]):
        raise RuntimeError("Missing production DB environment variables")

    DATABASE_URL = (f"postgresql+asyncpg://{DB_USER}:{quote_plus(DB_PASS)}"
                    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}")

    engine = create_async_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=False,
        future=True,
    )

# region DEVELOPMENT
else:

    # Absolute project root path
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Ensure /db directory exists
    DB_DIR = os.path.join(BASE_DIR, "db")
    os.makedirs(DB_DIR, exist_ok=True)

    DB_PATH = os.path.join(DB_DIR, "bot.db")

    DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
    )

# region SESSION FACTORY
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)
