import os
from urllib.parse import quote_plus
from dotenv import load_dotenv
from tortoise import Tortoise

load_dotenv()

DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIRE_SSL = os.getenv("DB_SSL", "False").lower() in ("true", "1", "yes")


def build_sqlite_url() -> str:
    """Builds a absolute file path SQLite connection URL."""
    db_folder = os.path.join(ROOT_DIR, ".DB_DND")
    os.makedirs(db_folder, exist_ok=True)
    db_name = os.getenv("SQLITE_NAME", "bot.db")
    db_path = os.path.join(db_folder, db_name)
    return f"sqlite://{db_path}"


def build_database_url() -> str:
    """Builds connection string for PostgreSQL, MySQL, or direct DATABASE_URL override."""
    direct_url = os.getenv("DATABASE_URL")
    if direct_url:
        # Normalize postgres:// to postgresql:// if passed from older providers
        if direct_url.startswith("postgres://"):
            return direct_url.replace("postgres://", "postgres://", 1)
        return direct_url

    db_user, db_pass = os.getenv("DB_USER"), os.getenv("DB_PASS")
    db_host, db_port = os.getenv("DB_HOST"), os.getenv("DB_PORT")
    db_name = os.getenv("DB_NAME")

    if not all([db_user, db_pass, db_host, db_name]):
        raise RuntimeError(
            "Database configuration missing in environment variables.")

    password = quote_plus(str(db_pass))

    if DB_TYPE == "postgres":
        ssl_param = "?sslmode=require" if REQUIRE_SSL else ""
        return f"postgres://{db_user}:{password}@{db_host}:{db_port or '5432'}/{db_name}{ssl_param}"

    if DB_TYPE == "mysql":
        return f"mysql://{db_user}:{password}@{db_host}:{db_port or '3306'}/{db_name}"

    raise RuntimeError(f"Unsupported DB_TYPE: {DB_TYPE}")


DATABASE_URL = build_sqlite_url(
) if DB_TYPE == "sqlite" else build_database_url()

# Tortoise ORM Configuration
TORTOISE_ORM = {
    "connections": {
        "default": DATABASE_URL,
    },
    "apps": {
        "models": {
            "models": ["db.models"],
            "default_connection": "default",
        }
    },
}


async def init_tortoise() -> None:
    """Initializes Tortoise ORM and generates matching schema tables safely."""
    await Tortoise.init(config=TORTOISE_ORM)

    # Safe schema generation (will not overwrite existing tables)
    await Tortoise.generate_schemas(safe=True)
    print(
        f"[DB] Using {DB_TYPE.upper()} database | Connection & Schema ready.")


async def close_tortoise() -> None:
    """Safely terminates active connection pools across drivers."""
    await Tortoise.close_connections()
