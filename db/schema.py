from sqlalchemy import inspect, text
from db.base import Base
from db.engine import engine

import os

# Enable table cleanup only in development
ALLOW_TABLE_DROP = os.getenv("ALLOW_TABLE_DROP", "false").lower() == "true"


async def init_schema() -> None:
    """
    Initialize database schema safely.

    - Creates missing tables
    - Optionally removes unused tables (dev only)
    """

    async with engine.begin() as conn:

        # Get existing tables
        def get_tables(sync_conn):
            inspector = inspect(sync_conn)
            return set(inspector.get_table_names())

        existing_tables = await conn.run_sync(get_tables)
        model_tables = set(Base.metadata.tables.keys())

        print(f"[DB] Existing tables: {existing_tables}")
        print(f"[DB] Model tables: {model_tables}")

        # Drop unused tables
        if ALLOW_TABLE_DROP:
            unused_tables = existing_tables - model_tables
            if unused_tables:
                print(f"[DB] Dropping unused tables: {', '.join(unused_tables)}")
                for table in unused_tables:
                    await conn.execute(text(f'DROP TABLE IF EXISTS "{table}"'))

        # Create missing tables
        await conn.run_sync(Base.metadata.create_all)

        print("[DB] Schema initialization complete")
