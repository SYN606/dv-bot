# db/schema.py
from sqlalchemy import inspect, text
from db.base import Base
from db.engine import engine


def init_schema() -> None:
    inspector = inspect(engine)

    existing_tables = set(inspector.get_table_names())
    model_tables = set(Base.metadata.tables.keys())

    unused_tables = existing_tables - model_tables
    if unused_tables:
        print(f"[INFO] Dropping unused tables: {', '.join(unused_tables)}")

        with engine.begin() as conn:
            for table in unused_tables:
                conn.execute(text(f'DROP TABLE IF EXISTS "{table}"'))

    Base.metadata.create_all(engine)
