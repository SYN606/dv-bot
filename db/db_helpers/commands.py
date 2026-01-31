from typing import List
from db.engine import SessionLocal
from db.models import DisabledCommand


def _normalize(command_name: str) -> str:
    """
    Normalize command names to ensure consistency.
    """
    return command_name.strip().lower()


def disable_command(guild_id: int, command_name: str) -> bool:
    command_name = _normalize(command_name)

    with SessionLocal() as session:
        exists = session.get(
            DisabledCommand,
            (guild_id, command_name),
        )
        if exists:
            return False

        session.add(
            DisabledCommand(
                guild_id=guild_id,
                command_name=command_name,
            ))
        session.commit()
        return True


def enable_command(guild_id: int, command_name: str) -> bool:
    command_name = _normalize(command_name)

    with SessionLocal() as session:
        cmd = session.get(
            DisabledCommand,
            (guild_id, command_name),
        )
        if not cmd:
            return False

        session.delete(cmd)
        session.commit()
        return True


def is_command_disabled(guild_id: int, command_name: str) -> bool:
    command_name = _normalize(command_name)

    with SessionLocal() as session:
        return (session.get(
            DisabledCommand,
            (guild_id, command_name),
        ) is not None)


def get_disabled_commands(guild_id: int) -> List[str]:
    with SessionLocal() as session:
        rows = (session.query(
            DisabledCommand.command_name).filter_by(guild_id=guild_id).all())
        return [name for (name, ) in rows]
