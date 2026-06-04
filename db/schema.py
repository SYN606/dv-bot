from sqlalchemy import inspect, text
from db.base import Base
from db.engine import engine
import os
# ENV CONFIG
ALLOW_TABLE_DROP = os.getenv("ALLOW_TABLE_DROP", "false").lower() == "true"


# SCHEMA INIT
async def init_schema() -> None:

    async with engine.begin() as conn:

        # FETCH EXISTING TABLES
        def get_existing_tables(sync_conn):
            inspector = inspect(sync_conn)
            return set(inspector.get_table_names())

        existing_tables = await conn.run_sync(get_existing_tables)
        # Tables defined in models
        model_tables = set(Base.metadata.tables.keys())

        print(f"[DB] Existing tables: {sorted(existing_tables)}")
        print(f"[DB] Model tables: {sorted(model_tables)}")
        # DEV MODE CLEANUP
        if ALLOW_TABLE_DROP:
            unused_tables = existing_tables - model_tables
            if unused_tables:
                print(
                    f"[DB] Dropping unused tables: {', '.join(sorted(unused_tables))}"
                )
                for table in unused_tables:
                    # safe identifier quoting
                    await conn.execute(text(f'DROP TABLE IF EXISTS "{table}"'))

        else:
            print("[DB] Table cleanup disabled")
        # CREATE MISSING TABLES
        await conn.run_sync(Base.metadata.create_all)
        print("[DB] Schema initialization complete")
