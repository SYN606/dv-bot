import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

ENV = os.getenv("ENV", "test").lower()

# ───────────────────────────────
# DATABASE URL RESOLUTION
# ───────────────────────────────

if ENV == "prod":
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_DATABASE")

    if not all([DB_USER, DB_PASS, DB_HOST, DB_NAME]):
        raise RuntimeError("Production DB env vars missing")

    DATABASE_URL = (f"postgresql+psycopg2://{DB_USER}:{DB_PASS}"
                    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}")

else:
    # test / dev → SQLite
    DATABASE_URL = "sqlite:///db/bot.db"

# ───────────────────────────────
# ENGINE
# ───────────────────────────────

engine = create_engine(
    DATABASE_URL,
    echo=(ENV != "prod"),  # SQL logs only in test/dev
    future=True,
    pool_pre_ping=True,  # critical for Postgres
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True,
)
