from typing import Optional

from sqlalchemy import select
from db.engine import AsyncSessionLocal
from db.models import ModerationLogConfig


# region SET LOG CHANNEL
async def set_log_channel(guild_id: int, channel_id: int) -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ModerationLogConfig).where(
                ModerationLogConfig.guild_id == guild_id))
        row = result.scalar_one_or_none()

        if row:
            row.channel_id = channel_id
        else:
            session.add(
                ModerationLogConfig(
                    guild_id=guild_id,
                    channel_id=channel_id,
                ))

        await session.commit()


# region GET LOG 
async def get_log_channel(guild_id: int) -> Optional[int]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ModerationLogConfig.channel_id).where(
                ModerationLogConfig.guild_id == guild_id))
        return result.scalar_one_or_none()
