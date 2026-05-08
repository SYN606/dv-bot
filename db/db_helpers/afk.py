import time
from typing import Optional
from sqlalchemy import delete, select
from sqlalchemy.dialects.sqlite import (
    insert as sqlite_insert, )
from sqlalchemy.dialects.postgresql import (
    insert as postgres_insert, )
from db.engine import (
    AsyncSessionLocal,
    DB_DIALECT,
)
from db.models import AFK


# Internal insert builder
def build_insert_stmt(
    model,
    values: dict,
):
    if DB_DIALECT == "postgresql":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


# Set AFK
async def set_afk(
    guild_id: int,
    user_id: int,
    reason: str,
) -> None:
    now = int(time.time())
    async with AsyncSessionLocal() as session:
        stmt = build_insert_stmt(
            AFK,
            {
                "guild_id": guild_id,
                "user_id": user_id,
                "afk_reason": reason,
                "since": now,
            },
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


# Remove AFK
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


# Get AFK
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
