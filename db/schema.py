import os
from tortoise import Tortoise
from db.db_config import DB_TYPE, TORTOISE_ORM

ALLOW_TABLE_DROP = os.getenv("ALLOW_TABLE_DROP",
                             "false").lower() in ("true", "1", "yes")


async def init_schema() -> None:
    """Initializes Tortoise connection with optional development-mode orphan table cleanup."""
    await Tortoise.init(config=TORTOISE_ORM)
    conn = Tortoise.get_connection("default")

    # DEV MODE CLEANUP: Drop orphaned/obsolete tables in dev environment
    if ALLOW_TABLE_DROP:
        # Collect registered models table names
        model_tables = {
            model._meta.db_table
            for model in Tortoise.apps.get("models", {}).values()
        }

        existing_tables: set[str] = set()

        if DB_TYPE == "postgres":
            query = "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
            res = await conn.execute_query_dict(query)
            existing_tables = {row["table_name"] for row in res}
        elif DB_TYPE == "sqlite":
            query = (
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
            )
            res = await conn.execute_query_dict(query)
            existing_tables = {row["name"] for row in res}

        unused_tables = existing_tables - model_tables
        if unused_tables:
            print(
                f"[DB] Dropping unused orphan tables: {', '.join(sorted(unused_tables))}"
            )
            for table in unused_tables:
                if DB_TYPE == "postgres":
                    await conn.execute_query(
                        f'DROP TABLE IF EXISTS "{table}" CASCADE;')
                else:
                    await conn.execute_query(f'DROP TABLE IF EXISTS "{table}";'
                                             )
    else:
        print("[DB] Orphaned table cleanup disabled.")

    # Generate schema structures for missing model tables safely
    await Tortoise.generate_schemas(safe=True)
    print(
        f"[DB] Using {DB_TYPE.upper()} database | Schema initialization complete"
    )
