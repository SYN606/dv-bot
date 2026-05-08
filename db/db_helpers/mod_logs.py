from typing import Optional

from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.dialects.sqlite import insert

from db.engine import AsyncSessionLocal
from db.models import ModerationLogConfig


# SET LOG CHANNEL
async def set_log_channel(
    guild_id: int,
    channel_id: int,
) -> None:

    async with AsyncSessionLocal() as session:

        stmt = insert(ModerationLogConfig).values(
            guild_id=guild_id,
            channel_id=channel_id,
            enabled=True,
        )

        stmt = stmt.on_conflict_do_update(
            index_elements=[
                ModerationLogConfig.guild_id,
            ],
            set_={
                "channel_id": channel_id,
                "enabled": True,
            },
        )

        await session.execute(stmt)

        await session.commit()


# GET LOG CHANNEL


async def get_log_channel(guild_id: int, ) -> Optional[int]:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(ModerationLogConfig.channel_id).where(
                ModerationLogConfig.guild_id == guild_id,
                ModerationLogConfig.enabled.is_(True),
            ))


# CHECK IF ENABLED


async def is_modlog_enabled(guild_id: int, ) -> bool:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(ModerationLogConfig.guild_id).where(
                ModerationLogConfig.guild_id == guild_id,
                ModerationLogConfig.enabled.is_(True),
            )) is not None


# ENABLE MODLOGS


async def enable_modlogs(guild_id: int, ) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(ModerationLogConfig).where(
                ModerationLogConfig.guild_id == guild_id, ).values(
                    enabled=True, ))

        await session.commit()

        return result.rowcount > 0 # type: ignore


# DISABLE MODLOGS


async def disable_modlogs(guild_id: int, ) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(ModerationLogConfig).where(
                ModerationLogConfig.guild_id == guild_id, ).values(
                    enabled=False, ))

        await session.commit()

        return result.rowcount > 0 # type: ignore


# REMOVE MODLOG CONFIG


async def remove_log_channel(guild_id: int, ) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            delete(ModerationLogConfig).where(
                ModerationLogConfig.guild_id == guild_id, ))

        await session.commit()

        return result.rowcount > 0 # type: ignore
