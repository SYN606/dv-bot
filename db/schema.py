from sqlalchemy import inspect, text
from db.base import Base
from db.engine import engine


async def init_schema() -> None:
    async with engine.begin() as conn:

        # Get existing tables
        def get_tables(sync_conn):
            inspector = inspect(sync_conn)
            return set(inspector.get_table_names())

        existing_tables = await conn.run_sync(get_tables)
        model_tables = set(Base.metadata.tables.keys())

        unused_tables = existing_tables - model_tables

        if unused_tables:
            print(f"[INFO] Dropping unused tables: {', '.join(unused_tables)}")

            for table in unused_tables:
                await conn.execute(text(f'DROP TABLE IF EXISTS "{table}"'))

        # Create missing tables
        await conn.run_sync(Base.metadata.create_all)
