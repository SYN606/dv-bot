from typing import List
from db.engine import SessionLocal
from db.models import RestrictedCommand


# ─────────────────────────────────────
# Helpers
# ─────────────────────────────────────
def _normalize(command_name: str) -> str:
    return command_name.strip().lower()


# ─────────────────────────────────────
# Core restriction logic (channel-based)
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


def unrestrict_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    """
    Remove command restriction from a channel.
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


def get_restricted_commands(
    guild_id: int,
    channel_id: int,
) -> List[str]:
    """
    List restricted commands for a channel.
    """
    with SessionLocal() as session:
        rows = (session.query(RestrictedCommand.command_name).filter_by(
            guild_id=guild_id,
            channel_id=channel_id,
        ).all())
        return [name for (name, ) in rows]


# ─────────────────────────────────────
# 🔁 COMPATIBILITY ALIASES (IMPORTANT)
# These keep older UI / views working
# ─────────────────────────────────────


def disable_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    """
    Alias for restrict_command (UI compatibility).
    """
    return restrict_command(guild_id, channel_id, command_name)


def enable_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    """
    Alias for unrestrict_command (UI compatibility).
    """
    return unrestrict_command(guild_id, channel_id, command_name)


def get_disabled_commands(
    guild_id: int,
    channel_id: int,
) -> List[str]:
    """
    Alias for get_restricted_commands (UI compatibility).
    """
    return get_restricted_commands(guild_id, channel_id)
