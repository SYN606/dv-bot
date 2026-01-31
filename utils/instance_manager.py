# utils/instance_manager.py
import os

INSTANCE_ROLE = os.getenv("INSTANCE_ROLE", "primary").lower()


def is_primary_instance() -> bool:
    return INSTANCE_ROLE == "primary"


def is_secondary_instance() -> bool:
    return INSTANCE_ROLE == "secondary"


def get_instance_role() -> str:
    return INSTANCE_ROLE
