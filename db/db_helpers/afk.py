import time
from typing import Optional

from sqlalchemy import select
from db.engine import AsyncSessionLocal
from db.models import AFK


async def set_afk(guild_id: int, user_id: int, reason: str) -> None:
    now = int(time.time())

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AFK).where(
                AFK.guild_id == guild_id,
                AFK.user_id == user_id,
            ))

        afk = result.scalar_one_or_none()

        if afk:
            afk.reason = reason
            afk.since = now
        else:
            session.add(
                AFK(
                    guild_id=guild_id,
                    user_id=user_id,
                    reason=reason,
                    since=now,
                ))

        await session.commit()


async def remove_afk(guild_id: int, user_id: int) -> Optional[AFK]:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AFK).where(
                AFK.guild_id == guild_id,
                AFK.user_id == user_id,
            ))

        afk = result.scalar_one_or_none()

        if not afk:
            return None

        await session.delete(afk)
        await session.commit()
        return afk


async def get_afk(guild_id: int, user_id: int) -> Optional[AFK]:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AFK).where(
                AFK.guild_id == guild_id,
                AFK.user_id == user_id,
            ))

        return result.scalar_one_or_none()
