from datetime import datetime
from typing import List
from typing import Optional

from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.dialects.sqlite import insert

from db.engine import AsyncSessionLocal
from db.models import TempbanConfig
from db.models import TempbanRecord


# CONFIG
async def set_tempban_role(
    guild_id: int,
    role_id: int,
) -> None:

    async with AsyncSessionLocal() as session:

        stmt = insert(TempbanConfig).values(
            guild_id=guild_id,
            role_id=role_id,
        )

        stmt = stmt.on_conflict_do_update(
            index_elements=[
                TempbanConfig.guild_id,
            ],
            set_={
                "role_id": role_id,
            },
        )

        await session.execute(stmt)

        await session.commit()


async def get_tempban_role(guild_id: int, ) -> Optional[int]:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(TempbanConfig.role_id).where(
                TempbanConfig.guild_id == guild_id))


# TEMPBAN ACTIONS


async def add_tempban(
    *,
    guild_id: int,
    user_id: int,
    moderator_id: int,
    reason: Optional[str] = None,
    expires_at: Optional[datetime] = None,
) -> None:

    async with AsyncSessionLocal() as session:

        stmt = insert(TempbanRecord).values(
            guild_id=guild_id,
            user_id=user_id,
            moderator_id=moderator_id,
            tempban_reason=reason,
            expires_at=expires_at,
            active=True,
        )

        stmt = stmt.on_conflict_do_update(
            index_elements=[
                TempbanRecord.guild_id,
                TempbanRecord.user_id,
            ],
            set_={
                "moderator_id": moderator_id,
                "tempban_reason": reason,
                "expires_at": expires_at,
                "active": True,
                "updated_at": datetime.utcnow(),
            },
        )

        await session.execute(stmt)

        await session.commit()


async def remove_tempban(
    *,
    guild_id: int,
    user_id: int,
    moderator_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(TempbanRecord).where(
                TempbanRecord.guild_id == guild_id,
                TempbanRecord.user_id == user_id,
                TempbanRecord.active.is_(True),
            ).values(
                active=False,
                moderator_id=moderator_id,
                updated_at=datetime.utcnow(),
            ))

        await session.commit()

        return result.rowcount > 0 # type: ignore


# STATUS CHECKS


async def is_tempbanned(
    guild_id: int,
    user_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(TempbanRecord.guild_id).where(
                TempbanRecord.guild_id == guild_id,
                TempbanRecord.user_id == user_id,
                TempbanRecord.active.is_(True),
            )) is not None


# FETCH ACTIVE TEMPBANS


async def get_active_tempbans(guild_id: int, ) -> List[TempbanRecord]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(TempbanRecord).where(
                TempbanRecord.guild_id == guild_id,
                TempbanRecord.active.is_(True),
            ))

        return list(result)


# FETCH EXPIRED TEMPBANS


async def get_expired_tempbans() -> List[TempbanRecord]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(TempbanRecord).where(
                TempbanRecord.active.is_(True),
                TempbanRecord.expires_at.is_not(None),
                TempbanRecord.expires_at <= datetime.utcnow(),
            ))

        return list(result)
