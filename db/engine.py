import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from urllib.parse import quote_plus
from typing import cast

load_dotenv()

ENV = os.getenv("ENV", "test").lower()

if ENV == "prod":
    DB_USER = os.getenv("DB_USER")
    DB_PASS_RAW = os.getenv("DB_PASS")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_DATABASE")

    if not all([DB_USER, DB_PASS_RAW, DB_HOST, DB_NAME]):
        raise RuntimeError("[ERROR] Production DB env vars missing")

    DB_PASS = quote_plus(cast(str, DB_PASS_RAW))

    DATABASE_URL = (f"postgresql+psycopg2://{DB_USER}:{DB_PASS}"
                    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}")
else:
    DATABASE_URL = "sqlite:///db/bot.db"

engine = create_engine(
    DATABASE_URL,
    echo=(ENV != "prod"),
    future=True,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True,
)
