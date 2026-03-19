from typing import List
from sqlalchemy import select
from db.engine import AsyncSessionLocal
from db.models import RestrictedCommand


# region: Helpers
def _normalize(command_name: str) -> str:
    return command_name.strip().lower()


# region:  Core restriction logic
async def restrict_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    """
    Restrict a command in a specific channel.
    """
    command_name = _normalize(command_name)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(RestrictedCommand).where(
                RestrictedCommand.guild_id == guild_id,
                RestrictedCommand.channel_id == channel_id,
                RestrictedCommand.command_name == command_name,
            ))

        exists = result.scalar_one_or_none()
        if exists:
            return False

        session.add(
            RestrictedCommand(
                guild_id=guild_id,
                channel_id=channel_id,
                command_name=command_name,
            ))

        await session.commit()
        return True


async def unrestrict_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    """
    Remove command restriction from a channel.
    """
    command_name = _normalize(command_name)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(RestrictedCommand).where(
                RestrictedCommand.guild_id == guild_id,
                RestrictedCommand.channel_id == channel_id,
                RestrictedCommand.command_name == command_name,
            ))

        row = result.scalar_one_or_none()
        if not row:
            return False

        await session.delete(row)
        await session.commit()
        return True


async def is_command_restricted(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    """
    Check if a command is restricted in a channel.
    """
    command_name = _normalize(command_name)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(RestrictedCommand).where(
                RestrictedCommand.guild_id == guild_id,
                RestrictedCommand.channel_id == channel_id,
                RestrictedCommand.command_name == command_name,
            ))

        return result.scalar_one_or_none() is not None


async def get_restricted_commands(
    guild_id: int,
    channel_id: int,
) -> List[str]:
    """
    List restricted commands for a channel.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(RestrictedCommand.command_name).where(
                RestrictedCommand.guild_id == guild_id,
                RestrictedCommand.channel_id == channel_id,
            ))

        return [row[0] for row in result.all()]


# region: COMPATIBILITY ALIASES


async def disable_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    return await restrict_command(guild_id, channel_id, command_name)


async def enable_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    return await unrestrict_command(guild_id, channel_id, command_name)


async def get_disabled_commands(
    guild_id: int,
    channel_id: int,
) -> List[str]:
    return await get_restricted_commands(guild_id, channel_id)
