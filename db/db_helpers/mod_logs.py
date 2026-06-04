from typing import Optional
from sqlalchemy import delete, select, update
from sqlalchemy.dialects.sqlite import (insert as sqlite_insert)
from sqlalchemy.dialects.postgresql import (insert as postgres_insert)
from db.engine import (AsyncSessionLocal, DB_DIALECT)
from db.models import ModerationLogConfig


# Internal insert builder
def build_insert_stmt(model, values: dict):
    if DB_DIALECT == "postgresql":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


# Set log channel
async def set_log_channel(guild_id: int, channel_id: int) -> None:
    async with AsyncSessionLocal() as session:
        stmt = build_insert_stmt(ModerationLogConfig, {
            "guild_id": guild_id,
            "channel_id": channel_id,
            "enabled": True
        })
        stmt = stmt.on_conflict_do_update(
            index_elements=[ModerationLogConfig.guild_id],
            set_={
                "channel_id": channel_id,
                "enabled": True
            })

        await session.execute(stmt)
        await session.commit()


# Get log channel
async def get_log_channel(guild_id: int) -> Optional[int]:
    async with AsyncSessionLocal() as session:
        return await session.scalar(
            select(ModerationLogConfig.channel_id).where(
                ModerationLogConfig.guild_id == guild_id,
                ModerationLogConfig.enabled.is_(True)))


# Check enabled
async def is_modlog_enabled(guild_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.scalar(
            select(ModerationLogConfig.guild_id).where(
                ModerationLogConfig.guild_id == guild_id,
                ModerationLogConfig.enabled.is_(True),
            ))
        return result is not None


# Enable modlogs
async def enable_modlogs(guild_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(ModerationLogConfig).where(
                ModerationLogConfig.guild_id == guild_id).values(enabled=True))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Disable modlogs
async def disable_modlogs(guild_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(ModerationLogConfig).where(
                ModerationLogConfig.guild_id == guild_id).values(enabled=False)
        )
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Remove modlog config
async def remove_log_channel(guild_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(ModerationLogConfig).where(
                ModerationLogConfig.guild_id == guild_id))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0
