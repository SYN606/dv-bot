import os
from db.engine import engine
from db.base import Base
import db.models

ENV = os.getenv("ENV", "test").lower()


def init_schema() -> None:
    """
    Initialize database schema.

    - In DEV/TEST: auto-create tables every startup
    - In PROD: create tables only if they do not exist
      (migrations should be used later)
    """

    if ENV == "prod":
        # Safe for multi-instance production
        Base.metadata.create_all(bind=engine, checkfirst=True)
    else:
        # Fast iteration for dev/testing
        Base.metadata.create_all(bind=engine)
