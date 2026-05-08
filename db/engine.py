import os
from dotenv import load_dotenv
from urllib.parse import quote_plus
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

load_dotenv()

ENV = os.getenv(
    "ENV",
    "dev",
).lower()


# SQLITE
def build_sqlite_url() -> str:

    base_dir = os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
    db_dir = os.path.join(
        base_dir,
        "db",
    )
    os.makedirs(
        db_dir,
        exist_ok=True,
    )
    db_path = os.path.join(
        db_dir,
        "bot.db",
    )
    return (
        f"sqlite+aiosqlite:///{db_path}"
    )


# POSTGRES
def build_postgres_url() -> str:

    db_url = os.getenv(
        "DATABASE_URL"
    )
    if db_url:
        return db_url
    
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASS")
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv(
        "DB_PORT",
        "5432",
    )
    db_name = os.getenv(
        "DB_DATABASE"
    )
    if not all([
        db_user,
        db_pass,
        db_host,
        db_name,
    ]):
        raise RuntimeError(
            "PostgreSQL configuration missing."
        )

    return (
        "postgresql+asyncpg://"
        f"{db_user}:"
        f"{quote_plus(db_pass)}@" # type: ignore
        f"{db_host}:"
        f"{db_port}/"
        f"{db_name}"
    )


# RESOLVE DATABASE
if ENV == "dev":
    DATABASE_URL = build_sqlite_url()
    DB_MODE = "sqlite"

else:
    DATABASE_URL = build_postgres_url()
    DB_MODE = "postgres"


# ENGINE
if DB_MODE == "postgres":

    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        connect_args={
            "ssl": "require"
        },
    )

    print(
        "[DB] PostgreSQL "
        "(Neon SSL enabled)"
    )

else:
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
        connect_args={
            "check_same_thread": False
        },
    )
    print(
        "[DB] SQLite (dev mode)"
    )


# DIALECT
DB_DIALECT = engine.dialect.name


# SESSION
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


# CLEANUP
async def close_database():

    try:
        await engine.dispose()

    except Exception:
        pass