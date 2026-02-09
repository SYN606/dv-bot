from typing import List
from db.engine import SessionLocal
from db.models import RestrictedCommand


# ─────────────────────────────────────
# Helpers
# ─────────────────────────────────────
def _normalize(command_name: str) -> str:
    """
    Normalize command names for consistent storage.
    """
    return command_name.strip().lower()


# ─────────────────────────────────────
# Restrict command in channel
# ─────────────────────────────────────
def restrict_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    """
    Restrict a command in a specific channel.
    """
    command_name = _normalize(command_name)

    with SessionLocal() as session:
        exists = session.get(
            RestrictedCommand,
            (guild_id, channel_id, command_name),
        )
        if exists:
            return False

        session.add(
            RestrictedCommand(
                guild_id=guild_id,
                channel_id=channel_id,
                command_name=command_name,
            ))
        session.commit()
        return True


# ─────────────────────────────────────
# Unrestrict command in channel
# ─────────────────────────────────────
def unrestrict_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    """
    Remove a command restriction from a channel.
    """
    command_name = _normalize(command_name)

    with SessionLocal() as session:
        row = session.get(
            RestrictedCommand,
            (guild_id, channel_id, command_name),
        )
        if not row:
            return False

        session.delete(row)
        session.commit()
        return True


# ─────────────────────────────────────
# Core check (CANONICAL)
# ─────────────────────────────────────
def is_command_restricted(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    """
    Check if a command is restricted in a channel.
    """
    command_name = _normalize(command_name)

    with SessionLocal() as session:
        return session.get(
            RestrictedCommand,
            (guild_id, channel_id, command_name),
        ) is not None


# ─────────────────────────────────────
# Compatibility alias (DO NOT REMOVE)
# ─────────────────────────────────────
def is_command_disabled(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    """
    Alias for is_command_restricted.
    Exists for backward compatibility.
    """
    return is_command_restricted(
        guild_id,
        channel_id,
        command_name,
    )


# ─────────────────────────────────────
# List restricted commands for channel
# ─────────────────────────────────────
def get_restricted_commands(
    guild_id: int,
    channel_id: int,
) -> List[str]:
    """
    List all restricted commands in a channel.
    """
    with SessionLocal() as session:
        rows = (session.query(RestrictedCommand.command_name).filter_by(
            guild_id=guild_id,
            channel_id=channel_id,
        ).all())

        return [name for (name, ) in rows]
