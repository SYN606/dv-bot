from typing import List

from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert

from db.engine import AsyncSessionLocal
from db.models import RestrictedCommand


def _normalize(command_name: str, ) -> str:

    return command_name.strip().lower()


async def restrict_command(
    guild_id: int,
    channel_id: int,
    command_name: str,
    scope: str = "both",
) -> bool:

    command_name = _normalize(command_name)

    async with AsyncSessionLocal() as session:

        stmt = insert(RestrictedCommand).values(
            guild_id=guild_id,
            channel_id=channel_id,
            command_name=command_name,
            restriction_scope=scope,
        )

        stmt = stmt.on_conflict_do_nothing(index_elements=[
            RestrictedCommand.guild_id,
            RestrictedCommand.channel_id,
            RestrictedCommand.command_name,
        ])

        result = await session.execute(stmt)

        await session.commit()

        return result.rowcount > 0 # type: ignore


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

        return result.rowcount > 0 # type: ignore


async def is_command_restricted(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> bool:

    command_name = _normalize(command_name)

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(RestrictedCommand.guild_id).where(
                RestrictedCommand.guild_id == guild_id,
                RestrictedCommand.channel_id == channel_id,
                RestrictedCommand.command_name == command_name,
            )) is not None


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


# compatibility aliases


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


async def get_disabled_commands(
    guild_id: int,
    channel_id: int,
) -> List[str]:

    return await get_restricted_commands(
        guild_id,
        channel_id,
    )
