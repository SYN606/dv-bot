from typing import List
from sqlalchemy import delete, select
from sqlalchemy.dialects.sqlite import (
    insert as sqlite_insert, )
from sqlalchemy.dialects.postgresql import (
    insert as postgres_insert, )
from db.engine import (
    AsyncSessionLocal,
    DB_DIALECT,
)
from db.models import RestrictedCommand


# Internal insert builder
def build_insert_stmt(
    model,
    values: dict,
):
    if DB_DIALECT == "postgresql":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


# Normalize command name
def _normalize(command_name: str, ) -> str:
    return command_name.strip().lower()


# Restrict command
async def restrict_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
    scope: str = "both",
) -> bool:

    command_name = _normalize(command_name)
    async with AsyncSessionLocal() as session:
        stmt = build_insert_stmt(
            RestrictedCommand,
            {
                "guild_id": guild_id,
                "channel_id": channel_id,
                "command_name": command_name,
                "restriction_scope": scope,
            },
        )
        stmt = stmt.on_conflict_do_nothing(index_elements=[
            RestrictedCommand.guild_id,
            RestrictedCommand.channel_id,
            RestrictedCommand.command_name,
        ])

        result = await session.execute(stmt)
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Unrestrict command
async def unrestrict_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    command_name = _normalize(command_name)
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(RestrictedCommand).where(
                RestrictedCommand.guild_id == guild_id,
                RestrictedCommand.channel_id == channel_id,
                RestrictedCommand.command_name == command_name,
            ))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Check restriction
async def is_command_restricted(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    command_name = _normalize(command_name)
    async with AsyncSessionLocal() as session:
        result = await session.scalar(
            select(RestrictedCommand.guild_id).where(
                RestrictedCommand.guild_id == guild_id,
                RestrictedCommand.channel_id == channel_id,
                RestrictedCommand.command_name == command_name,
            ))
        return result is not None


# Fetch restricted commands
async def get_restricted_commands(
    guild_id: int,
    channel_id: int,
) -> List[str]:
    async with AsyncSessionLocal() as session:
        result = await session.scalars(
            select(RestrictedCommand.command_name).where(
                RestrictedCommand.guild_id == guild_id,
                RestrictedCommand.channel_id == channel_id,
            ))
        return list(result)


# Fetch restricted command data
async def get_restricted_command_data(
    guild_id: int,
    channel_id: int,
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(
                RestrictedCommand.command_name,
                RestrictedCommand.restriction_scope,
            ).where(
                RestrictedCommand.guild_id == guild_id,
                RestrictedCommand.channel_id == channel_id,
            ))
        return result.all()


# Compatibility alias
async def disable_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    return await restrict_command(
        guild_id,
        channel_id,
        command_name,
    )

# Compatibility alias
async def enable_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:
    return await unrestrict_command(
        guild_id,
        channel_id,
        command_name,
    )

# Compatibility alias
async def get_disabled_commands(
    guild_id: int,
    channel_id: int,
) -> List[str]:
    return await get_restricted_commands(
        guild_id,
        channel_id,
    )
