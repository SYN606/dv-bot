import time
from typing import Optional

from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert

from db.engine import AsyncSessionLocal
from db.models import AFK


async def set_afk(
    guild_id: int,
    user_id: int,
    reason: str,
) -> None:

    now = int(time.time())

    async with AsyncSessionLocal() as session:

        stmt = insert(AFK).values(
            guild_id=guild_id,
            user_id=user_id,
            afk_reason=reason,
            since=now,
        )

        stmt = stmt.on_conflict_do_update(
            index_elements=[
                AFK.guild_id,
                AFK.user_id,
            ],
            set_={
                "afk_reason": reason,
                "since": now,
            },
        )

        await session.execute(stmt)

        await session.commit()


async def remove_afk(
    guild_id: int,
    user_id: int,
) -> Optional[AFK]:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            select(AFK).where(
                AFK.guild_id == guild_id,
                AFK.user_id == user_id,
            ))

        afk = result.scalar_one_or_none()

        if not afk:
            return None

        await session.execute(
            delete(AFK).where(
                AFK.guild_id == guild_id,
                AFK.user_id == user_id,
            ))

        await session.commit()

        return afk


async def get_afk(
    guild_id: int,
    user_id: int,
) -> Optional[AFK]:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(AFK).where(
                AFK.guild_id == guild_id,
                AFK.user_id == user_id,
            ))
