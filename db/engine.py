import os
from typing import Any
from urllib.parse import quote_plus
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

load_dotenv()

DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIRE_SSL = os.getenv("DB_SSL", "False").lower() in ("true", "1", "yes")


def build_sqlite_url() -> str:
    db_folder = os.path.join(ROOT_DIR, ".DB_DND")
    os.makedirs(db_folder, exist_ok=True)
    db_name = os.getenv("SQLITE_NAME", "bot.db")
    return f"sqlite+aiosqlite:///{os.path.join(db_folder, db_name)}"


def build_database_url() -> str:
    direct_url = os.getenv("DATABASE_URL")
    if direct_url:
        return direct_url

    db_user, db_pass = os.getenv("DB_USER"), os.getenv("DB_PASS")
    db_host, db_port = os.getenv("DB_HOST"), os.getenv("DB_PORT")
    db_name = os.getenv("DB_NAME")
    if not all([db_user, db_pass, db_host, db_name]):
        raise RuntimeError("Database configuration missing.")

    password = quote_plus(str(db_pass))
    if DB_TYPE == "postgres":
        return f"postgresql+asyncpg://{db_user}:{password}@{db_host}:{db_port or '5432'}/{db_name}"
    if DB_TYPE == "mysql":
        return f"mysql+aiomysql://{db_user}:{password}@{db_host}:{db_port or '3306'}/{db_name}"

    raise RuntimeError(f"Unsupported DB_TYPE: {DB_TYPE}")


DATABASE_URL = build_sqlite_url() if DB_TYPE == "sqlite" else build_database_url()

ENGINE_KWARGS: dict[str, Any] = {"echo": False, "future": True}

if DB_TYPE == "sqlite":
    ENGINE_KWARGS["connect_args"] = {"check_same_thread": False}
elif DB_TYPE in ("postgres", "mysql"):
    ENGINE_KWARGS.update(
        {
            "pool_size": 10,
            "max_overflow": 20,
            "pool_timeout": 30,
            "pool_recycle": 1800,
            "pool_pre_ping": True,
        }
    )
    if DB_TYPE == "postgres":
        ENGINE_KWARGS["connect_args"] = {"ssl": REQUIRE_SSL}

engine = create_async_engine(DATABASE_URL, **ENGINE_KWARGS)

# Cleaned Up Dialect Parsing: Fallback safely if engine isn't fully bound yet
DB_DIALECT = "postgresql" if DB_TYPE == "postgres" else "sqlite"

# Explicit Type Declaration: This completely silences Pylance "Module is not callable" errors
AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine, expire_on_commit=False, class_=AsyncSession
)

print(f"[DB] Using {DB_TYPE.upper()} database | Dialect: {DB_DIALECT}")


async def close_database():
    try:
        await engine.dispose()
    except Exception:
        pass
